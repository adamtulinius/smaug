'use strict';

import {randomBytes} from 'crypto';

module.exports = function(sequelize, DataTypes) {
  var clients = sequelize.define('clients', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    secret: {
      type: DataTypes.TEXT,
      defaultValue: () => randomBytes(32).toString('hex')
    },
    name: DataTypes.TEXT,
    config: DataTypes.JSONB,
    contact: DataTypes.JSONB,
    auth: DataTypes.TEXT,
  });
  return clients;
};
