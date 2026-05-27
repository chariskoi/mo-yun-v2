var express = require('express');
var crypto = require('crypto');
var { queryOne, queryAll, execSQL, saveDB } = require('../db');
var authMiddleware = require('../middleware/auth');

var router = express.Router();
router.use(authMiddleware);

function gid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// GET /api/books
router.get('/', function(req, res) {
  var books = queryAll(
    'SELECT id, title, cover_color, cover, created_at, updated_at FROM books WHERE user_id = ? ORDER BY created_at',
    [req.userId]);
  res.json({ books });
});

// POST /api/books
router.post('/', function(req, res) {
  var title = (req.body.title || '').trim();
  var coverColor = req.body.coverColor || '#8b5a2b';
  if (!title) return res.status(400).json({ error: '书名不能为空' });

  var id = gid();
  execSQL('INSERT INTO books (id, user_id, title, cover_color) VALUES (?, ?, ?, ?)',
    [id, req.userId, title, coverColor]);
  saveDB();
  res.status(201).json({ book: { id, title, cover_color: coverColor, cover: null } });
});

// PUT /api/books/:id
router.put('/:id', function(req, res) {
  var book = queryOne('SELECT id FROM books WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!book) return res.status(404).json({ error: '书籍不存在' });

  var sets = [];
  var params = [];
  if (req.body.title !== undefined) { sets.push('title = ?'); params.push(req.body.title); }
  if (req.body.coverColor !== undefined) { sets.push('cover_color = ?'); params.push(req.body.coverColor); }
  if (req.body.cover !== undefined) { sets.push('cover = ?'); params.push(req.body.cover); }
  if (sets.length === 0) return res.status(400).json({ error: '没有需要更新的字段' });

  sets.push("updated_at = datetime('now')");
  params.push(req.params.id, req.userId);
  execSQL('UPDATE books SET ' + sets.join(', ') + ' WHERE id = ? AND user_id = ?', params);
  saveDB();

  var updated = queryOne('SELECT id, title, cover_color, cover, created_at, updated_at FROM books WHERE id = ?', [req.params.id]);
  res.json({ book: updated });
});

// DELETE /api/books/:id
router.delete('/:id', function(req, res) {
  var book = queryOne('SELECT id FROM books WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!book) return res.status(404).json({ error: '书籍不存在' });

  execSQL('DELETE FROM book_data WHERE book_id = ? AND user_id = ?', [req.params.id, req.userId]);
  execSQL('DELETE FROM books WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
