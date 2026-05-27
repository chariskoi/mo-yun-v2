/* ===== PostgreSQL 数据库 ===== */
var { Pool } = require('pg');
var config = require('./config');

var pool = null;

async function initDB() {
  pool = new Pool({ connectionString: config.databaseUrl });
  // 测试连接
  var client = await pool.connect();
  client.release();

  // 建表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname      TEXT NOT NULL DEFAULT '',
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      title       TEXT NOT NULL,
      cover_color TEXT NOT NULL DEFAULT '#8b5a2b',
      cover       TEXT,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS book_data (
      id          SERIAL PRIMARY KEY,
      book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id),
      data_key    TEXT NOT NULL,
      data_value  TEXT NOT NULL,
      updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, data_key)
    )`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_book_data_book ON book_data(book_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_book_data_user ON book_data(user_id)');
}

function queryOne(sql, params) {
  return pool.query(sql, params).then(function(r) { return r.rows[0] || null; });
}

function queryAll(sql, params) {
  return pool.query(sql, params).then(function(r) { return r.rows; });
}

function execSQL(sql, params) {
  return pool.query(sql, params).then(function() { return true; });
}

async function transaction(fn) {
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { initDB, queryOne, queryAll, execSQL, transaction };
