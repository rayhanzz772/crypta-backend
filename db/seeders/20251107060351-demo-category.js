'use strict';
const cuid = require('cuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    
    await queryInterface.sequelize.query(`
  INSERT INTO categories (id, name, created_at, updated_at)
  VALUES 
    ('${cuid()}', 'Work', NOW(), NOW()),
    ('${cuid()}', 'Finance', NOW(), NOW()),
    ('${cuid()}', 'Game', NOW(), NOW()),
    ('${cuid()}', 'Social', NOW(), NOW()),
    ('${cuid()}', 'Personal', NOW(), NOW()),
    ('${cuid()}', 'Medical', NOW(), NOW()),
    ('${cuid()}', 'Ideas', NOW(), NOW()),
    ('${cuid()}', 'Other', NOW(), NOW())
  ON CONFLICT (name) DO NOTHING;
`);
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.bulkDelete('categories', null, {});
  }
};
