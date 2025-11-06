'use strict';
const cuid = require('cuid');
const { hashPassword } = require('../../src/utils/bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword1 = hashPassword('Password123!');
    
    await queryInterface.bulkInsert('users', [
      {
        id: cuid(),
        email: 'ray@gmail.com',
        master_hash: hashedPassword1,
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.bulkDelete('users', null, {});
  }
};
