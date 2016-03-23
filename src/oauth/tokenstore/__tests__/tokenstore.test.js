'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';

chai.use(chaiAsPromised);
chai.should();

['inmemory', 'redis'].forEach((tokenStoreName) => {
  describe(tokenStoreName + ' TokenStore', () => {
    var chance = new Chance();
    var tokenStore = null;
    var token = chance.string();
    var clientId = chance.string();
    var clientSecret = chance.string();
    var expires = new Date();
    expires.setDate(expires.getDate() + 1); // expire tomorrow
    var user = {id: chance.string()};

    it('should initialize', function () {
      var TokenStore = require('../' + tokenStoreName);
      tokenStore = new TokenStore();
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
        return tokenStore.storeAccessToken(token, clientId, expires, user);
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
            var lowerBound = new Date(expires);
            var upperBound = new Date(expires);
            lowerBound.setMinutes(lowerBound.getMinutes() - 1);
            upperBound.setMinutes(upperBound.getMinutes() + 1);
            result.expires.should.be.within(lowerBound, upperBound);
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
