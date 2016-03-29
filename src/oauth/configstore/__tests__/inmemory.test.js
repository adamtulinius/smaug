'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import ConfigStore from '../inmemory';

chai.use(chaiAsPromised);
chai.should();

describe('inmemory ConfigStore', function () {
  var chance = new Chance();
  var configStore = null;
  var config = {foo: 'bar'};
  var token = chance.word({length: 10});

  before(function () {
    configStore = new ConfigStore(config);
  });

  it('should retrieve the configuration', function () {
    return configStore.get(token).should.eventually.deep.equal(config);
  });
});
