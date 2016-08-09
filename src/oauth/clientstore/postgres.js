/**
 * @file: This file implements the postgres backend for the clientstore.
 */

import Sequelize from 'sequelize';
import ClientStore from './inmemory';
import uuid from 'uuid';
import {randomBytes} from 'crypto';
import {log} from '../../utils';
import {isEqual} from 'lodash';
import ClientModel from '../models/Client.model';

export default class PostgresClientStore extends ClientStore {
  static validateClientTypes(client) {
    // Check that the name is a string.
    if (client.name && typeof client.name !== 'string') {
      return Promise.reject('name must be a string.');
    }

    // Check that we get an object
    if (client.config && typeof client.config !== 'object') {
      return Promise.reject('config must be an object');
    }

    // Check that object isn't an array
    if (client.config && Array.isArray(client.config)) {
      return Promise.reject('config must be a plain object.');
    }

    // Check the contents of config.
    if (client.config) {
      const errors = ['agency', 'profile', 'collectionidentifiers']
        .filter(configField => {
          if (client.config[configField] && typeof client.config[configField] !== 'string') {
            return true;
          }

          return false;
        })
        .map(configField => `${configField} must be a string.`);

      if (errors.length > 0) {
        return Promise.reject({errors});
      }
    }

    // Check that the contact contains an owner
    if (client.contact && !Object.keys(client.contact).includes('owner')) {
      return Promise.reject('contact must have an owner!');
    }

    // Check each contact for name, phone, and email.
    if (client.contact) {
      for (const contact in client.contact) {
        if (client.contact.hasOwnProperty(contact) && !isEqual(Object.keys(client.contact[contact]), ['name', 'phone', 'email'])) {
          return Promise.reject('All contacts must contain: name, phone, and email.');
        }
      }
    }

    return Promise.resolve(client);
  }

  constructor(stores, config) {
    super();

    if (!config || !config.db) {
      throw new Error('db field not found in config!');
    }

    this.sequelize = new Sequelize(config.db, {logging: log.info});
    this.clients = ClientModel(this.sequelize);
    this.clients.sync({force: !!config.forceDBSync});
  }

  ping() {
    return this.sequelize.authenticate();
  }

  create(client) {
    return new Promise((resolve, reject) => {
      if (!client) {
        return reject({errors: ['Got no client, please ensure you send all the required details.']});
      }

      const requiredAttributes = ['name', 'config', 'contact'];
      const errors = requiredAttributes.filter(field => !client[field]).map(field => `Missing field: ${field}`);

      if (errors.length > 0) {
        return reject({errors});
      }

      return PostgresClientStore.validateClientTypes(client)
        .then(resolve).catch(reject);
    }).then(() => {
      const clientId = uuid.v4();
      const clientSecret = randomBytes(32).toString('hex');

      return this.clients.create(Object.assign(client, {id: clientId, secret: clientSecret}));
    });
  }

  get(clientId) {
    return this.clients.findByPrimary(clientId).then(client => {
      if (!client) {
        return Promise.reject('ClientId not found');
      }

      return client.get({plain: true});
    });
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
    return this.clients.findAll()
      .then(clients => clients.map(client => client.get({plain: true})));
  }

  update(clientId, client) {
    return new Promise((resolve, reject) => {
      // We need a client id
      if (typeof clientId === 'undefined') {
        return reject('clientId can\'t be undefined');
      }

      // We also need something to update with
      if (typeof client !== 'object' || !client || Array.isArray(client)) {
        return reject('client must be a plain object!');
      }

      // We don't let you update the secret or the client id
      if (client.secret || (client.id && clientId !== client.id)) {
        return reject('You cannot update a client secret or id! Create a new one!');
      }

      // And we also want to run default validations.
      return PostgresClientStore.validateClientTypes(client)
        .then(resolve).catch(reject);
    }).then(() => {
      return this.clients.findByPrimary(clientId);
    }).then(clientInstance => {
      if (!clientInstance) {
        return Promise.reject('Could not find client!');
      }

      return clientInstance.update(client).then(updatedInstance => {
        return updatedInstance.get({plain: true});
      });
    });
  }

  delete(clientId) {
    return this.clients.findByPrimary(clientId).then(clientInstance => {
      if (!clientInstance) {
        return Promise.reject('Could not find client!');
      }

      return clientInstance.destroy();
    });
  }
}
