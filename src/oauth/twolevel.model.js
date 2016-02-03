'use strict';

import TokenStore from './tokenstore.js';
import contains from 'lodash';
import BorchkServiceClient from 'dbc-node-borchk';
import Throttler from '../throttle/throttle.js';

/**
 * @file Model used by the OAuth2 Server for Resource-Owner
 */

const tokenStore = new TokenStore();
const throttler = new Throttler();

const borchkClient = new BorchkServiceClient({
  wsdl: 'https://borchk.addi.dk/2.4/borchk.wsdl',
  serviceRequester: 'bibliotek.dk'
});


const model = {

  getAccessToken: (bearerToken, callback) => {

    // retrieve access_token variables from redis
    const getPromise = tokenStore.getAccessToken(bearerToken);
    const ttlPromise = tokenStore.getAccessTokenTTL(bearerToken);

    Promise.all([getPromise, ttlPromise]).then((replies) => {

      const token = {
        accessToken: replies[0].accessToken,
        clientId: replies[0].clientId,
        expires: replies[1].ttl * 1000 + Math.ceil(Date.now() / 1000) * 1000,
        userId: replies[0].userId
      };

      callback(null, {
        accessToken: token.access_token,
        clientId: token.client_id,
        expires: token.expires,
        userId: token.userId
      });
    }, (err) => {
      callback(err, null);
    });
  },

  saveAccessToken (accessToken, clientId, expires, user, callback) {
    // store the newly generated access_token variables in redis
    tokenStore.storeAccessToken(accessToken, clientId, expires, user);
    callback();
  },

  getClient (clientId, clientSecret, callback) {

    // lookup in redis to see if client is registered.
    const getPromise = tokenStore.getClient(clientId, clientSecret);

    getPromise.then(() => {
      // if found then return clientid else return false
      callback(null, {clientId: clientId});
    }, (err) => {
      callback(err, false);
    });
  },

  grantTypeAllowed (clientId, grantType, callback) {
    // All clients should be allowed to used password and client_credentials
    if (contains(['password', 'client_credentials'], grantType)) {
      callback(null, true);
    }
    else {
      callback(null, false);
    }
  },

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
  },

  getUserFromClient(clientId, clientSecret, callback) {
    let user = {id: 'anonymous'};
    callback(null, user);
  }

};

export default model;
