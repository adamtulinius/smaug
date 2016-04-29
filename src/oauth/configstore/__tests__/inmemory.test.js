'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import ConfigStore from '../inmemory';
import {userDecode} from '../../../utils';

chai.use(chaiAsPromised);
chai.should();

describe('inmemory ConfigStore', function () {
  var config = {
    default: {foo: 'default'},
    clients: {
      appDevLTD: {foo: 'appDevLTD'}
    },
    libraries: {
      '000000': {foo: '000000'}
    },
    users: {
      'donald@000000': {foo: 'donald@000000'}
    }
  };

  var stores = {};

  before(function () {
    stores.configStore = new ConfigStore(stores, config);
  });

  it('should retrieve the default configuration', function () {
    return stores.configStore.get(userDecode('anUser@aLibrary'), {id: 'aClient'}).should.eventually.deep.equal(config.default);
  });

  it('should retrieve the client-specific configuration', function () {
    return stores.configStore.get(userDecode('anUser@aLibrary'), {id: 'appDevLTD'}).should.eventually.deep.equal(config.clients.appDevLTD);
  });

  it('should retrieve the library-specific configuration', function () {
    return stores.configStore.get(userDecode('anUser@000000'), {id: 'appDevLTD'}).should.eventually.deep.equal(config.libraries['000000']);
  });

  it('should retrieve the user-specific configuration', function () {
    return stores.configStore.get(userDecode('donald@000000'), {id: 'appDevLTD'}).should.eventually.deep.equal(config.users['donald@000000']);
  });
});
