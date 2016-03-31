'use strict';

import fs from 'fs';
import minimist from 'minimist';
import {log} from './utils';
import createApp from './expressapp';

const args = minimist(process.argv.slice(2));
const config = JSON.parse(
  fs.readFileSync(
    args.f || __dirname + '/../config.json', 'utf8'));

const TokenStore = require('./oauth/tokenstore/' + (config.tokenstore.backend || 'inmemory'));
const UserStore = require('./oauth/userstore/' + (config.userstore.backend || 'inmemory'));
const ConfigurationStore = require('./oauth/configstore/' + (config.configstore.backend || 'static'));

[
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

var tokenStore = new TokenStore(config.tokenstore.config);
var userStore = new UserStore(config.userstore.config);
var configurationStore = new ConfigurationStore(tokenStore, config.configstore.config);

const app = createApp(
  tokenStore,
  userStore,
  configurationStore
);

// Starting server
app.listen(port, () => {
  log.info('Started Smaug on port ' + port);
});
