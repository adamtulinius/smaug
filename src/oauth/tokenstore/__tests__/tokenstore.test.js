'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import moment from 'moment';
import InmemoryTokenStore from '../inmemory';
import RedisTokenStore from '../redis';
import ClientStore from '../../clientstore/inmemory';

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
    var clientStore = null;
    var token = chance.string();
    var clientId = chance.string();
    var clientSecret = chance.string();
    var expires = moment().add(1, 'days');
    var user = {id: chance.string()};

    it('should initialize', function () {
      clientStore = new ClientStore();
      clientStore.store(clientId, clientSecret);
      tokenStore = new backends[backendName](clientStore);
      return tokenStore.ping().should.be.fulfilled;
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
