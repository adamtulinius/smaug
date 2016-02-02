'use strict';

/**
 * @file Middleware for controlling the degree of access to resources.
 * Partial access gives access to OpenSearch
 * Full access gives access all remaining API calls
 */

export function authorizeFull() {
  return function (req, res, next) {
    if (typeof req.user.id === 'undefined' || req.user.id === 'anonymous') {
      next(new Error('Not Authorized'));
    }
    else {
      next();
    }
  };
}

export function authorizePartial() {
  return function (req, res, next) {
    if (typeof req.user.id === 'undefined') {
      next(new Error('Not Authorized'));
    }
    else {
      next();
    }
  };
}
