'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import lodash from 'lodash';
import ConfigStore from '../dbc';
import InmemoryAgencyStore from '../../agencystore/inmemory';
import InmemoryClientStore from '../../clientstore/inmemory';
import {userDecode} from '../../../utils';

chai.use(chaiAsPromised);
chai.should();

var expectedSearchBlock = {
  search: {
    agency: '190101',
    collectionidentifiers: '',
    profile: 'default'
  }
};

describe('dbc ConfigStore', function () {
  var config = {
    default: {
      foo: 'default',
      bar: {10: 5, 5: 2.5}
    },
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

  var stores = {
  };

  stores.agencyStore = new InmemoryAgencyStore(stores, {
    agencies: {
      aLibrary: {},
      '000000': {}
    }
  });
  stores.clientStore = new InmemoryClientStore(stores, {
    clients: {
      appDevLTD: {search: {agency: '190101', profile: 'default', collectionidentifiers: ''}},
      aClient: {search: {agency: '190101', profile: 'default', collectionidentifiers: ''}}
    }
  });

  before(function () {
    stores.configStore = new ConfigStore(stores, config);
  });

  it('should retrieve the default configuration', function () {
    var user = userDecode('anUser@aLibrary');
    var expected = lodash.cloneDeep(config.default);
    Object.assign(expected, expectedSearchBlock);
    return stores.configStore.get(user, {id: 'aClient'}).should.eventually.deep.equal(expected);
  });


  it('should retrieve the client-specific configuration', function () {
    var user = userDecode('anUser@aLibrary');
    var expected = Object.assign({}, config.clients.appDevLTD, expectedSearchBlock);
    return stores.configStore.get(user, {id: 'appDevLTD'}).should.eventually.deep.equal(expected);
  });

  it('should retrieve the library-specific configuration', function () {
    var user = userDecode('anUser@000000');
    var expected = Object.assign({}, config.libraries['000000'], expectedSearchBlock);
    return stores.configStore.get(user, {id: 'appDevLTD'}).should.eventually.deep.equal(expected);
  });

  it('should retrieve the user-specific configuration', function () {
    var user = userDecode('donald@000000');
    var expected = Object.assign({}, config.users['donald@000000'], expectedSearchBlock);
    return stores.configStore.get(user, {id: 'appDevLTD'}).should.eventually.deep.equal(expected);
  });
});
