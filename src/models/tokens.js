'use strict';
module.exports = function(sequelize, DataTypes) {
  var tokens = sequelize.define('tokens', {
    id: {
      type: DataTypes.TEXT,
      primaryKey: true
    },
    clientId: DataTypes.UUID,
    userId: DataTypes.TEXT,
    expires: DataTypes.DATE
  }, {
    classMethods: {
      associate: function(models) {
        models.tokens.belongsTo(models.clients);
      }
    }
  });
  return tokens;
};
