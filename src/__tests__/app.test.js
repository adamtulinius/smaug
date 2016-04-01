'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import request from 'supertest';
import createapp from '../expressapp';
import TokenStore from '../oauth/tokenstore/inmemory';
import UserStore from '../oauth/userstore/inmemory';
import ConfigStore from '../oauth/configstore/inmemory';

chai.use(chaiAsPromised);
chai.should();

describe('web app', function () {
  var app = null;
  var chance = null;
  var clientId = null;
  var clientSecret = null;
  var username = null;
  var password = null;
  var config = null;
  var bearerToken = null;

  before(function () {
    chance = new Chance();
    clientId = chance.word({length: 10});
    clientSecret = chance.string();
    username = chance.word({length: 10});
    password = chance.string();
    config = {
      default: {foo: 'default'},
      libraries: {
        '000000': {foo: '000000'}
      }
    };

    var tokenStore = new TokenStore();
    var userStore = new UserStore();
    var configStore = new ConfigStore(tokenStore, config);
    tokenStore.storeClient(clientId, clientSecret);
    userStore.storeUser(username, password);
    app = createapp(tokenStore, userStore, configStore);
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
        client_secret: clientSecret
      })
      .expect(500, done);
  });

  it('should return a token when logging in with password', function (done) {
    request(app)
      .post('/oauth/token')
      .auth(clientId, clientSecret)
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
        returnedConfig.should.deep.equal(config.default);
      })
      .expect(200, done);
  });
});
