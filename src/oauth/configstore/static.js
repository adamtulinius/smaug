'use strict';

export default class ConfigurationStore {
  static requiredOptions() {
    return [];
  }

  constructor(config) {
    this.config = config || {};
  }

  ping() {
    return Promise.resolve();
  }

  get(token) { // eslint-disable-line no-unused-vars
    return Promise.resolve(this.config);
  }
}
