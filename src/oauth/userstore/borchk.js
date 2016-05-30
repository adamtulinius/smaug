'use strict';

import {log, userDecode} from '../../utils';
import BorchkServiceClient from 'dbc-node-borchk';

export default class UserStore {
  static requiredOptions() {
    return ['wsdl', 'serviceRequester'];
  }

  constructor(stores, config = {}) {
    this.config = config;

    this.borchkClient = new BorchkServiceClient({
      wsdl: this.config.wsdl,
      serviceRequester: this.config.serviceRequester
    });
    log.info('initialized Borchk client', this.config);
  }

  ping() {
    // TODO: Do something meaningful here
    return Promise.resolve();
  }

  getUser (username, password) {
    log.info('borchk.getUser', {user: username});

    var user = userDecode(username);
    var defaultBorchkUser = 0;

    const borchkRequest = {
      userId: user.id || defaultBorchkUser,
      userPincode: password,
      libraryCode: 'DK-' + user.libraryId
    };

    return this.borchkClient.getBorrowerCheckResult(borchkRequest)
      .then((reply) => {
        const actualUserAuthenticated = reply.requestStatus === 'ok';
        const imaginaryUserAuthenticated =
          (reply.requestStatus === 'borrower_not_found' || reply.requestStatus === 'borrowercheck_not_allowed')
          && typeof user.id === 'undefined' && typeof username === 'string' && username === password;
        const isAuthenticated = actualUserAuthenticated || imaginaryUserAuthenticated;
        log.info('borchk.getUser', {user: username, authenticated: isAuthenticated});
        return isAuthenticated ? {id: username} : false; // TODO: is username/cpr the right userid?
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }
}
