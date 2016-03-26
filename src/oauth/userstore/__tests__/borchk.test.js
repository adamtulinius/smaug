'use strict';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import UserStore from '../borchk';

chai.use(chaiAsPromised);
chai.should();

describe('borchk', function () {
  var userStore = null;

  before(function () {
    userStore = new UserStore('https://borchk.addi.dk/2.4/borchk.wsdl', 'bibliotek.dk', 'DK-725000');
  });

  // TODO: Figure out how to check that login works
  // it('should succeed with valid credentials', function () {
  //   var username = '';
  //   var password = '';
  //   return userStore.getUser(username, password).should.eventually.have.property('id', username);
  // });

  it('should fail with invalid credentials', function () {
    var username = 'invalid-username';
    var password = 'wrong-password';
    return userStore.getUser(username, password).should.eventually.be.an('error');
  });
});
