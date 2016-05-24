'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import lodash from 'lodash';
import ConfigStore from '../dbc';
import {userDecode} from '../../../utils';

chai.use(chaiAsPromised);
chai.should();

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

  var stores = {};

  before(function () {
    stores.configStore = new ConfigStore(stores, config);
  });

  it('should retrieve the default configuration', function () {
    var user = userDecode('anUser@aLibrary');
    var expected = lodash.cloneDeep(config.default);
    expected.bar.agency = user.libraryId;
    expected.agency = {order: user.libraryId, search: user.libraryId};
    return stores.configStore.get(user, {id: 'aClient'}).should.eventually.deep.equal(expected);
  });


  it('should retrieve the client-specific configuration', function () {
    var user = userDecode('anUser@aLibrary');
    var expected = config.clients.appDevLTD;
    expected.agency = {order: user.libraryId, search: user.libraryId, agency: user.libraryId};
    return stores.configStore.get(user, {id: 'appDevLTD'}).should.eventually.deep.equal(expected);
  });

  it('should retrieve the library-specific configuration', function () {
    var user = userDecode('anUser@000000');
    var expected = config.libraries['000000'];
    expected.agency = {order: user.libraryId, search: user.libraryId, agency: user.libraryId};
    return stores.configStore.get(user, {id: 'appDevLTD'}).should.eventually.deep.equal(expected);
  });

  it('should retrieve the user-specific configuration', function () {
    var user = userDecode('donald@000000');
    var expected = config.users['donald@000000'];
    expected.agency = {order: user.libraryId, search: user.libraryId, agency: user.libraryId};
    return stores.configStore.get(user, {id: 'appDevLTD'}).should.eventually.deep.equal(expected);
  });
});
