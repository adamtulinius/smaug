'use strict';

import {userDecode} from '../../utils';

export default class ConfigurationStore {
  static requiredOptions() {
    return [];
  }

  constructor(tokenStore, config) {
    this.tokenStore = tokenStore;
    this.config = config || {};
  }

  ping() {
    return Promise.resolve();
  }

  get(token) { // eslint-disable-line no-unused-vars
    var config = this.config;
    return this.tokenStore.getAccessToken(token)
      .then((tokenInfo) => {
        var user = userDecode(tokenInfo.userId);
        var libraryId = user.libraryId;
        // priority: (highest) user, library, client, default (lowest)
        return (config.users || {})[tokenInfo.userId] || (config.libraries || {})[libraryId] || (config.clients || {})[tokenInfo.clientId] || config.default;
      })
      .catch((err) => {
        return err;
      });
  }
}
