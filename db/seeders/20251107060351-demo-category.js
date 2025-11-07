'use strict';
const cuid = require('cuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    
    await queryInterface.bulkInsert('users', [
      {
        id: cuid(),
        name: 'Work',
        created_at: new Date(),
        updated_at: new Date(),
      },
            {
        id: cuid(),
        name: 'Finance',
        created_at: new Date(),
        updated_at: new Date(),
      },
            {
        id: cuid(),
        name: 'Game',
        created_at: new Date(),
        updated_at: new Date(),
      },
            {
        id: cuid(),
        name: 'Social',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.bulkDelete('users', null, {});
  }
};
