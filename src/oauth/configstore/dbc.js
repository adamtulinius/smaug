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

        // support new config format v2
        if (typeof config.agency === 'undefined') {
          config.agency = {};
        }

        config.agency.order = user.libraryId;
        config.agency.search = config.agency.search || user.libraryId;

        // support new config format v3
        if (typeof config.search === 'undefined') {
          config.search = {};
        }

        config.search.agency = user.libraryId; // todo: this is client specific!

        return config;
      })
      .then((config) => {
        return new Promise((resolve, reject) => {
          return this.stores.clientStore.get(client.id)
            .then((fetchedClient) => {
              if (typeof (fetchedClient.search || {}).agency !== 'undefined') {
                config.search.agency = fetchedClient.search.agency;
              }

              if (typeof (fetchedClient.search || {}).profile === 'undefined') {
                return reject(new Error('missing client.search.profile'));
              }
              config.search.profile = fetchedClient.search.profile;

              if (typeof (fetchedClient.search || {}).collectionidentifiers === 'undefined') {
                return reject(new Error('missing client.search.collectionidentifiers'));
              }
              config.search.collectionidentifiers = fetchedClient.search.collectionidentifiers;

              return resolve(config);
            })
            .catch((err) => {
              reject(err);
            });
        });
      })
      .then((config) => {
        return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
          return this.stores.agencyStore.get(user.libraryId)
            .then((fetchedAgency) => {
              if (typeof (fetchedAgency.ddbcms || {}).api === 'undefined') {
                return resolve(config);
              }
              if (typeof (fetchedAgency.ddbcms || {}).password === 'undefined') {
                return resolve(config);
              }
              config.services.ddbcmsapi = fetchedAgency.ddbcms.api;
              config.app.ddbcmsapipassword = fetchedAgency.ddbcms.password;

              return resolve(config);
            })
            .catch((err) => { // eslint-disable-line no-unused-vars
              // since no options are required to be set, the config can just be returned.
              resolve(config);
            });
        });
      });
  }
}
