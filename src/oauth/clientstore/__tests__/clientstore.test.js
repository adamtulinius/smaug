'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import InmemoryClientStore from '../../clientstore/inmemory';

chai.use(chaiAsPromised);
chai.should();

var backends = {
  inmemory: () => {
    return new InmemoryClientStore({});
  }
};


Object.keys(backends).forEach((backendName) => {
  describe(backendName + ' ClientStore', () => {
    var chance = new Chance();
    var clientStore = null;
    var clientId = null;
    var client = {name: 'a-client', secret: chance.string()};

    it('should initialize', function () {
      clientStore = new backends[backendName]();
      return clientStore.ping().should.be.fulfilled;
    });

    it('should fail to retrieve an unknown client', function () {
      return clientStore.get('404').should.be.rejected;
    });

    it('should create a new client', function () {
      return clientStore.create(client)
        .then((returnedClient) => {
          clientId = returnedClient.id;
        })
        .should.be.fulfilled;
    });

    it('should retrieve and validate a client', function () {
      return clientStore.getAndValidate(clientId, client.secret).should.eventually.deep.equal(Object.assign({}, client, {id: clientId}));
    });

    it('should fail to retrieve a client with the wrong secret', function () {
      return clientStore.getAndValidate(clientId, client.secret + 'foo').should.be.rejected;
    });
  });
});
