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

  var tokens = {
    tMatchNone: {
      userId: 'anUser@aLibrary',
      clientId: 'aClient',
      expires: '2020-01-01T00:00:00Z'
    },
    tMatchClient: {
      userId: 'anUser@aLibrary',
      clientId: 'appDevLTD',
      expires: '2020-01-01T00:00:00Z'
    },
    tMatchLibrary: {
      userId: 'anUser@000000',
      clientId: 'appDevLTD',
      expires: '2020-01-01T00:00:00Z'
    },
    tMatchUser: {
      userId: 'donald@000000',
      clientId: 'appDevLTD',
      expires: '2020-01-01T00:00:00Z'
    }
  };

  var tokenStore = null;

  before(function () {
    tokenStore = new TokenStore({tokens: tokens});
    configStore = new ConfigStore(tokenStore, config);
  });

  it('should retrieve the default configuration', function () {
    return configStore.get('tMatchNone').should.eventually.deep.equal(config.default);
  });

  it('should retrieve the client-specific configuration', function () {
    return configStore.get('tMatchClient').should.eventually.deep.equal(config.clients.appDevLTD);
  });

  it('should retrieve the library-specific configuration', function () {
    return configStore.get('tMatchLibrary').should.eventually.deep.equal(config.libraries['000000']);
  });

  it('should retrieve the user-specific configuration', function () {
    return configStore.get('tMatchUser').should.eventually.deep.equal(config.users['donald@000000']);
  });
});
