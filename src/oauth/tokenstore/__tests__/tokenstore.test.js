'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import moment from 'moment';
import InmemoryTokenStore from '../inmemory';
import RedisTokenStore from '../redis';

chai.use(chaiAsPromised);
chai.should();

var backends = {
  inmemory: () => {
    return new InmemoryTokenStore();
  },
  redis: () => {
    return new RedisTokenStore();
  }
};


Object.keys(backends).forEach((backendName) => {
  describe(backendName + ' TokenStore', () => {
    var chance = new Chance();
    var tokenStore = null;
    var token = chance.string();
    var clientId = chance.string();
    var clientSecret = chance.string();
    var expires = moment().add(1, 'days');
    var user = {id: chance.string()};

    it('should initialize', function () {
      tokenStore = new backends[backendName]();
      return tokenStore.ping().should.be.fulfilled;
    });

    describe('clients', function () {
      it('should fail to retrieve an unknown client', function () {
        return tokenStore.getClient('404', '404secret').should.be.rejected;
      });

      it('should store a client', function () {
        return tokenStore.storeClient(clientId, clientSecret);
      });

      it('should retrieve a client', function () {
        return tokenStore.getClient(clientId, clientSecret).should.eventually.equal(clientSecret);
      });

      it('should fail to retrieve a client with the wrong secret', function () {
        return tokenStore.getClient(clientId, clientSecret + 'foo').should.be.rejected;
      });
    });

    describe('tokens', function () {
      it('should fail to retrieve an unknown access token', function () {
        return tokenStore.getAccessToken('404').should.be.rejected;
      });

      it('should store a token', function () {
        return tokenStore.storeAccessToken(token, clientId, expires.toDate(), user);
      });

      it('should retrieve a token', function () {
        return tokenStore.getAccessToken(token).should.be.fulfilled;
      });

      it('should return a token with field "accessToken"', function () {
        return tokenStore.getAccessToken(token)
          .then((result) => {
            result.accessToken.should.equal(token);
          })
          .catch((error) => {
            throw error;
          });
      });

      it('should return a token with field "clientId"', function () {
        return tokenStore.getAccessToken(token)
          .then((result) => {
            result.clientId.should.equal(clientId);
          })
          .catch((error) => {
            throw error;
          });
      });

      it('should return a token with field "expires"', function () {
        return tokenStore.getAccessToken(token)
          .then((result) => {
            // allow some wiggle-room for the ttl implementation
            var lowerBound = expires.clone().subtract(1, 'minutes');
            var upperBound = expires.clone().add(1, 'minutes');
            result.expires.should.be.within(lowerBound.toDate(), upperBound.toDate());
          })
          .catch((error) => {
            throw error;
          });
      });

      it('should return a token with field "userId"', function () {
        return tokenStore.getAccessToken(token)
          .then((result) => {
            result.userId.should.equal(user.id);
          })
          .catch((error) => {
            throw error;
          });
      });
    });
  });
});
