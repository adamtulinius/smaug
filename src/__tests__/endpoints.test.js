'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import request from 'supertest';
import {createAdminApp, createConfigurationApp, createOAuthApp} from '../expressapp';
import TokenStore from '../oauth/tokenstore/inmemory';
import UserStore from '../oauth/userstore/inmemory';
import ConfigStore from '../oauth/configstore/inmemory';
import ClientStore from '../oauth/clientstore/inmemory';
import {userEncode} from '../utils';

chai.use(chaiAsPromised);
chai.should();

var apps = {};

var chance = new Chance();
var clientId = chance.word({length: 10});
var client = {name: chance.word({length: 10}), secret: chance.string()};
var user = {id: chance.word({length: 10}), libraryId: '123456'};
var username = userEncode(user.libraryId, user.id);
var password = chance.string();
var appConfig = {
  defaultLibraryId: '000000'
};
var adminAppConfig = {
  admin: {
    users: {
      foo: 'bar'
    }
  }
};

var tokens = {
  qwerty: {
    userId: 'donald@010101',
    clientId: 'duckDevLTD',
    expires: '2020-01-01T00:00:00Z'
  }
};

var stores = {};
stores.clientStore = new ClientStore(stores);
stores.tokenStore = new TokenStore(stores, {tokens: tokens});
stores.userStore = new UserStore(stores);
stores.configStore = new ConfigStore(stores, {default: {}});
stores.clientStore.update(clientId, client);
stores.userStore.storeUser(username, password);

apps.admin = createAdminApp(adminAppConfig);
apps.config = createConfigurationApp(appConfig);
apps.oauth = createOAuthApp(appConfig);
apps.admin.set('stores', stores);
apps.config.set('stores', stores);
apps.oauth.set('stores', stores);

var endpointTests = {
  admin: {
    '/clients': [
      (app, done) => {
        request(app)
          .get('/clients')
          .auth('foo', adminAppConfig.admin.users.foo)
          .expect(404, done);
      }
    ]
  },
  config: {
    '/configuration': [
      (app, done) => {
        request(app)
          .get('/configuration?token=qwerty')
          .auth('foo', adminAppConfig.admin.users.foo)
          .expect(404, done);
      }
    ]
  },
  oauth: {'/token/auth': []}
};

Object.keys(apps).forEach(function (appId) {
  describe('cross-app endpoint contamination tests: ' + appId, function() {
    var otherApps = Object.assign({}, apps);
    delete otherApps[appId];

    Object.keys(otherApps).forEach(function (otherAppId) {
      describe('testing endpoints from: ' + otherAppId, function() {
        Object.keys(endpointTests[otherAppId]).forEach(function(endpointId) {
          endpointTests[otherAppId][endpointId].forEach(function(test) {
            it(endpointId, function(done) {
              test(apps[appId], done);
            });
          });
        });
      });
    });
  });
});
