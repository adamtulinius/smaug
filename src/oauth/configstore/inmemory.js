'use strict';

import {userEncode} from '../../utils';

export default class ConfigurationStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config) {
    this.stores = stores;
    this.config = config || {};
  }

  ping() {
    return Promise.resolve();
  }

  get(user, client) {
    var encodedUser = userEncode(user.libraryId, user.id);
    var config = (this.config.users || {})[encodedUser] || (this.config.libraries || {})[user.libraryId] || (this.config.clients || {})[client.id] || this.config.default;
    return Promise.resolve(config);
  }
}
