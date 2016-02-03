'use strict';

import redis from 'redis';

/**
 * @file Register and throttleRequest suspicious requests.
 */

class Throttler {

  constructor() {
    this.redisClient = redis.createClient();
  }

  /**
   * Returns true if the username has been banned ( should be throttled )
   * @param username
   * @returns {Promise}
   */
  isUserBanned(username) {

    const redisClient = this.redisClient;

    const key = this.createUserKey(username);

    return new Promise((resolve) => {
      redisClient.get(key, (err, reply) => {
        if (typeof reply === 'undefined' || (reply <= 5)) {
          // username is not banned
          resolve(false);
        }
        else {
          // username is banned
          resolve(true);
        }
      });
    });
  }

  /**
   * Register the failed authentication attempt.
   * The registration will expire after 30 minutes.
   * @param username
   */
  registerAuthFailure(username) {
    const redisClient = this.redisClient;
    const multi = redisClient.multi();

    const key = this.createUserKey(username);

    // increment counter for key and add TTL
    multi.incr(key).expire(key, 60*30).exec(() => {});
  }

  createUserKey(username) {
    return 'throttle_auth_failure:' + username;
  }
}

export default Throttler;
