'use strict';

import contains from 'lodash';
import BorchkServiceClient from 'dbc-node-borchk';
import Throttler from '../throttle/throttle.js';

/**
 * @file Model used by the OAuth2 Server for Resource-Owner
 */

const throttler = new Throttler();

const borchkClient = new BorchkServiceClient({
  wsdl: 'https://borchk.addi.dk/2.4/borchk.wsdl',
  serviceRequester: 'bibliotek.dk'
});

export class Model {
  constructor(tokenStore) {
    this.tokenStore = tokenStore;
  }

  getAccessToken(bearerToken, callback) {
    this.tokenStore.getAccessToken(bearerToken)
      .then((token) => {
        callback(null, token);
      })
      .catch((err) => {
        callback(err, null);
      });
  }

  saveAccessToken (accessToken, clientId, expires, user, callback) {
    this.tokenStore.storeAccessToken(accessToken, clientId, expires, user)
      .then(callback())
      .catch((err) => {
        throw err;
      });
  }

  getClient (clientId, clientSecret, callback) {
    this.tokenStore.getClient(clientId, clientSecret)
      .then(() => {
        // if found then return clientid else return false
        callback(null, {clientId: clientId});
      })
      .catch((err) => {
        callback(err, false);
      });
  }

  grantTypeAllowed (clientId, grantType, callback) {
    // All clients should be allowed to used password and client_credentials
    if (contains(['password', 'client_credentials'], grantType)) {
      callback(null, true);
    }
    else {
      callback(null, false);
    }
  }

  getUser (username, password, callback) {
    const params = {
      userId: username,
      userPincode: password,
      libraryCode: '714700'
    };

    // check username and password againts Borchk and return some user id
    const borchkPromise = borchkClient.getBorrowerCheckResult(params);

    borchkPromise.then((reply) => {
      const isUserAuthenticated = reply.requestStatus === 'ok';
      if (isUserAuthenticated) {
        let user = {id: username}; // TODO: is username/cpr the right userid?
        callback(null, user);
      }
      else {
        // if borchk fails
        // register username
        throttler.registerAuthFailure(username);
        // and return a non-informative auth error
        callback(new Error('authentication error'), null);
      }
    });
  }

  getUserFromClient(clientId, clientSecret, callback) {
    let user = {id: 'anonymous'};
    callback(null, user);
  }
}

export default Model;
