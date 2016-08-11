/**
 * @file: This file implements the sequelize model for the postgres storage of token.
 */

import Sequelize from 'sequelize';

export default function TokenModel(sequelize, models) {
  const _tokenModel = sequelize.define('token', {
    accessToken: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    userId: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    expires: {
      type: Sequelize.DATE,
      allowNull: false
    }
  }, {
    indexes: [{
      unique: true,
      fields: ['accessToken']
    }]
  });

  // A token belongs to a client.
  _tokenModel.belongsTo(models.Client);

  return _tokenModel;
}
