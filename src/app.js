'use strict';

import fs from 'fs';
import minimist from 'minimist';
import {log} from './utils';
import {createApp, createAdminApp, createOAuthApp, createConfigurationApp} from './expressapp';

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

const storesToLoad = [
  'agencyStore',
  'clientStore',
  'configStore',
  'userStore',
  'tokenStore'
];

var loadedStores = {};

storesToLoad.forEach((storeName) => {
  var storeNameInConfig = storeName.toLowerCase();
  var storeConfig = config[storeNameInConfig];
  var store = require('./oauth/' + storeNameInConfig + '/' + (storeConfig.backend || 'inmemory'));
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
