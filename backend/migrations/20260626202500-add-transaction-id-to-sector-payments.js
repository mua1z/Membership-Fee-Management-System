'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sector_payments', 'transactionId', {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: 'bankName'
    });
    await queryInterface.changeColumn('sector_payments', 'receiptFile', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sector_payments', 'transactionId');
    await queryInterface.changeColumn('sector_payments', 'receiptFile', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
  }
};
