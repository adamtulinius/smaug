'use strict';

import moment from 'moment';

/**
 * @file Access/Store tokens and clients in Redis.
 */

class TokenStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config = {}) { // eslint-disable-line no-unused-vars
    // Get the redis client
    this.redisClient = config.backend.redisClient;
  }


  /**
   * Ping redis
   */
  ping() {
    const redisClient = this.redisClient;

    return new Promise((resolve, reject) => {
      redisClient.ping((err, res) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(res);
        }
      });
    });
  }


  /**
   * Stores a set of accessToken variables in Redis
   * @param accessToken
   * @param clientId
   * @param expires
   * @param user
   */
  storeAccessToken(accessToken, clientId, expires, user) {
    const redisClient = this.redisClient;
    const key = 'accessToken:' + accessToken;

    var promise = new Promise((resolve, reject) => {
      redisClient.hmset(key, {clientId: clientId, userId: user.id}, (err, res) => { // eslint-disable-line no-unused-vars
        if (err) {
          reject(err);
        }
        else {
          resolve(res);
        }
      });
    });

    promise.then(() => {
      return new Promise((resolve, reject) => {
        redisClient.pexpireat(key, expires.getTime(), (err, res) => {
          if (err) {
            reject(err);
          }
          else if (res === 0) {
            reject(new Error('ttl for key=' + key + ' could not be set'));
          }
          else {
            resolve(res);
          }
        });
      });
    });

    return promise;
  }


  /**
   * Gets a promise that contains the token variables for a given accessToken (bearerToken)
   * @param bearerToken
   * @returns {Promise}
   */
  getAccessToken(bearerToken) {
    const redisClient = this.redisClient;

    const key = 'accessToken:' + bearerToken;
    // create a promise for the command
    const accessTokenPromise = new Promise(function (resolve, reject) {
      redisClient.hmget(key, 'clientId', 'userId', function (err, reply) {
        if (err !== null) {
          reject(err);
        }
        else if (reply[0] === null || reply[1] === null) {
          reject(new Error('bearerToken not found'));
        }
        else {
          resolve({accessToken: bearerToken, clientId: reply[0], userId: reply[1]});
        }
      });
    });

    const accessTokenTtlPromise = new Promise(function (resolve, reject) {
      redisClient.pttl(key, function (err, reply) {
        if (err !== null) {
          reject(err);
        }
        else {
          resolve({ttl: reply});
        }
      });
    });

    return Promise.all([accessTokenPromise, accessTokenTtlPromise])
      .then((replies) => {
        var expires = null;
        if (replies[1].ttl !== -1) {
          expires = moment().add(replies[1].ttl, 'milliseconds');
        }
        return Promise.resolve({
          accessToken: replies[0].accessToken,
          clientId: replies[0].clientId,
          expires: expires.toDate(),
          userId: replies[0].userId
        });
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }

  clearAccessTokensForUser() {
    return Promise.reject('Not implemented for this backend!');
  }

  revokeToken(bearerToken) {
    const redisClient = this.redisClient;
    const key = 'accessToken:' + bearerToken;

    return new Promise((resolve, reject) => {
      redisClient.hdel(key, 'clientId', 'userId', (err, reply) => {
        if (err) {
          return reject(err);
        }

        let deleteCount = 0;
        if (reply > 0) {
          deleteCount = reply / 2; // we delete two fields, but only one token.
        }

        return resolve({count: deleteCount});
      });
    });
  }
}


export default TokenStore;
