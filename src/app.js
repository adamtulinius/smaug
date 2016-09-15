'use strict';

import fs from 'fs';
import minimist from 'minimist';
import redis from 'redis';
import {log} from './utils';
import {createApp, createAdminApp, createOAuthApp, createConfigurationApp} from './expressapp';
import models from './models';

const args = minimist(process.argv.slice(2));
const config = JSON.parse(
  fs.readFileSync(
    args.f || './config.json', 'utf8'));

// Setup
const port = process.env.PORT || 3001; // eslint-disable-line no-process-env
const adminPort = process.env.PORT_ADMIN; // eslint-disable-line no-process-env
const oAuthPort = process.env.PORT_OAUTH || port; // eslint-disable-line no-process-env
const configurationPort = process.env.PORT_CONFIG || port; // eslint-disable-line no-process-env
const splitMode = oAuthPort !== configurationPort;

if (config.datasources && config.datasources.postgres) {
  config.datasources.postgres.models = models(config.datasources.postgres);
}

if (config.datasources && config.datasources.redis) {
  config.datasources.redis.redisClient = redis.createClient(config.datasources.redis.uri);
}

function loadBackend(storeName, storeConfig) {
  const storeBackend = storeConfig.backend || 'inmemory';
  storeConfig.config.backend = config.datasources[storeBackend];
  const store = require('./oauth/' + storeName.toLowerCase() + '/' + storeBackend).default;
  store.requiredOptions().forEach((requiredOption) => {
    if (typeof storeConfig[requiredOption] === 'undefined') {
      throw new Error('Missing option for ' + storeConfig.backend + ': ' + requiredOption);
    }
  });
  return new store(loadedStores, storeConfig.config);
}


const storesToLoad = [
  'agencyStore',
  'clientStore',
  'configStore',
  'tokenStore'
];

var loadedStores = {};

// load generic stores
storesToLoad.forEach((storeName) => {
  const storeNameInConfig = storeName.toLowerCase();
  loadedStores[storeName] = loadBackend(storeName, config[storeNameInConfig]);
});

var userStores = {};

// load auth backends
Object.keys(config.auth).forEach((authBackendName) => {
  const storeConfig = config.auth[authBackendName];
  userStores[authBackendName] = loadBackend('userstore', storeConfig);
});


var apps = [];

if (splitMode) {
  apps.push({express: createOAuthApp(config), port: oAuthPort, name: 'auth'});
  apps.push({express: createConfigurationApp(config), port: configurationPort, name: 'config'});
}
else {
  // Since $oAuthPort and $configurationPort can be set to the same port, but might be different from $port,
  // it might be wrong to listen on $port when not in split mode.
  apps.push({express: createApp(config), port: oAuthPort});
}

if (typeof adminPort !== 'undefined') {
  apps.push({express: createAdminApp(config), port: adminPort, name: 'admin'});
}

apps.forEach((app) => {
  app.express.set('stores', loadedStores);
  app.express.set('auth', userStores);
  app.express.listen(app.port, () => {
    var description = '';
    if (typeof app.name !== 'undefined') {
      description = ' (' + app.name + ')';
    }
    log.info('Started Smaug' + description + ' on port ' + app.port);
  });
});
