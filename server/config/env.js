const env = {
    PORT: process.env.PORT || 3000,
    DB_NAME: process.env.DB_NAME || 'heregram',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASS: process.env.DB_PASS || 'lilfluffy22',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_DIALECT: process.env.DB_DIALECT || 'localhost'
}

const tableName = 'sqz'
const dialect = 'postgres'
const pw = 'lilfluffy22'
const port = '5432'
const localHost = 'localhost'

module.exports = {
  tableName,
  dialect,
  pw,
  port,
  localHost
}


module.exports = env;
