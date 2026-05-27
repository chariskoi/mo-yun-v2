var express = require('express');
var { queryOne, queryAll, execSQL, transaction } = require('../db');
var authMiddleware = require('../middleware/auth');

var router = express.Router();
router.use(authMiddleware);

// GET /api/sync/data — 下载用户所有书籍+数据
router.get('/data', async function(req, res) {
  try {
    var books = await queryAll(
      'SELECT id, title, cover_color, cover, created_at, updated_at FROM books WHERE user_id = $1 ORDER BY created_at',
      [req.userId]);

    var allRows = await queryAll('SELECT book_id, data_key, data_value FROM book_data WHERE user_id = $1', [req.userId]);

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
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/sync/data — 上传某本书的全部数据
router.post('/data', async function(req, res) {
  try {
    var bookId = req.body.bookId;
    var data = req.body.data || {};
    if (!bookId) return res.status(400).json({ error: '缺少 bookId' });

    var book = await queryOne('SELECT id FROM books WHERE id = $1 AND user_id = $2', [bookId, req.userId]);
    if (!book) return res.status(404).json({ error: '书籍不存在' });

    await transaction(async function(client) {
      var upsert = function(key, value) {
        return client.query(
          'INSERT INTO book_data (book_id, user_id, data_key, data_value, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT(book_id, data_key) DO UPDATE SET data_value = $4, updated_at = CURRENT_TIMESTAMP',
          [bookId, req.userId, key, value]
        );
      };

      if (data.volumes !== undefined) await upsert('volumes', JSON.stringify(data.volumes));
      if (data.chapters !== undefined) await upsert('chapters', JSON.stringify(data.chapters));
      if (data.active !== undefined) await upsert('active', data.active);

      if (data.world && typeof data.world === 'object') {
        for (var k of Object.keys(data.world)) {
          await upsert('world_' + k, JSON.stringify(data.world[k]));
        }
      }

      if (data.contents && typeof data.contents === 'object') {
        for (var chId of Object.keys(data.contents)) {
          await upsert('content_' + chId, data.contents[chId]);
        }
      }
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/sync/data/:bookId — 删除某本书的所有云端数据
router.delete('/data/:bookId', async function(req, res) {
  try {
    await execSQL('DELETE FROM book_data WHERE book_id = $1 AND user_id = $2', [req.params.bookId, req.userId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
