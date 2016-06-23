'use strict';

import activedirectory from 'activedirectory';
import {log} from '../../utils';

export default class UserStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config = {}) {
    this.ad = new activedirectory(config);
    var configToLog = Object.assign({}, config);
    delete configToLog.password;
    log.info('initialized activedirectory client', configToLog);
  }

  ping() {
    var ad = this.ad;
    return new Promise((resolve, reject) => {
      ad.find('uid=*', (err, results) => { // eslint-disable-line no-unused-vars
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  getUser (username, password) {
    var ad = this.ad;
    return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
      ad.authenticate(username, password, (err, results) => { // eslint-disable-line no-unused-vars
        if (err) {
          return resolve(false);
        }

        return resolve({id: username});
      });
    });
  }
}
