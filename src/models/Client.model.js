/**
 * @file: This file implements the sequelize model for the postgres storage of clients.
 */

import Sequelize from 'sequelize';

export default function ClientModel(sequelize) {
  return sequelize.define('client', {
    id: {
      type: Sequelize.TEXT,
      allowNull: false,
      primaryKey: true
    },
    secret: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    name: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    config: {
      type: Sequelize.JSONB,
      allowNull: false
    },
    contact: {
      type: Sequelize.JSONB,
      allowNull: false
    }
  }, {
    indexes: [{
      unique: true,
      fields: ['id']
    }]
  });
}
