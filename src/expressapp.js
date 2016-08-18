'use strict';

import express from 'express';
import createError from 'http-errors';
import OAuth2Server from 'oauth2-server';
import bodyParser from 'body-parser';
import basicAuth from 'basic-auth';
import redis from 'redis';
import moment from 'moment';
import _ from 'lodash';
import {log} from './utils';
import Model from './oauth/twolevel.model.js';
// import throttle from './throttle/throttle.middleware.js';
import {userEncode, userDecode} from './utils';

function createBasicApp(config) {
  var app = express();
  app.set('config', config);

  var storePasswordsInRedisOptions = (app.get('config').whoCaresAboutSecurityAnyway || {}).storePasswordsInRedis;
  if (storePasswordsInRedisOptions) {
    app.set('storePasswordsInRedisClient', redis.createClient(storePasswordsInRedisOptions));
  }

  app.disable('x-powered-by');
  app.set('json spaces', 2);
  app.enable('trust proxy');

  app.use((req, res, next) => {
    var timeStart = moment();
    res.logData = {};

    res.on('finish', () => {
      var timeEnd = moment();
      log.info(null, Object.assign(res.logData || {},
        {
          type: 'accessLog',
          request: {
            method: req.method,
            path: req.path,
            query: req.query,
            hostname: req.hostname,
            remoteAddress: req.ip
          },
          response: {status: res.statusCode},
          time: {start: timeStart, end: timeEnd, taken: timeEnd.diff(timeStart)}
        }));
    });

    next();
  });

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  app.get('/', function (req, res) {
    res.send('Smaug authentication system. Documentation: <a href="https://github.com/DBCDK/smaug#readme">https://github.com/DBCDK/smaug#readme</a>');
  });

  app.get('/health', (req, res) => {
    var result = {ok: {}};
    var stores = app.get('stores');

    var storePromises = Object.keys(stores).map((storeId) => {
      var tStart = moment();
      return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
        stores[storeId].ping()
          .then(() => {
            resolve({responseTime: moment().diff(tStart), result: 'ok'});
          })
          .catch((err) => {
            resolve({responseTime: moment().diff(tStart), result: err});
          });
      });
    });

    Promise.all(storePromises).then((results) => {
      _.zip(Object.keys(stores), results).forEach((zipElem) => {
        let [storeId, status] = zipElem;
        if (status.result instanceof Error) {
          if (typeof result.errors === 'undefined') {
            result.errors = {};
          }
          result.errors[storeId] = {
            name: status.result.name,
            msg: status.result.message,
            stacktrace: status.result.stack,
            responseTime: status.responseTime
          };
        }
        else {
          result.ok[storeId] = {responseTime: status.responseTime};
        }
      });
      if (Object.keys(result.errors || {}).length > 0) {
        res.status(500);
      }
      res.logData.health = result;
      res.json(result);
    });
  });

  return app;
}

export function createConfigurationApp(config) {
  var app = createBasicApp(config);

  app.get('/configuration', (req, res, next) => {
    var bearerToken = req.query.token;

    res.logData.token = bearerToken;

    app.get('stores').tokenStore.getAccessToken(bearerToken)
      .then((tokenInfo) => {
        var user = Object.assign(userDecode(tokenInfo.userId));
        user.agency = user.libraryId;
        var client = {id: tokenInfo.clientId};
        return app.get('stores').configStore.get(user, client)
          .then((userConfig) => {
            // merge user with existing config, to get hardcoded things like 'salt'
            user = Object.assign(userConfig.user || {}, user);
            userConfig.app = Object.assign(userConfig.app || {}, {clientId: tokenInfo.clientId});

            var storePasswordsInRedisClient = app.get('storePasswordsInRedisClient');
            if (typeof storePasswordsInRedisClient !== 'undefined') {
              storePasswordsInRedisClient.get(tokenInfo.userId, (redisErr, redisRes) => { // eslint-disable-line no-unused-vars
                if (redisErr) {
                  return next(createError(500, 'I\'m still a teapot', {wrappedError: redisErr}));
                }

                var insecureUser = Object.assign({}, user, {pin: redisRes});
                res.json(Object.assign({}, userConfig, {user: insecureUser}));
              });
            }
            else {
              // success
              res.json(Object.assign({}, userConfig, {user: user}));
            }
          })
          .catch((err) => {
            log.error('Error creating configuration', {error: {message: err.message, stacktrace: err.stack}});
            return next(createError(500, 'Error creating configuration', {wrappedError: err}));
          });
      })
      .catch((err) => {
        log.error('Error creating configuration', {error: {message: err.message, stacktrace: err.stack}});
        return next(createError(404, 'Token not found', {wrappedError: err}));
      });
  });

  // error handler
  app.use((err, req, res, next) => {
    log.error(err.message, {error: {message: err.message, stacktrace: err.stack}});
    next();
  });

  return app;
}

