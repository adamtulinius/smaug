'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import InmemoryUserStore from '../inmemory';

chai.use(chaiAsPromised);
chai.should();

var backends = {
  inmemory: () => {
    return new InmemoryUserStore();
  }
};

Object.keys(backends).forEach((backendName) => {
  describe(backendName + ' UserStore', () => {
    var chance = new Chance();
    var userStore = null;
    var username = null;
    var password = null;

    before(function () {
      username = 'DK-' + chance.word({length: 6}) + '$' + chance.word({length: 10});
      password = chance.word({length: 10});
    });

    it('should initialize', function () {
      userStore = backends[backendName]();
      return userStore.ping().should.be.fulfilled;
    });

    it('should store an user', function () {
      return userStore.storeUser(username, password).should.be.fulfilled;
    });

    it('should retrieve an user', function () {
      return userStore.getUser(username, password).should.eventually.deep.equal({id: username});
    });
  });
});
