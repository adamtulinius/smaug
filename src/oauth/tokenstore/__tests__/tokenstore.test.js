'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import moment from 'moment';
import redis from 'redis';

import Sequelize from 'sequelize';

import InmemoryTokenStore from '../inmemory';
import RedisTokenStore from '../redis';
import PostgresTokenStore from '../postgres';

import {log} from '../../../utils';
import PostgresModels from '../../../models';

const sequelize = new Sequelize('postgres://postgres@localhost:5432/smaug_test', {logging: log.info});
const models = PostgresModels(sequelize, false);

chai.use(chaiAsPromised);
chai.should();

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
        sequelize,
        models
      }
    });
  }
};


Object.keys(backends).forEach((backendName) => {
  describe(backendName + ' TokenStore', () => {
    var chance = new Chance();
    var tokenStore = null;
    var token = chance.string();
    var clientId = chance.string();
    var expires = moment().add(1, 'days');
    var user = {id: chance.string()};

    before(done => {
      if (backendName === 'postgres') {
        models.Client.create({
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