function handleRevokeToken(req, res, next) {
  const token = req.params.token;
  res.logData.token = token;

  req.app.get('stores').tokenStore.revokeToken(token)
    .then(response => res.json(response))
    .catch(error => next(new Error(error)));
}

function handleRevokeTokensForUser(req, res, next) {
  const tokenStore = req.app.get('stores').tokenStore;
  const token = req.query.token;
  res.logData.token = token;

  tokenStore.getAccessToken(token).then(tokenInfo => {
    return tokenStore.clearAccessTokensForUser(tokenInfo.userId);
  }).then(response => res.json(response))
    .catch(error => next(new Error(error)));
}

export function createOAuthApp(config = {}) {
  var app = createBasicApp(config);

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  });

  app.oauth = OAuth2Server({
    model: new Model(app),
    grants: ['password'],
    debug: true,
    accessTokenLifetime: config.tokenExpiration || 60 * 60 * 24 * 30 // default to 30 days
  });

  // app.use(throttle());

  // Add implicit libraryId to anonymous user without libraryId, and change the password from accordingly.
  // The password must be equal to the username for an anonymous request, and userEncode(libraryId, null) returns the proper anonymous username/password for this
  app.use('/oauth/token', (req, res, next) => {
    if (req.body.username === userEncode(null, null)) {
      if (typeof config.defaultLibraryId === 'undefined') {
        log.error('No default library id. Set config.defaultLibraryId');
      }
      else {
        req.body.username += config.defaultLibraryId;
        if (req.body.password === userEncode(null, null)) {
          req.body.password += config.defaultLibraryId;
        }
      }
    }
    next();
  });
  app.post('/oauth/token', app.oauth.grant());
  app.delete('/oauth/token/:token', handleRevokeToken);
  app.delete('/oauth/tokens', handleRevokeTokensForUser);
  app.use(app.oauth.errorHandler());

  return app;
}

export function createApp(config = {}) {
  var app = express();
  app.disable('x-powered-by');

  app.use(createConfigurationApp(config));
  app.use(createOAuthApp(config));

  return app;
}

export function filterClient(client) {
  var filteredClient = Object.assign({}, client);
  delete filteredClient.secret;
  return filteredClient; // eslint-disable-line no-undefined
}

export function filterClients(clients) {
  return clients.map(filterClient);
}

export function clientWithId(client, id) {
  return Object.assign({}, client, {id: id});
}


