'use strict';

export default class ClientStore {
  static requiredOptions() {
    return [];
  }

  constructor(config) {
    this.clients = config || {};
  }

  ping() {
    return Promise.resolve();
  }

  get(clientId) { // eslint-disable-line no-unused-vars
    var client = this.clients[clientId];

    if (typeof client === 'undefined') {
      return Promise.reject();
    }

    if (typeof client !== 'object') {
      client = {secret: client};
    }

    return Promise.resolve(client);
  }

  getAndValidate(clientId, clientSecret) {
    return this.get(clientId)
      .then((client) => {
        if (typeof client !== 'undefined' && typeof clientSecret !== 'undefined' && client.secret === clientSecret) {
          return client;
        }
        return Promise.reject();
      });
  }

  store(clientId, client) {
    if (typeof client === 'object') {
      this.clients[clientId] = client;
    }
    else {
      this.clients[clientId] = {secret: client};
    }
    return Promise.resolve();
  }

  delete(clientId) {
    delete this.clients[clientId];
    return Promise.resolve();
  }
}
