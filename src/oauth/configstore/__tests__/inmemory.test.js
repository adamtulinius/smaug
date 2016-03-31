'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import ConfigStore from '../inmemory';
import TokenStore from '../../tokenstore/inmemory';

chai.use(chaiAsPromised);
chai.should();

describe('inmemory ConfigStore', function () {
  var chance = new Chance();
  var configStore = null;
  var config = {foo: 'bar'};
  var token = chance.word({length: 10});
  var tokenStore = null;

  before(function () {
    tokenStore = new TokenStore({
      tokens: {
        qwerty: {
          userId: 'donald',
          clientId: 'donaldPhone',
          expires: '2020-01-01T00:00:00Z'
        }
      }
    });
    configStore = new ConfigStore(tokenStore, config);
  });

  it('should retrieve the configuration', function () {
    return configStore.get(token).should.eventually.deep.equal(config);
  });
});
