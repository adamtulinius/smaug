'use strict';
module.exports = function(sequelize, DataTypes) {
  var clients = sequelize.define('clients', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    secret: DataTypes.TEXT,
    name: DataTypes.TEXT,
    config: DataTypes.JSONB,
    contact: DataTypes.JSONB
  });
  return clients;
};
