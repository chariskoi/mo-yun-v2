var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var config = require('../config');
var { queryOne, execSQL } = require('../db');
var authMiddleware = require('../middleware/auth');

var router = express.Router();

function gid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// POST /api/auth/register
router.post('/register', async function(req, res) {
  try {
    var email = (req.body.email || '').trim().toLowerCase();
    var password = req.body.password || '';
    var nickname = (req.body.nickname || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    var existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    var hash = bcrypt.hashSync(password, 10);
    var id = gid();
    await execSQL('INSERT INTO users (id, email, password_hash, nickname) VALUES ($1, $2, $3, $4)',
      [id, email, hash, nickname]);

    var token = jwt.sign({ userId: id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.status(201).json({ token, user: { id, email, nickname } });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/auth/login
router.post('/login', async function(req, res) {
  try {
    var email = (req.body.email || '').trim().toLowerCase();
    var password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    var user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    var token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async function(req, res) {
  try {
    var user = await queryOne('SELECT id, email, nickname, created_at FROM users WHERE id = $1', [req.userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
