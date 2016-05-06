'use strict';

import express from 'express';
import OAuth2Server from 'oauth2-server';
import bodyParser from 'body-parser';
import basicAuth from 'basic-auth';
import lruCache from 'lru-cache';
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

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  app.get('/', function (req, res) {
    res.send('Helpful text about Smaug.');
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
          result.errors[storeId] = {name: status.result.name, msg: status.result.message, stacktrace: status.result.stack, responseTime: status.responseTime};
        }
        else {
          result.ok[storeId] = {responseTime: status.responseTime};
        }
      });
      if (Object.keys(result.errors || {}).length > 0) {
        res.status(500);
      }
      res.json(result);
    });
  });

  return app;
}

export function createConfigurationApp(config) {
  var app = createBasicApp(config);
  app.set('configCache', lruCache({max: 100, maxAge: 10*1000}));

  app.get('/configuration', (req, res, next) => {
    var bearerToken = req.query.token;

    var cachedConfig = app.get('configCache').get(bearerToken);
    if (typeof cachedConfig !== 'undefined') {
      return res.json(cachedConfig);
    }

    app.get('stores').tokenStore.getAccessToken(bearerToken)
      .then((tokenInfo) => {
        var user = Object.assign(userDecode(tokenInfo.userId), {clientId: tokenInfo.clientId});
        var client = {id: tokenInfo.clientId};
        return app.get('stores').configStore.get(user, client)
          .then((userConfig) => {
            var storePasswordsInRedisClient = app.get('storePasswordsInRedisClient');
            if (typeof storePasswordsInRedisClient !== 'undefined') {
              storePasswordsInRedisClient.get(tokenInfo.userId, (redisErr, redisRes) => { // eslint-disable-line no-unused-vars
                if (redisErr) {
                  return next(new Error('I\'m still a teapot'));
                }

                var insecureUser = Object.assign({}, user, {secret: redisRes});
                var generatedConfig = Object.assign({}, userConfig, {user: insecureUser});
                app.get('configCache').set(bearerToken, generatedConfig);
                res.json(generatedConfig);
              });
            }
            else {
              // success
              var generatedConfig = Object.assign({}, userConfig, {user: user});
              app.get('configCache').set(bearerToken, generatedConfig);
              res.json(generatedConfig);
            }
          })
          .catch((err) => {
            return next(err);
          });
      })
      .catch((err) => {
        return next(err);
      });
  });

  return app;
}

export function createOAuthApp(config = {}) {
  var app = createBasicApp(config);

  app.oauth = OAuth2Server({
    model: new Model(app),
    grants: ['password'],
    debug: true,
    accessTokenLifetime: 60*60*24*30 // 30 days
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
        return next();
      }
    }
    return res.sendStatus(403);
  });

  var clientEndpoint = express.Router();
  var configEndpoint = express.Router();

  clientEndpoint.use((req, res, next) => {
    next();
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
        name: req.body.name
      };

      app.get('stores').clientStore.create(client)
        .then(filterClient)
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
      var client = {
        name: req.body.name
      };
      app.get('stores').clientStore.update(clientId, client)
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
