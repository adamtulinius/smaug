'use strict';

import express from 'express';
import OAuth2Server from 'oauth2-server';
import bodyParser from 'body-parser';
import Model from './oauth/twolevel.model.js';
import {authorizeFull, authorizePartial} from './oauth/twolevel.middleware.js';
import throttle from './throttle/throttle.middleware.js';

export default function createApp(tokenStore, userStore, configStore) {
  var app = express();

  app.oauth = OAuth2Server({
    model: new Model(tokenStore, userStore),
    grants: ['password'],
    debug: true
  });

  app.disable('x-powered-by');
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(app.oauth.errorHandler());
  app.use(throttle());

  app.get('/', function (req, res) {
    res.send('Helpful text about Smaug.');
  });

  app.get('/configuration', (req, res, next) => {
    var bearerToken = req.query.token;

    tokenStore.getAccessToken(bearerToken)
      .then(() => {
        configStore.get(bearerToken)
          .then((config) => {
            res.send(JSON.stringify(config));
          })
          .catch((err) => {
            return next(err);
          });
      })
      .catch((err) => {
        return next(err);
      });
  });

  app.post('/oauth/token', app.oauth.grant());


// Examples of OAuth middleware
  app.get('/secret', app.oauth.authorise(), authorizePartial(), function (req, res) {
    res.send('Secret area');
  });

  app.get('/test', app.oauth.authorise(), authorizeFull(), function (req, res) {
    res.send('Super secret area');
  });

  return app;
}
