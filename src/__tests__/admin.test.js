'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import request from 'supertest';
import {createAdminApp} from '../expressapp';

chai.use(chaiAsPromised);
chai.should();

describe('web app', function () {
  var app = null;
  var chance = null;
  var appConfig = null;
  var username = null;
  var password = null;

  before(function () {
    chance = new Chance();
    username = chance.word({length: 10});
    password = chance.string();

    appConfig = {
      admin: {
        users: {}
      }
    };

    appConfig.admin.users[username] = password;

    app = createAdminApp(appConfig);
  });

  it('should respond with 200 on homepage without credentials', function (done) {
    request(app)
      .get('/')
      .expect(200, done);
  });

  it('should respond with 403 on other pages without credentials', function (done) {
    request(app)
      .get('/foo')
      .expect(403, done);
  });

  it('should respond with 403 with wrong username', function (done) {
    request(app)
      .get('/foo')
      .auth(username + 'foo', password)
      .expect(403, done);
  });

  it('should respond with 403 with wrong password', function (done) {
    request(app)
      .get('/foo')
      .auth(username, password + 'foo')
      .expect(403, done);
  });

  it('should respond with 404 with correct credentials', function (done) {
    request(app)
      .get('/foo')
      .auth(username, password)
      .expect(404, done);
  });
});
