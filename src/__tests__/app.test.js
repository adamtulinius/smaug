'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import request from 'supertest';
import {createApp} from '../expressapp';
import TokenStore from '../oauth/tokenstore/inmemory';
import UserStore from '../oauth/userstore/inmemory';
import ConfigStore from '../oauth/configstore/inmemory';
import ClientStore from '../oauth/clientstore/inmemory';
import {userEncode} from '../utils';

chai.use(chaiAsPromised);
chai.should();

describe('web app', function () {
  var app = null;
  var chance = null;
  var clientId = null;
  var client = null;
  var user = null;
  var username = null;
  var password = null;
  var appConfig = null;
  var configStoreConfig = null;
  var bearerToken = null;
  var stores = {};

  before(function () {
    chance = new Chance();
    clientId = chance.word({length: 10});
    client = {name: chance.word({length: 10}), secret: chance.string()};
    user = {id: chance.word({length: 10}), libraryId: '123456'};
    username = userEncode(user.libraryId, user.id);
    password = chance.string();
    appConfig = {
      defaultLibraryId: '000000',
      whoCaresAboutSecurityAnyway: {
        storePasswordsInRedis: {
          prefix: 'users'
        }
      }
    };
    configStoreConfig = {
      default: {foo: 'default'},
      libraries: {
        123456: {foo: '123456'}
      }
    };

    stores.clientStore = new ClientStore(stores);
    stores.tokenStore = new TokenStore(stores);
    stores.userStore = new UserStore(stores);
    stores.configStore = new ConfigStore(stores, configStoreConfig);
    stores.clientStore.update(clientId, client);
    stores.userStore.storeUser(username, password);
    app = createApp(appConfig);
    app.set('stores', stores);
  });

  it('should respond with 200 on /', function (done) {
    request(app)
      .get('/')
      .expect(200, done);
  });

  it('should fail when logging in with client credentials', function (done) {
    request(app)
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: client.secret
      })
      .expect(500, done);
  });

  it('should return a token when logging in as anonymous', function (done) {
    request(app)
      .post('/oauth/token')
      .auth(clientId, client.secret)
      .type('form')
      .send({
        grant_type: 'password',
        username: userEncode(null, null),
        password: userEncode(null, null)
      })
      .expect(function(res) {
        var token = JSON.parse(res.text);
        token.should.have.property('access_token').with.length(40);
        token.should.have.property('expires_in');
        token.token_type.should.equal('bearer');
        bearerToken = token.access_token;
      })
      .expect(200, done);
  });

  it('should return a token when logging in with password', function (done) {
    request(app)
      .post('/oauth/token')
      .auth(clientId, client.secret)
      .type('form')
      .send({
        grant_type: 'password',
        username: username,
        password: password
      })
      .expect(function(res) {
        var token = JSON.parse(res.text);
        token.should.have.property('access_token').with.length(40);
        token.should.have.property('expires_in');
        token.token_type.should.equal('bearer');
        bearerToken = token.access_token;
      })
      .expect(200, done);
  });

  it('should return configuration when queried for it with a token', function(done) {
    request(app)
      .get('/configuration?token=' + bearerToken)
      .expect(function(res) {
        var returnedConfig = JSON.parse(res.text);
        returnedConfig.should.deep.equal(
          Object.assign(
          {},
            configStoreConfig.libraries[user.libraryId],
            {user: Object.assign({}, user, {clientId: clientId, secret: password})}
          )
        );
      })
      .expect(200, done);
  });
});
