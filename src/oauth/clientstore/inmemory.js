'use strict';

import uuid from 'uuid';

export default class ClientStore {
  static requiredOptions() {
    return [];
  }

  constructor(stores, config) {
    this.clients = (config || {}).clients || {};
  }

  ping() {
    return Promise.resolve();
  }

  create(client) {
    return this.update(uuid.v4(), client);
  }

  get(clientId) { // eslint-disable-line no-unused-vars
    var client = this.clients[clientId];

    if (typeof client === 'undefined') {
      return Promise.reject();
    }
    return Promise.resolve(Object.assign({}, client, {id: clientId}));
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

  getAll() {
    var clients = Object.keys(this.clients).map((clientId) => {
      return Object.assign({}, this.clients[clientId], {id: clientId});
    });

    return Promise.resolve(clients);
  }

  update(clientId, client) {
    if (typeof clientId === 'undefined') {
      return Promise.reject(new Error('clientId can\'t be undefined'));
    }
    this.clients[clientId] = client;
    return this.get(clientId);
  }

  delete(clientId) {
    delete this.clients[clientId];
    return Promise.resolve();
  }
}
