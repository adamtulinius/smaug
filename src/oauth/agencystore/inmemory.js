'use strict';

export default class AgencyStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config) {
    this.agencies = (config || {}).agencies || {};
  }

  ping() {
    return Promise.resolve();
  }

  get(agencyId) { // eslint-disable-line no-unused-vars
    var agency = this.agencies[agencyId];

    if (typeof agency === 'undefined') {
      return Promise.reject(new Error('agencyId not found'));
    }
    return Promise.resolve(Object.assign({}, agency, {id: agencyId}));
  }
}
