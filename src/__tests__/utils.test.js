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
  });
});
