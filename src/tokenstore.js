'use strict';

import {forEach} from 'lodash';
import redis from 'redis';
import clients from './clientregister.js';

/**
 * @file Access/Store tokens and clients in Redis.
 */

class TokenStore {

  constructor() {
    // initialize redis client
    this.redisClient = redis.createClient();
    // reset redis
    this.redisClient.flushall();
    // store all clients in redis
    for (let clientId in clients) {
      this.storeClient(clientId, clients[clientId]);
    }
  }


  /**
   * Stores a client key-value pair in redis.
   * @param clientId
   * @param clientSecret
   */
  storeClient(clientId, clientSecret) {
    const key = 'clientId:' + clientId;
    this.redisClient.set(key, clientSecret);
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
        } else {
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
    redisClient.hmset(key, {clientId: clientId, userId: user.id});
    // calculate time-to-live for automatic cache invalidation
    const ttl = Math.ceil((expires.getTime() - Date.now()) / 1000);
    // set ttl for the accessToken we just stored
    redisClient.expire(key, ttl);
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
    const promise = new Promise(function (resolve, reject) {
      redisClient.hmget(key, 'clientId', 'userId', function (err, reply) {
        if (err !== null) {
          reject(err);
        } else {
          resolve({accessToken: bearerToken, clientId: reply[0], userId: reply[1]});
        }
      });
    });
    return promise;
  }


  /**
   * Gets a promise that contains the TTL for a given accessToken (bearerToken)
   * @param bearerToken
   * @returns {Promise}
   */
  getAccessTokenTTL(bearerToken) {
    const redisClient = this.redisClient;

    const key = 'accessToken:' + bearerToken;

    // create a promise for the command
    const promise = new Promise(function (resolve, reject) {
      redisClient.ttl(key, function (err, reply) {
        if (err !== null) {
          reject(err);
        } else {
          resolve({ttl: reply});
        }
      });
    });
    return promise;
  }

}


export default TokenStore;
