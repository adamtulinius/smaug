'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import UserStore from '../deny-all';
import {userEncode} from '../../../utils';

chai.use(chaiAsPromised);
chai.should();

describe('deny-all', function () {
  var chance = new Chance();
  var userStore = null;
  var username = null;
  var password = null;

  before(function () {
    userStore = new UserStore();
    var libraryId = chance.word({length: 6});
    var userId = chance.word({length: 10});
    username = userEncode(libraryId, userId);
    password = chance.word({length: 10});
  });

  it('should respond to ping', function () {
    return userStore.ping().should.be.fulfilled;
  });

  it('should store an user', function () {
    return userStore.storeUser(username, password).should.be.fulfilled;
  });

  it('should fail to retrieve the newly stored user', function () {
    return userStore.getUser(username, password).should.eventually.deep.equal(false);
  });
});
