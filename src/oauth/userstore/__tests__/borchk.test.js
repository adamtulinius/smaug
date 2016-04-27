'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import UserStore from '../borchk';
import {userEncode} from '../../../utils';

chai.use(chaiAsPromised);
chai.should();

describe('borchk', function () {
  var userStore = null;

  before(function () {
    userStore = new UserStore({}, {
      wsdl: 'https://borchk.addi.dk/2.4/borchk.wsdl',
      serviceRequester: 'bibliotek.dk'
    });
  });

  xit('should succeed with anonymous credentials', function () {
    var username = userEncode(716500, null);
    var password = username;
    var user = userStore.getUser(username, password);

    return Promise.all([
      user.should.eventually.not.equal(false),
      user.should.eventually.have.property('id', username)
    ]);
  });

  it('should fail with anonymous credentials and wrong password', function () {
    var username = userEncode(716500, null);
    var password = 'wrong-password';
    var user = userStore.getUser(username, password);

    return user.should.eventually.equal(false);
  });

  it('should fail with invalid credentials', function () {
    var username = 'invalid-username';
    var password = 'wrong-password';
    var user = userStore.getUser(username, password);
    return user.should.eventually.equal(false);
  });
});
