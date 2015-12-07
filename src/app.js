'use strict';

/**
 * @file
 * Configure and start our server
 */

// Libraries
import express from 'express';
import http from 'http';
import socketio from 'socket.io'; // eslint-disable-line no-unused-vars

// Setup
const app = express();
const server = http.createServer(app);
const socket = socketio.listen(server); // eslint-disable-line no-unused-vars

app.set('port', process.env.PORT || 8080); // eslint-disable-line no-process-env

// Starting server
server.listen(app.get('port'), () => {
  console.log('OpenServiceProvider up and running'); // eslint-disable-line no-console
});
