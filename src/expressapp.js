'use strict';

import express from 'express';
import OAuth2Server from 'oauth2-server';
import bodyParser from 'body-parser';
import {log} from './utils';
import Model from './oauth/twolevel.model.js';
// import throttle from './throttle/throttle.middleware.js';
import {userEncode} from './utils';

function createBasicApp() {
  var app = express();

  app.disable('x-powered-by');

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  app.get('/', function (req, res) {
    res.send('Helpful text about Smaug.');
  });

  return app;
}

export function createConfigurationApp(config, clientStore, tokenStore, userStore, configStore) { // eslint-disable-line no-unused-vars
  var app = createBasicApp();

  app.get('/configuration', (req, res, next) => {
    var bearerToken = req.query.token;

    tokenStore.getAccessToken(bearerToken)
      .then(() => {
        configStore.get(bearerToken)
          .then((userConfig) => {
            res.send(JSON.stringify(userConfig, null, req.query.pretty ? 2 : null));
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

export function createOAuthApp(config, clientStore, tokenStore, userStore, configStore) { // eslint-disable-line no-unused-vars
  var app = createBasicApp();

  app.oauth = OAuth2Server({
    model: new Model(clientStore, tokenStore, userStore),
    grants: ['password'],
    debug: true,
    accessTokenLifetime: 60*60*24*30 // 30 days
  });

  app.use(app.oauth.errorHandler());
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

  return app;
}

export function createApp(config, clientStore, tokenStore, userStore, configStore) {
  var app = express();

  app.use(createConfigurationApp(config, clientStore, tokenStore, userStore, configStore));
  app.use(createOAuthApp(config, clientStore, tokenStore, userStore, configStore));

  return app;
}

export default createApp;
