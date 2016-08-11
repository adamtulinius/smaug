'use strict';

import moment from 'moment';

class TokenStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config = {}) {
    this.clients = config.clients || {};
    this.tokens = config.tokens || {};
  }


  /**
   * Ping backend.
   */
  ping() {
    return Promise.resolve();
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

    tokens[accessToken] = {
      clientId: clientId,
      userId: user.id,
      expires: expires.toISOString()};

    return Promise.resolve();
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
      if (typeof result === 'undefined') {
        reject(new Error('bearerToken not found'));
      }

      result.expires = moment(result.expires).toDate();

      if (result.expires > (new Date())) {
        result.accessToken = bearerToken;
        resolve(result);
      }
      else {
        reject(new Error('token expired'));
      }
    });
  }

  /**
   * Deletes a users accesstokens
   * @param {String}userId
   * @returns {Promise}
   */
  clearAccessTokensForUser(userId) {
    return new Promise((resolve) => {
      let deleteCount = 0;
      Object.keys(this.tokens).forEach(tokenKey => {
        if (this.tokens[tokenKey].userId === userId) {
          delete this.tokens[tokenKey];
          deleteCount += 1;
        }
      });

      resolve({count: deleteCount});
    });
  }

  /**
   * Revokes a single access token
   * @param {String}token
   * @returns {Promise}
   */
  revokeToken(token) {
    return new Promise(resolve => {
      if (this.tokens[token]) {
        delete this.tokens[token];
        return resolve({count: 1});
      }

      return resolve({count: 0});
    });
  }
}


export default TokenStore;
