'use strict';

import lodash from 'lodash';
import InmemoryConfigStore from './inmemory';


export default class DbcConfigStore extends InmemoryConfigStore {
  get(user, client) {
    return super.get(user, client)
      .then((unAugmentedConfig) => {
        var config = lodash.cloneDeep(unAugmentedConfig);

        // support old config format
        Object.keys(config).forEach((configKey) => {
          if (typeof config[configKey] === 'object') {
            config[configKey].agency = config[configKey].agency || user.libraryId;
          }
        });

        // support new config format
        if (typeof config.agency === 'undefined') {
          config.agency = {};
        }

        config.agency.search = user.libraryId;
        config.agency.order = config.agency.order || user.libraryId;

        return config;
      });
  }
}
