'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import request from 'supertest';
import {createAdminApp, filterClient, clientWithId} from '../expressapp';
import ClientStore from '../oauth/clientstore/inmemory';

chai.use(chaiAsPromised);
chai.should();

function validateClient(client) {
  ['id', 'name'].forEach((property) => {
    client.should.have.property(property);
  });
}

describe('admin app', function () {
  var app = null;
  var chance = null;
  var appConfig = null;
  var username = null;
  var password = null;
  var clientId = null;
  var clientSecret = null;
  var client = null;

  before(function () {
    chance = new Chance();
    username = chance.word({length: 10});
    password = chance.string();
    client = {name: 'a-client', config: {}, contact: {owner: {name: '', phone: '', email: ''}}};

    appConfig = {
      admin: {
        users: {}
      }
    };

    appConfig.admin.users[username] = password;

    var stores = {};
    stores.clientStore = new ClientStore(stores, {
      clients: {
        'c0ba685e-2130-4e24-b4e9-4a903fe71ada': {
          name: 'duckDevLTD',
          secret: 'duck'
        }
      }
    });

    app = createAdminApp(appConfig);
    app.set('stores', stores);
  });

  describe('auth', function() {
    it('should respond with 200 on homepage without credentials', function (done) {
      request(app)
        .get('/')
        .expect(200, done);
    });

    it('should respond with 401 on other pages without credentials', function (done) {
      request(app)
        .get('/foo')
        .expect(401, done);
    });

    it('should respond with 401 with wrong username', function (done) {
      request(app)
        .get('/clients')
        .auth(username + 'foo', password)
        .expect(401, done);
    });

    it('should respond with 401 with wrong password', function (done) {
      request(app)
        .get('/clients')
        .auth(username, password + 'foo')
        .expect(401, done);
    });

    it('should respond with 200 with correct credentials', function (done) {
      request(app)
        .get('/clients')
        .auth(username, password)
        .expect(200, done);
    });
  });

  describe('clients', function() {
    it('should create a client', function(done) {
      request(app)
        .post('/clients')
        .auth(username, password)
        .type('json')
        .send(JSON.stringify(client))
        .expect((res) => {
          clientId = res.body.id;
          clientSecret = res.body.secret;
          res.body.should.deep.equal(Object.assign({}, client, {id: clientId, secret: clientSecret}));
        })
        .expect(200, done);
    });

    it('should update a client', function(done) {
      client.name = 'an updated client';
      request(app)
        .put('/clients/' + clientId)
        .auth(username, password)
        .type('json')
        .send(JSON.stringify(client))
        .expect((res) => {
          res.body.should.deep.equal(clientWithId(filterClient(client), clientId));
        })
        .expect(200, done);
    });

    it('should retrieve a client', function(done) {
      request(app)
        .get('/clients/' + clientId)
        .auth(username, password)
        .expect((res) => {
          res.body.should.have.property('id', clientId);
          res.body.should.have.property('name', client.name);
          res.body.should.deep.equal(clientWithId(filterClient(client), clientId));
        })
        .expect(200, done);
    });

    it('should delete a client', function(done) {
      request(app)
        .delete('/clients/' + clientId)
        .auth(username, password)
        .expect(200, done);
    });

    it('should list all clients', function(done) {
      request(app)
        .get('/clients')
        .auth(username, password)
        .expect((res) => {
          res.body.should.have.lengthOf(1);
          res.body.forEach((returnedClient) => {
            validateClient(returnedClient);
          });
        })
        .expect(200, done);
    });
  });
});