export function createAdminApp(config = {}) {
  var app = createBasicApp(config);
  app.set('config', config);
  app.use((req, res, next) => {
    var credentials = basicAuth(req) || {};
    if (_.every([typeof credentials.name === 'string', typeof credentials.pass === 'string'])) {
      var users = (app.get('config').admin || {}).users || {};
      if (users[credentials.name] === credentials.pass) {
        res.logData.user = credentials.name;
        return next();
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic')
    return res.sendStatus(401);
  });

  var clientEndpoint = express.Router();
  var configEndpoint = express.Router();

  clientEndpoint.use((req, res, next) => {
    next();
  });

  clientEndpoint.route('/add')
    .get((req, res) => {
      res.send(
        `
<!DOCTYPE html>
<html>
<head>
<title>Add client to SMAUG</title>

<script>
  function addRow() {
    var nodes = document.getElementsByClassName('contact-row');
    var newNodeIndex = nodes.length;
    var newNode = nodes[0].cloneNode(true);
    // Replace all indexes!
    newNode.innerHTML = newNode.innerHTML.replace('[0]', '[' + newNodeIndex + ']');
    newNode.innerHTML = newNode.innerHTML.replace('[0]', '[' + newNodeIndex + ']');
    newNode.innerHTML = newNode.innerHTML.replace('[0]', '[' + newNodeIndex + ']');
    newNode.innerHTML = newNode.innerHTML.replace('[0]', '[' + newNodeIndex + ']');
    document.getElementById('contacts').appendChild(newNode);
  }
</script>
</head>
<body>

<form method="post">
  <label>App name <input name="appname" required="true" /></label>
  <label>Config json <input value="{}" name="config" required="true" /></label>
  <p>Contacts:</p>
  <div id="contacts">
    <div class="contact-row">
      <label>Role <input name="contact[0].role" /></label>
      <label>Name <input name="contact[0].name" /></label>
      <label>Email <input name="contact[0].email" /></label>
      <label>Phone <input name="contact[0].phone" /></label>
    </div>
  </div>
  <div><a href="#" onclick="addRow()">Add row</a></div>
  <div><input type="submit" /></div>
</form>

</body>
</html>
`
      );
    })
    .post((req, res) => {
      const b = req.body;
      const contact = {};

      b.contact.forEach(bContact => {
        contact[bContact[0]] = {
          name: bContact[1],
          email: bContact[2],
          phone: bContact[3]
        };
      });

      const client = {
        name: b.appname,
        config: JSON.parse(b.config),
        contact: contact
      };

      app.get('stores').clientStore.create(client)
        .then((persistedClient) => {
          res.json(persistedClient);
        })
        .catch((err) => {
          res.json({err: err});
        });
    });

  clientEndpoint.route('/')
    .get((req, res) => {
      // list clients
      app.get('stores').clientStore.getAll()
        .then(filterClients)
        .then((clients) => {
          res.json(clients);
        })
        .catch((err) => {
          res.json({err: err});
        });
    })
    .post((req, res) => {
      // create client
      var client = {
        name: req.body.name,
        config: req.body.config,
        contact: req.body.contact
      };

      app.get('stores').clientStore.create(client)
        .then((persistedClient) => {
          res.json(persistedClient);
        })
        .catch((err) => {
          res.json({err: err});
        });
    });

  clientEndpoint.route('/:clientId')
    .get((req, res) => {
      // get client
      app.get('stores').clientStore.get(req.params.clientId)
        .then(filterClient)
        .then((client) => {
          res.json(client);
        })
        .catch((err) => {
          res.json({err: err});
        });
    })
    .put((req, res) => {
      // update client
      var clientId = req.params.clientId;
      var client = {};

      ['name', 'config', 'contact'].forEach(field => {
        if (req.body[field]) {
          client[field] = req.body[field];
        }
      });

      app.get('stores').clientStore.update(clientId, client)
        .then(filterClient)
        .then((persistedClient) => {
          res.json(persistedClient);
        })
        .catch((err) => {
          res.json({err: err});
        });
    })
    .delete((req, res) => {
      // delete client
      app.get('stores').clientStore.delete(req.params.clientId)
        .then(() => {
          res.json({});
        })
        .catch((err) => {
          res.json({err: err});
        });

    });

  configEndpoint.route('/')
    .get((req, res) => {
      res.json(app.get('config'));
    });

  app.use('/clients', clientEndpoint);
  app.use('/config', configEndpoint);
  return app;
}

export default createApp;
