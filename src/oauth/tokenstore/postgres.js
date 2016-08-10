/**
 * @file: This file implements the postgres backend for tokens.
 */

import NodeCache from 'node-cache';
import MemoryTokenStore from './inmemory';

class TokenStore extends MemoryTokenStore {
  constructor(stores, config = {}) {
    super(stores, config);

    this.sequelize = config.backend.sequelize;
    this.models = config.backend.models;
    this.tokens = this.models.Token;

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
      accessToken: accessToken,
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
          accessToken: bearerToken,
          expires: {$gte: now.toISOString()}
        },
        include: [this.models.Client]
      }).then(tokenResponse => {
        // No token in postgres.
        if (!tokenResponse) {
          return reject(new Error('token not found'));
        }

        // Get a plain token object and update the cache.
        const token = tokenResponse.get({plain: true});
        this.tokenCache.set(bearerToken, token);
        return resolve(token);
      });
    });
  }
}


export default TokenStore;
