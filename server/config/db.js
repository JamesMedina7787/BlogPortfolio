const Sequelize = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
    host: 'localhost',
    port: '5432',
    dialect: 'postgres'
})

// connect all the models/tables in database to a db object
// so everything is accessible via one object
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

module.exports = db;