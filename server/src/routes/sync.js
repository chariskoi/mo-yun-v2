var express = require('express');
var { queryOne, queryAll, execSQL, transaction, saveDB } = require('../db');
var authMiddleware = require('../middleware/auth');

var router = express.Router();
router.use(authMiddleware);

// GET /api/sync/data — 下载用户所有书籍+数据
router.get('/data', function(req, res) {
  var books = queryAll(
    'SELECT id, title, cover_color, cover, created_at, updated_at FROM books WHERE user_id = ? ORDER BY created_at',
    [req.userId]);

  var allRows = queryAll('SELECT book_id, data_key, data_value FROM book_data WHERE user_id = ?', [req.userId]);

  // 按 book_id 分组
  var bookData = {};
  allRows.forEach(function(row) {
    if (!bookData[row.book_id]) bookData[row.book_id] = {};
    bookData[row.book_id][row.data_key] = row.data_value;
  });

  // 重组为前端格式
  var result = {};
  books.forEach(function(b) {
    var bd = bookData[b.id] || {};
    var data = {};

    try { data.volumes  = JSON.parse(bd.volumes || '[]'); } catch(e) { data.volumes = []; }
    try { data.chapters = JSON.parse(bd.chapters || '[]'); } catch(e) { data.chapters = []; }
    data.active = bd.active || null;

    data.world = {};
    ['chars', 'locs', 'sets', 'tl', 'outline', 'canvas'].forEach(function(k) {
      try { data.world[k] = JSON.parse(bd['world_' + k] || '[]'); } catch(e) { data.world[k] = []; }
    });

    data.contents = {};
    Object.keys(bd).forEach(function(k) {
      if (k.startsWith('content_')) data.contents[k.slice(8)] = bd[k];
    });

    result[b.id] = data;
  });

  res.json({ books, bookData: result });
});

// POST /api/sync/data — 上传某本书的全部数据
router.post('/data', function(req, res) {
  var bookId = req.body.bookId;
  var data = req.body.data || {};
  if (!bookId) return res.status(400).json({ error: '缺少 bookId' });

  var book = queryOne('SELECT id FROM books WHERE id = ? AND user_id = ?', [bookId, req.userId]);
  if (!book) return res.status(404).json({ error: '书籍不存在' });

  transaction(function() {
    // 标准字段
    if (data.volumes !== undefined)
      execSQL('INSERT INTO book_data (book_id, user_id, data_key, data_value, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ON CONFLICT(book_id, data_key) DO UPDATE SET data_value = excluded.data_value, updated_at = datetime(\'now\')',
        [bookId, req.userId, 'volumes', JSON.stringify(data.volumes)]);
    if (data.chapters !== undefined)
      execSQL('INSERT INTO book_data (book_id, user_id, data_key, data_value, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ON CONFLICT(book_id, data_key) DO UPDATE SET data_value = excluded.data_value, updated_at = datetime(\'now\')',
        [bookId, req.userId, 'chapters', JSON.stringify(data.chapters)]);
    if (data.active !== undefined)
      execSQL('INSERT INTO book_data (book_id, user_id, data_key, data_value, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ON CONFLICT(book_id, data_key) DO UPDATE SET data_value = excluded.data_value, updated_at = datetime(\'now\')',
        [bookId, req.userId, 'active', data.active]);

    // world 子对象
    if (data.world && typeof data.world === 'object') {
      Object.keys(data.world).forEach(function(k) {
        execSQL('INSERT INTO book_data (book_id, user_id, data_key, data_value, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ON CONFLICT(book_id, data_key) DO UPDATE SET data_value = excluded.data_value, updated_at = datetime(\'now\')',
          [bookId, req.userId, 'world_' + k, JSON.stringify(data.world[k])]);
      });
    }

    // contents
    if (data.contents && typeof data.contents === 'object') {
      Object.keys(data.contents).forEach(function(chId) {
        execSQL('INSERT INTO book_data (book_id, user_id, data_key, data_value, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ON CONFLICT(book_id, data_key) DO UPDATE SET data_value = excluded.data_value, updated_at = datetime(\'now\')',
          [bookId, req.userId, 'content_' + chId, data.contents[chId]]);
      });
    }
  });

  saveDB();
  res.json({ success: true });
});

// DELETE /api/sync/data/:bookId — 删除某本书的所有云端数据
router.delete('/data/:bookId', function(req, res) {
  execSQL('DELETE FROM book_data WHERE book_id = ? AND user_id = ?', [req.params.bookId, req.userId]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
