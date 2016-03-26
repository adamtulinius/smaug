'use strict';

import express from 'express';
import OAuth2Server from 'oauth2-server';
import bodyParser from 'body-parser';
import Model from './oauth/twolevel.model.js';
import {authorizeFull, authorizePartial} from './oauth/twolevel.middleware.js';
import throttle from './throttle/throttle.middleware.js';

export default function createApp(tokenStore, userStore) {
  var app = express();

  app.oauth = OAuth2Server({
    model: new Model(tokenStore, userStore),
    grants: ['password', 'client_credentials'],
    debug: true
  });

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(app.oauth.errorHandler());
  app.use(throttle());

  app.get('/', function (req, res) {
    res.send('Helpful text about Smaug.');
  });

  app.all('/oauth/token', app.oauth.grant());


// Examples of OAuth middleware
  app.get('/secret', app.oauth.authorise(), authorizePartial(), function (req, res) {
    res.send('Secret area');
  });

  app.get('/test', app.oauth.authorise(), authorizeFull(), function (req, res) {
    res.send('Super secret area');
  });

  return app;
}
