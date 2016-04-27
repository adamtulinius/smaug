'use strict';

import fs from 'fs';
import minimist from 'minimist';
import {log} from './utils';
import {createApp, createOAuthApp, createConfigurationApp} from './expressapp';

const args = minimist(process.argv.slice(2));
const config = JSON.parse(
  fs.readFileSync(
    args.f || './config.json', 'utf8'));

const ClientStore = require('./oauth/tokenstore/' + (config.clientstore.backend || 'inmemory'));
const TokenStore = require('./oauth/tokenstore/' + (config.tokenstore.backend || 'inmemory'));
const UserStore = require('./oauth/userstore/' + (config.userstore.backend || 'inmemory'));
const ConfigurationStore = require('./oauth/configstore/' + (config.configstore.backend || 'static'));

[
  {store: ClientStore, config: config.clientstore},
  {store: TokenStore, config: config.tokenstore},
  {store: UserStore, config: config.userstore},
  {store: ConfigurationStore, config: config.configstore}
].forEach((configuredStore) => {
  configuredStore.store.requiredOptions().forEach((requiredOption) => {
    if (typeof configuredStore.config.config[requiredOption] === 'undefined') {
      throw new Error('Missing option for ' + configuredStore.config.backend + ': ' + requiredOption);
    }
  });
});

// Setup
const port = process.env.PORT || 3001; // eslint-disable-line no-process-env
const oAuthPort = process.env.PORT_OAUTH || port; // eslint-disable-line no-process-env
const configurationPort = process.env.PORT_CONFIG || port; // eslint-disable-line no-process-env
const splitMode = oAuthPort !== configurationPort;

var stores = {};
stores.clientStore = new ClientStore(config.clientstore.config);
stores.tokenStore = new TokenStore(config.tokenstore.config);
stores.userStore = new UserStore(config.userstore.config);
stores.configStore = new ConfigurationStore(stores.tokenStore, config.configstore.config);

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

apps.forEach((app) => {
  app.express.set('stores', stores);
  app.express.listen(app.port, () => {
    var description = '';
    if (typeof app.name !== 'undefined') {
      description = ' (' + app.name + ')';
    }
    log.info('Started Smaug' + description + ' on port ' + app.port);
  });
});
