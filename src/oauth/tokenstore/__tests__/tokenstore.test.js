'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import moment from 'moment';
import redis from 'redis';
import uuid from 'uuid';

import InmemoryTokenStore from '../inmemory';
import RedisTokenStore from '../redis';
import PostgresTokenStore from '../postgres';

import models from '../../../models';

chai.use(chaiAsPromised);
chai.should();

const pgModels = models();

var backends = {
  inmemory: () => {
    return new InmemoryTokenStore();
  },
  redis: () => {
    return new RedisTokenStore({}, {backend: {redisClient: redis.createClient()}});
  },
  postgres: () => {
    return new PostgresTokenStore({}, {
      backend: {
        models: pgModels
      }
    });
  }
};


Object.keys(backends).forEach((backendName) => {
  describe(backendName + ' TokenStore', () => {
    var chance = new Chance();
    var tokenStore = null;
    var token = chance.string();
    var clientId = uuid.v4();
    var expires = moment().add(1, 'days');
    var user = {id: chance.string()};

    before(done => {
      if (backendName === 'postgres') {
        pgModels.clients.create({
          id: clientId,
          secret: 'very secret',
          name: 'a very testy app.',
          contact: {name: 'a', email: 'b', phone: 'c'},
          config: {}
        })
          .then(() => done())
          .catch(done);
      }
      else {
        done();
      }
    });

    it('should initialize', function () {
      tokenStore = new backends[backendName]({});
      return tokenStore.ping().should.be.fulfilled;
    });

    describe('tokens', function () {
      it('should fail to retrieve an unknown access token', function () {
        return tokenStore.getAccessToken(uuid.v4()).should.be.rejected;
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

      it('should be possible to revoke a token.', (done) => {
        return tokenStore.revokeToken(token)
          .then(() => tokenStore.getAccessToken(token))
          .catch(err => {
            err.message.should.equal('bearerToken not found');
            done();
          });
      });
    });
  });
});
