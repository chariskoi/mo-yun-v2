var express = require('express');
var crypto = require('crypto');
var { queryOne, queryAll, execSQL } = require('../db');
var authMiddleware = require('../middleware/auth');

var router = express.Router();
router.use(authMiddleware);

function gid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// GET /api/books
router.get('/', async function(req, res) {
  try {
    var books = await queryAll(
      'SELECT id, title, cover_color, cover, created_at, updated_at FROM books WHERE user_id = $1 ORDER BY created_at',
      [req.userId]);
    res.json({ books });
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

// POST /api/books
router.post('/', async function(req, res) {
  try {
    var title = (req.body.title || '').trim();
    var coverColor = req.body.coverColor || '#8b5a2b';
    if (!title) return res.status(400).json({ error: '书名不能为空' });

    var id = gid();
    await execSQL('INSERT INTO books (id, user_id, title, cover_color) VALUES ($1, $2, $3, $4)',
      [id, req.userId, title, coverColor]);
    res.status(201).json({ book: { id, title, cover_color: coverColor, cover: null } });
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

// PUT /api/books/:id
router.put('/:id', async function(req, res) {
  try {
    var book = await queryOne('SELECT id FROM books WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!book) return res.status(404).json({ error: '书籍不存在' });

    var sets = [];
    var params = [];
    var idx = 1;
    if (req.body.title !== undefined) { sets.push('title = $' + idx++); params.push(req.body.title); }
    if (req.body.coverColor !== undefined) { sets.push('cover_color = $' + idx++); params.push(req.body.coverColor); }
    if (req.body.cover !== undefined) { sets.push('cover = $' + idx++); params.push(req.body.cover); }
    if (sets.length === 0) return res.status(400).json({ error: '没有需要更新的字段' });

    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id, req.userId);
    await execSQL('UPDATE books SET ' + sets.join(', ') + ' WHERE id = $' + idx + ' AND user_id = $' + (idx + 1), params);

    var updated = await queryOne('SELECT id, title, cover_color, cover, created_at, updated_at FROM books WHERE id = $1', [req.params.id]);
    res.json({ book: updated });
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

// DELETE /api/books/:id
router.delete('/:id', async function(req, res) {
  try {
    var book = await queryOne('SELECT id FROM books WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!book) return res.status(404).json({ error: '书籍不存在' });

    await execSQL('DELETE FROM book_data WHERE book_id = $1 AND user_id = $2', [req.params.id, req.userId]);
    await execSQL('DELETE FROM books WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

module.exports = router;
