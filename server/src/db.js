var initSqlJs = require('sql.js');
var fs = require('fs');
var path = require('path');

var db = null;
var SQL = null;
var _dbPath = null;

async function initDB(dbPath) {
  var dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    var buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname      TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      title       TEXT NOT NULL,
      cover_color TEXT NOT NULL DEFAULT '#8b5a2b',
      cover       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id)');
  db.run(`
    CREATE TABLE IF NOT EXISTS book_data (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id),
      data_key    TEXT NOT NULL,
      data_value  TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(book_id, data_key)
    )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_book_data_book ON book_data(book_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_book_data_user ON book_data(user_id)');

  saveDB(dbPath);
  _dbPath = dbPath;
  return db;
}

function saveDB(p) {
  var dbPath = p || _dbPath;
  if (!dbPath) return;
  var data = db.export();
  var buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

// 工具函数：查询单行
function queryOne(sql, params) {
  var stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  if (stmt.step()) {
    var row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// 工具函数：查询多行
function queryAll(sql, params) {
  var stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  var rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// 工具函数：执行（INSERT/UPDATE/DELETE）
function execSQL(sql, params) {
  var stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  var result = stmt.step();
  stmt.free();
  return result;
}

// 工具函数：事务
function transaction(fn) {
  db.run('BEGIN');
  try {
    fn();
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

module.exports = { initDB, getDB, saveDB, queryOne, queryAll, execSQL, transaction };
