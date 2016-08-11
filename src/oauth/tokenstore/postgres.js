/**
 * @file: This file implements the postgres backend for tokens.
 */

import NodeCache from 'node-cache';
import MemoryTokenStore from './inmemory';

class TokenStore extends MemoryTokenStore {
  constructor(stores, config = {}) {
    super(stores, config);

    this.sequelize = config.backend.models.sequelize;
    this.models = config.backend.models;
    this.tokens = this.models.tokens;

    this.tokenCache = new NodeCache({
      stdTTL: 30, // Time to live, 30 seconds
      checkperiod: 15 // check for outdated entries every 15 seconds.
    });
  }

  ping() {
    // Check connection to postgres.
    return this.sequelize.authenticate();
  }

  /**
   * Persists a token to postgres
   * @param {String}accessToken
   * @param {String}clientId
   * @param {Date}expires
   * @param {Object}user
   * @returns {bluebird.Promise}
   */
  storeAccessToken(accessToken, clientId, expires, user) {
    return this.tokens.create({
      id: accessToken,
      clientId: clientId,
      userId: user.id,
      expires: expires.toISOString()
    });
  }

  /**
   * Gets a token and client from postgres, please note this is cached.
   * @param {String}bearerToken
   * @returns {Promise}
   */
  getAccessToken(bearerToken) {
    return new Promise((resolve, reject) => {
      const now = new Date();

      // Get the token from the cache
      const cachedToken = this.tokenCache.get(bearerToken);
      if (cachedToken) {
        // Check when the token expires
        const cacheExpires = new Date(cachedToken.expires);

        if (cacheExpires > now) {
          // The token is valid
          return resolve(cachedToken);
        }

        // The token has expired, expunge it from the cache.
        this.tokenCache.del(bearerToken);
      }

      // No valid token was cached, check postgres
      this.tokens.findOne({
        where: {
          id: bearerToken,
          expires: {$gte: now.toISOString()}
        }
      }).then(tokenResponse => {
        // No token in postgres.
        if (!tokenResponse) {
          return reject(new Error('bearerToken not found'));
        }

        // Get a plain token object and update the cache.
        const token = tokenResponse.get({plain: true});
        token.accessToken = token.id;
        this.tokenCache.set(bearerToken, token);
        return resolve(token);
      });
    });
  }

  /**
   * Deletes a users accesstokens
   * @param {String}userId
   * @returns {Promise}
   */
  clearAccessTokensForUser(userId) {
    return new Promise((resolve, reject) => {
      this.tokens.destroy({where: {userId}})
        .then(res => resolve({count: res}))
        .catch(reject);
    });
  }

  /**
   * Revokes a single token
   * @param {String}bearerToken
   */
  revokeToken(bearerToken) {
    this.tokenCache.del(bearerToken);

    return new Promise((resolve, reject) => {
      this.tokens.destroy({where: {id: bearerToken}})
        .then(res => resolve({count: res}))
        .catch(reject);
    });
  }
}


export default TokenStore;
