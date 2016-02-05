'use strict';

/**
 * @file Throttles requests to prevent password guessing attacks.
 */

import Throttler from './throttle.js';


/**
 * The middleware will throttleRequest requests based on credentials usage.
 */
export default function throttle(options) {
  options = options || {};

  const throttler = new Throttler();

  /**
   * Delays the request 5 seconds if authentication failure limit has been exceeded
   */
  return function throttleRequest(req, res, next) {
    const username = req.body.username;
    if (username) {
      // check if username has exceeded
      const isBannedPromise = throttler.isUserBanned(username);
      isBannedPromise.then((isBanned) => {
        if (isBanned) {
          setTimeout(next, 5000);
        }
        else {
          next();
        }
      });
    }
    else {
      // nothing happened..
      next();
    }
  };
}
