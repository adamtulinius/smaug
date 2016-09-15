'use strict';

export default class UserStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config) { // eslint-disable-line no-unused-vars
  }

  ping() {
    return Promise.resolve();
  }

  storeUser (username, password) { // eslint-disable-line no-unused-vars
    return Promise.resolve();
  }

  getUser (username, password) { // eslint-disable-line no-unused-vars
    return Promise.resolve(false);
  }
}
