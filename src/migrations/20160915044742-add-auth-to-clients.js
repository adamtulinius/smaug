'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn('clients', 'auth', {
      type: Sequelize.TEXT,
      allowNull: true

    })
  },

  down: function (queryInterface, Sequelize) { // eslint-disable-line no-unused-vars
    return queryInterface.removeColumn('clients', 'auth');
  }
};
