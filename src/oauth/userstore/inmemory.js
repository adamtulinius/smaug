'use strict';

import {userDecode, userEncode} from '../../utils';

export default class UserStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config = {}) {
    this.users = config.users || {};
  }

  ping() {
    return Promise.resolve();
  }

  storeUser (username, password) {
    const user = userDecode(username);

    if (typeof user.libraryId !== 'string') {
      throw new Error('invalid user (missing library id)');
    }

    const users = this.users;

    users[username] = password;
    return Promise.resolve();
  }

  isValidPassword(username, providedPassword) {
    const user = userDecode(username);

    if (typeof user.libraryId !== 'string') {
      return false;
    }

    const anonymousUser = typeof user.id === 'undefined';

    if (anonymousUser) {
      return userEncode(user.libraryId, null) === providedPassword;
    }

    var passwordOnFile = this.users[userEncode(user.libraryId, user.id)];
    return typeof passwordOnFile === 'string' && providedPassword === passwordOnFile;
  }

  getUser (username, password) {
    const authenticated = this.isValidPassword(username, password);

    if (authenticated) {
      return Promise.resolve({id: username});
    }

    return Promise.resolve(false);
  }
}
