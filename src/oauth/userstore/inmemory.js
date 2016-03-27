'use strict';

export default class UserStore {
  static requiredOptions() {
    return [];
  }

  constructor() {
    this.users = {};
  }

  ping() {
    return Promise.resolve();
  }

  storeUser (username, password) {
    const users = this.users;

    users[username] = password;
    return Promise.resolve();
  }

  getUser (username, password) {
    const users = this.users;

    return new Promise((resolve, reject) => {
      var actualPassword = users[username];
      if (typeof actualPassword === 'undefined' || password !== actualPassword) {
        reject(new Error('invalid username or password'));
      }

      resolve({id: username});
    });
  }
}
