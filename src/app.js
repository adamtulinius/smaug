'use strict';

/**
 * @file
 * Configure and start our server
 */

// Libraries
import express from 'express';
import http from 'http';
import socketio from 'socket.io'; // eslint-disable-line no-unused-vars
import bodyParser from 'body-parser';
import OAuth2Server from 'oauth2-server';
import Model from './oauth/twolevel.model.js';
import TokenStore from './oauth/tokenstore/redis';
import {authorizeFull, authorizePartial} from './oauth/twolevel.middleware.js';
import throttle from './throttle/throttle.middleware.js';


// Setup
const app = express();
const server = http.createServer(app);
const socket = socketio.listen(server); // eslint-disable-line no-unused-vars

app.oauth = OAuth2Server({
  model: new Model(new TokenStore()),
  grants: ['password', 'client_credentials'],
  debug: true
});

app.set('port', process.env.PORT || 8080); // eslint-disable-line no-process-env

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(app.oauth.errorHandler());
app.use(throttle());


app.all('/oauth/token', app.oauth.grant());


// Examples of OAuth middleware
app.get('/', app.oauth.authorise(), authorizePartial(), function (req, res) {
  res.send('Secret area');
});

app.get('/test', app.oauth.authorise(), authorizeFull(), function (req, res) {
  res.send('Super secret area');
});


// Starting server
server.listen(app.get('port'), () => {
  console.log('OpenServiceProvider up and running'); // eslint-disable-line no-console
});
