'use strict';

import {log} from '../../utils';
import BorchkServiceClient from 'dbc-node-borchk';

export default class UserStore {
  constructor(wsdl, serviceRequester, libraryCode) {
    this.config = {};
    this.config.wsdl = wsdl;
    this.config.serviceRequester = serviceRequester;
    this.config.libraryCode = libraryCode;

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

    const borchkRequest = {
      userId: username,
      userPincode: password,
      libraryCode: this.config.libraryCode
    };

    return this.borchkClient.getBorrowerCheckResult(borchkRequest)
      .then((reply) => {
        const isAuthenticated = reply.requestStatus === 'ok';
        log.info('borchk.getUser', {user: username, authenticated: isAuthenticated});
        return isAuthenticated ? {id: username} : false; // TODO: is username/cpr the right userid?
      })
      .catch((err) => {
        return err;
      });
  }
}
