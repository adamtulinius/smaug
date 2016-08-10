'use strict';

import fs from 'fs';
import minimist from 'minimist';
import Sequelize from 'sequelize';
import redis from 'redis';
import {log} from './utils';
import {createApp, createAdminApp, createOAuthApp, createConfigurationApp} from './expressapp';
import PostgresModels from './models';

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
  const sequelize = new Sequelize(config.datasources.postgres.uri, {logging: log.info});
  config.datasources.postgres.models = PostgresModels(sequelize, config.datasources.postgres.forceDBSync);
  config.datasources.postgres.sequelize = sequelize;
}

if (config.datasources && config.datasources.redis) {
  config.datasources.redis.redisClient = redis.createClient(config.datasources.redis.uri);
}

const storesToLoad = [
  'agencyStore',
  'clientStore',
  'configStore',
  'userStore',
  'tokenStore'
];

var loadedStores = {};

storesToLoad.forEach((storeName) => {
  const storeNameInConfig = storeName.toLowerCase();
  const storeConfig = config[storeNameInConfig];
  const storeBackend = storeConfig.backend || 'inmemory';
  storeConfig.config.backend = config.datasources[storeBackend];
  const store = require('./oauth/' + storeNameInConfig + '/' + storeBackend).default;
  store.requiredOptions().forEach((requiredOption) => {
    if (typeof storeConfig[requiredOption] === 'undefined') {
      throw new Error('Missing option for ' + storeConfig.backend + ': ' + requiredOption);
    }
  });
  loadedStores[storeName] = new store(loadedStores, storeConfig.config);
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
  app.express.listen(app.port, () => {
    var description = '';
    if (typeof app.name !== 'undefined') {
      description = ' (' + app.name + ')';
    }
    log.info('Started Smaug' + description + ' on port ' + app.port);
  });
});
