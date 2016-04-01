'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import {userEncode, userDecode} from '../utils';

chai.use(chaiAsPromised);
chai.should();

describe('utils', function () {
  describe('user', function() {
    var userId = null;
    var libraryId = null;
    var chance = null;

    before(function () {
      chance = new Chance();
      userId = chance.word({length: 10});
      libraryId = chance.word({length: 6});
    });

    it('decode should reverse encode', function () {
      var username = userEncode(libraryId, userId);
      var user = userDecode(username);
      user.id.should.equal(userId);
      user.libraryId.should.equal(libraryId);
    });

    describe('encode', function() {
      it('should be able to create anonymous usernames', function () {
        var username = userEncode(null, null);
        username.should.equal('@');
      });

      it('should be able to create anonymous library-specific usernames', function () {
        var username = userEncode(libraryId, null);
        username.should.equal('@' + libraryId);
      });
    });

    describe('decode', function() {
      it('should be able to decode anonymous library-specific usernames', function () {
        var user = userDecode('@' + libraryId);
        user.should.not.have.property('id');
        user.should.have.property('libraryId', libraryId);
      });
    });
  });
});
