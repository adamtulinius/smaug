'use strict';

import lodash from 'lodash';
import InmemoryConfigStore from './inmemory';


export default class DbcConfigStore extends InmemoryConfigStore {
  get(user, client) {
    return super.get(user, client)
      .then((unAugmentedConfig) => {
        var config = lodash.cloneDeep(unAugmentedConfig);
        Object.keys(config).forEach((configKey) => {
          if (typeof config[configKey] === 'object') {
            config[configKey].agency = config[configKey].agency || user.libraryId;
          }
        });
        return config;
      });
  }
}
