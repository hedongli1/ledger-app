// 认证模块：注册 / 登录 / JWT 签发与校验中间件
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const SECRET = process.env.JWT_SECRET || 'ledger-dev-secret-change-me';
const EXPIRES = '7d';

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, SECRET, { expiresIn: EXPIRES });
}

// 需要登录的接口统一走这个中间件
export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: Number(payload.sub), username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: '登录已失效，请重新登录' });
  }
}

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  const name = String(username || '').trim();
  const pass = String(password || '');
  if (!name || !pass) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (name.length < 3 || pass.length < 6)
    return res.status(400).json({ error: '用户名至少 3 位，密码至少 6 位' });
  if (name.length > 24) return res.status(400).json({ error: '用户名最长 24 位' });

  const hash = bcrypt.hashSync(pass, 10);
  try {
    const info = db
      .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
      .run(name, hash);
    const user = db
      .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
      .get(info.lastInsertRowid);
    res.status(201).json({ token: signToken(user), user });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: '用户名已存在' });
    console.error(e);
    res.status(500).json({ error: '注册失败' });
  }
});

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const name = String(username || '');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(name);
  if (!user || !bcrypt.compareSync(String(password || ''), user.password))
    return res.status(401).json({ error: '用户名或密码错误' });
  res.json({ token: signToken(user), user: { id: user.id, username: user.username } });
});

authRouter.get('/me', authRequired, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});