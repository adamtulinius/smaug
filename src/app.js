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

var clientStore = new ClientStore(config.clientstore.config);
var tokenStore = new TokenStore(config.tokenstore.config);
var userStore = new UserStore(config.userstore.config);
var configurationStore = new ConfigurationStore(tokenStore, config.configstore.config);


if (splitMode) {
  var oAuthApp = createOAuthApp(
    config,
    clientStore,
    tokenStore,
    userStore,
    configurationStore
  );

  var configurationApp = createConfigurationApp(
    config,
    clientStore,
    tokenStore,
    userStore,
    configurationStore
  );

  oAuthApp.listen(oAuthPort, () => {
    log.info('Started Smaug (config) on port ' + oAuthPort);
  });

  configurationApp.listen(configurationPort, () => {
    log.info('Started Smaug (auth) on port ' + configurationPort);
  });
}
else {
  var app = createApp(
    config,
    clientStore,
    tokenStore,
    userStore,
    configurationStore
  );

  // Since $oAuthPort and $configurationPort can be set to the same port, but might be different from $port,
  // it might be wrong to listen on $port when not in split mode.
  app.listen(oAuthPort, () => {
    log.info('Started Smaug (auth) on port ' + oAuthPort);
  });
}
