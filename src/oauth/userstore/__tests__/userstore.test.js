'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import InmemoryUserStore from '../inmemory';
import AllowAllUserStore from '../allow-all';
import {userEncode} from '../../../utils';

chai.use(chaiAsPromised);
chai.should();

var backends = {
  inmemory: () => {
    return new InmemoryUserStore();
  },
  allowAll: () => {
    return new AllowAllUserStore()
  }
};

Object.keys(backends).forEach((backendName) => {
  describe(backendName + ' UserStore', () => {
    var chance = new Chance();
    var userStore = null;
    var username = null;
    var anonymousUsername = null;
    var password = null;

    before(function () {
      var libraryId = chance.word({length: 6});
      var userId = chance.word({length: 10});
      username = userEncode(libraryId, userId);
      anonymousUsername = userEncode(libraryId, null);
      password = chance.word({length: 10});
    });

    it('should initialize', function () {
      userStore = backends[backendName]({});
      return userStore.ping().should.be.fulfilled;
    });

    it('should store an user', function () {
      return userStore.storeUser(username, password).should.be.fulfilled;
    });

    it('should store an anonymous user', function () {
      return userStore.storeUser(anonymousUsername, password).should.be.fulfilled;
    });

    it('should retrieve an user', function () {
      return userStore.getUser(username, password).should.eventually.deep.equal({id: username});
    });

    it('should retrieve an anonymous user', function () {
      return userStore.getUser(anonymousUsername, anonymousUsername).should.eventually.deep.equal({id: anonymousUsername});
    });
  });
});
