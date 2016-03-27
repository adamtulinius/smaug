'use strict';

class TokenStore {
  static requiredOptions() {
    return [];
  }

  constructor() {
    this.clients = {};
    this.tokens = {};
  }


  /**
   * Ping backend.
   */
  ping() {
    return Promise.resolve();
  }


  /**
   * Stores a client key-value pair.
   * @param clientId
   * @param clientSecret
   */
  storeClient(clientId, clientSecret) {
    const clients = this.clients;

    return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
      clients[clientId] = clientSecret;
      resolve();
    });
  }


  /**
   * Gets a client if the client exists.
   * @param clientId
   * @param clientSecret
   * @returns {Promise}
   */
  getClient(clientId, clientSecret) {
    const clients = this.clients;

    return new Promise(function (resolve, reject) {
      var actualClientSecret = clients[clientId];

      if (actualClientSecret === clientSecret) {
        resolve(actualClientSecret);
      }
      else {
        reject();
      }
    });
  }


  /**
   * Stores a set of accessToken
   * @param accessToken
   * @param clientId
   * @param expires
   * @param user
   */
  storeAccessToken(accessToken, clientId, expires, user) {
    const tokens = this.tokens;

    return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
      tokens[accessToken] = {
        clientId: clientId,
        userId: user.id,
        expires: expires};
      resolve();
    });
  }


  /**
   * Gets a promise that contains the token variables for a given accessToken (bearerToken)
   * @param bearerToken
   * @returns {Promise}
   */
  getAccessToken(bearerToken) {
    const tokens = this.tokens;

    return new Promise(function (resolve, reject) {
      var result = tokens[bearerToken];

      if (result !== undefined && result.expires > (new Date())) { // eslint-disable-line no-undefined
        result.accessToken = bearerToken;
        resolve(result);
      }
      else {
        reject();
      }
    });
  }
}


export default TokenStore;
