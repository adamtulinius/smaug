'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import request from 'supertest';
import {createApp} from '../expressapp';
import TokenStore from '../oauth/tokenstore/inmemory';
import UserStore from '../oauth/userstore/inmemory';
import AllowAllUserStore from '../oauth/userstore/allow-all';
import DenyAllUserStore from '../oauth/userstore/deny-all';
import ConfigStore from '../oauth/configstore/inmemory';
import ClientStore from '../oauth/clientstore/inmemory';
import {userEncode} from '../utils';

chai.use(chaiAsPromised);
chai.should();

describe('web app', function () {
  var app = null;
  var chance = null;
  var clientId = null;
  var clientId2 = null;
  var clientId3 = null;
  var client = null;
  var client2 = null;
  var client3 = null;
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
    clientId2 = chance.word({length: 10});
    clientId3 = chance.word({length: 10});
    client = {name: chance.word({length: 10}), secret: chance.string()};
    client2 = {name: chance.word({length: 10}), secret: chance.string(), auth: 'allowAll'};
    client3 = {name: chance.word({length: 10}), secret: chance.string(), auth: 'denyAll'};
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

    const defaultUserStore = new UserStore(stores);
    defaultUserStore.storeUser(username, password);
    stores.clientStore = new ClientStore(stores);
    stores.tokenStore = new TokenStore(stores);
    stores.configStore = new ConfigStore(stores, configStoreConfig);
    stores.clientStore.update(clientId, client);
    stores.clientStore.update(clientId2, client2);
    stores.clientStore.update(clientId3, client3);
    app = createApp(appConfig);
    app.set('stores', stores);
    app.set('auth', {default: defaultUserStore, allowAll: new AllowAllUserStore(), denyAll: new DenyAllUserStore()});
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
      .expect(400, done);
  });

  it('should return an error when requesting a token with invalid client credentials', function (done) {
    request(app)
      .post('/oauth/token')
      .auth('invalid', 'invalid')
      .type('form')
      .send({
        grant_type: 'password',
        username: userEncode(null, null),
        password: userEncode(null, null)
      })
      .expect(400, done);
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
        username: userEncode(user.libraryId, user.id),
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

  it('should not return a token when given an invalid password', function (done) {
    request(app)
      .post('/oauth/token')
      .auth(clientId, client.secret)
      .type('form')
      .send({
        grant_type: 'password',
        username: userEncode(user.libraryId, user.id),
        password: 'wrong-password'
      })
      // TODO: This shouldn't be a '400', but the oauth-library is at fault here. Make it return the proper error code..
      .expect(400, done);
  });

  it('should return configuration when queried for it with a token', function(done) {
    request(app)
      .get('/configuration?token=' + bearerToken)
      .expect(function(res) {
        var returnedConfig = JSON.parse(res.text);
        user.agency = user.libraryId;
        user.pin = password;

        var expected = Object.assign(
          {},
          configStoreConfig.libraries[user.libraryId],
          {user: user, app: {clientId: clientId}}
        );
        expected.user.agency = user.libraryId;
        expected.user.pin = password;

        returnedConfig.should.deep.equal(expected);
      })
      .expect(200, done);
  });

  it('should pick auth-backend based on the client id (allow all)', function(done) {
    request(app)
      .post('/oauth/token')
      .auth(clientId2, client2.secret)
      .type('form')
      .send({
        grant_type: 'password',
        username: userEncode(user.libraryId, user.id),
        password: 'wrong-password'
      })
      .expect(function(res) {
        var token = JSON.parse(res.text);
        token.should.have.property('access_token').with.length(40);
        token.should.have.property('expires_in');
        token.token_type.should.equal('bearer');
      })
      .expect(200, done);
  });

  it('should pick auth-backend based on the client id (deny all)', function(done) {
    request(app)
      .post('/oauth/token')
      .auth(clientId3, client3.secret)
      .type('form')
      .send({
        grant_type: 'password',
        username: userEncode(user.libraryId, user.id),
        password: password
      })
      // TODO: This shouldn't be a '400', but the oauth-library is at fault here. Make it return the proper error code..
      .expect(400, done);
  });
});
