'use strict';

import lodash from 'lodash';
import url from 'url';
import {log, userEncode} from '../utils';
// import Throttler from '../throttle/throttle.js';

/**
 * @file Model used by the OAuth2 Server for Resource-Owner
 */

// const throttler = new Throttler();

export class Model {
  constructor(app) {
    this.app = app;
  }

  getAccessToken(bearerToken, callback) {
    this.app.get('stores').tokenStore.getAccessToken(bearerToken)
      .then((token) => {
        log.info('model.getAccessToken success', {token: token});
        callback(null, token);
      })
      .catch((err) => {
        log.info('model.getAccessToken failure', {bearerToken: bearerToken, err: err});
        callback(err, null);
      });
  }

  saveAccessToken (accessToken, clientId, expires, user, callback) {
    this.app.get('stores').tokenStore.storeAccessToken(accessToken, clientId, expires, user)
      .then(callback())
      .catch((err) => {
        throw err;
      });
  }

  getClient (clientId, clientSecret, callback) {
    this.app.get('stores').clientStore.getAndValidate(clientId, clientSecret)
      .then(() => {
        // if found then return clientid else return false
        log.info('model.getClient success', {clientId: clientId});
        callback(null, {clientId: clientId});
      })
      .catch((err) => {
        log.info('model.getClient failure', {clientId: clientId, err: err});
        callback(null, false);
      });
  }

  grantTypeAllowed (clientId, grantType, callback) {
    // Only password allowed
    if (grantType === 'password') {
      callback(null, true);
    }
    else {
      callback(null, false);
    }
  }

  getUser (encodedUser, password, callback) {
    const providedUser = url.parse(encodedUser);
    const username = userEncode(providedUser.host, providedUser.auth);
    const clientId = providedUser.protocol.substring(0, providedUser.protocol.length-1); // God know why the protocol includes the ':'

    const storePasswordsInRedisClient = this.app.get('storePasswordsInRedisClient');
    const stores = this.app.get('stores');
    const auth = this.app.get('auth');

    stores.clientStore.get(clientId)
      .then((client) => {
        const authBackend = client.auth || 'default';
        log.debug('Using auth backend ' + authBackend, {authBackend: authBackend});

        if (!lodash.has(auth, authBackend)) {
          return callback(new Error('Requested auth-backend missing.'), null);
        }

        auth[authBackend].getUser(username, password)
          .then((user) => {
            if (user) {
              if (typeof storePasswordsInRedisClient !== 'undefined') {
                storePasswordsInRedisClient.set(username, password, (err, res) => { // eslint-disable-line no-unused-vars
                  if (err) {
                    callback(new Error('I\'m a teapot'), null);
                  }
                  else {
                    // success
                    callback(null, user);
                  }
                });
              }
              else {
                // success
                callback(null, user);
              }
            }
            else {
              // if getUser fails
              // register username
              // throttler.registerAuthFailure(username);
              // and return a non-informative auth error
              callback(false, null);
            }
          })
          .catch((err) => {
            callback(err, null);
          });
      })
      .catch((err) => {
        log.info('model.getClient failure', {clientId: clientId, err: err});
        callback(null, false);
      });
  }

  getUserFromClient(clientId, clientSecret, callback) {
    let user = {id: 'anonymous'};
    callback(null, user);
  }
}

export default Model;
