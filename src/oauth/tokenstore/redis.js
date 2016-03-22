'use strict';

import redis from 'redis';
import clients from '../clientregister.js';

/**
 * @file Access/Store tokens and clients in Redis.
 */

class TokenStore {

  constructor() {
    // initialize redis client
    this.redisClient = redis.createClient();
    // store all clients in redis
    for (let clientId in clients) {
      if ({}.hasOwnProperty.call(clients, clientId)) {
        this.storeClient(clientId, clients[clientId]);
      }
    }
  }


  /**
   * Stores a client key-value pair in redis.
   * @param clientId
   * @param clientSecret
   */
  storeClient(clientId, clientSecret) {
    const redisClient = this.redisClient;
    const key = 'clientId:' + clientId;

    return new Promise((resolve, reject) => {
      redisClient.set(key, clientSecret, (err, res) => {
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
   * Gets a client from redis if the client exists. Note that a promise is returned.
   * @param clientId
   * @param clientSecret
   * @returns {Promise}
   */
  getClient(clientId, clientSecret) {
    const redisClient = this.redisClient;

    const key = 'clientId:' + clientId;
    // create a promise for the command
    return new Promise(function (resolve, reject) {
      redisClient.get(key, function (err, reply) {
        if (reply !== null && reply === clientSecret) {
          resolve(reply);
        }
        else {
          reject();
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

    var ttlPromise = new Promise((resolve, reject) => {
      const ttl = Math.ceil((expires.getTime() - Date.now()) / 1000);
      // set ttl for the accessToken we just stored
      redisClient.expire(key, ttl, (err, res) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(res);
        }
      });
    });

    var setPromise = new Promise((resolve, reject) => {
      redisClient.hmset(key, {clientId: clientId, userId: user.id}, (err, res) => { // eslint-disable-line no-unused-vars
        if (err) {
          reject(err);
        }
        else {
          return ttlPromise;
        }
      });
    });


    return setPromise;
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
      redisClient.ttl(key, function (err, reply) {
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
        return Promise.resolve({
          accessToken: replies[0].accessToken,
          clientId: replies[0].clientId,
          expires: replies[1].ttl * 1000 + Math.ceil(Date.now() / 1000) * 1000,
          userId: replies[0].userId
        });
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }
}


export default TokenStore;
