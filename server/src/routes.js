// 业务接口：记账 CRUD + 分类 + 统计（全部需要 JWT）
import { Router } from 'express';
import { db, CATEGORIES } from './db.js';
import { authRequired } from './auth.js';

export const apiRouter = Router();
apiRouter.use(authRequired);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// ---------- 分类 ----------
apiRouter.get('/categories', (req, res) => res.json(CATEGORIES));

// ---------- 记账 CRUD ----------
apiRouter.get('/transactions', (req, res) => {
  const { month, type, category, q } = req.query;
  const conds = ['user_id = ?'];
  const args = [req.user.id];
  if (month && MONTH_RE.test(month)) {
    conds.push('substr(date, 1, 7) = ?');
    args.push(month);
  }
  if (type === 'income' || type === 'expense') {
    conds.push('type = ?');
    args.push(type);
  }
  if (category) {
    conds.push('category = ?');
    args.push(String(category));
  }
  if (q) {
    conds.push('note LIKE ? OR category LIKE ?');
    args.push(`%${q}%`, `%${q}%`);
  }
  const items = db
    .prepare(
      `SELECT * FROM transactions WHERE ${conds.join(' AND ')} ORDER BY date DESC, id DESC LIMIT 500`
    )
    .all(...args);
  res.json({ items });
});

apiRouter.post('/transactions', (req, res) => {
  const { type, amount, category, date, note } = req.body || {};
  if (type !== 'income' && type !== 'expense')
    return res.status(400).json({ error: '类型必须为 income 或 expense' });
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ error: '金额必须大于 0' });
  if (!DATE_RE.test(date || '')) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' });
  const cat = CATEGORIES[type].includes(category) ? category : '其他';

  const info = db
    .prepare(
      'INSERT INTO transactions (user_id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(req.user.id, type, num, cat, date, String(note || ''));
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

apiRouter.put('/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const exist = db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .get(id, req.user.id);
  if (!exist) return res.status(404).json({ error: '账单不存在' });

  const { type, amount, category, date, note } = req.body || {};
  const t = {
    type: type ?? exist.type,
    amount: Number(amount ?? exist.amount),
    category: category ?? exist.category,
    date: date ?? exist.date,
    note: note ?? exist.note,
  };
  if (t.type !== 'income' && t.type !== 'expense')
    return res.status(400).json({ error: '类型必须为 income 或 expense' });
  if (!Number.isFinite(t.amount) || t.amount <= 0)
    return res.status(400).json({ error: '金额必须大于 0' });
  if (!DATE_RE.test(t.date)) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' });

  db.prepare(
    'UPDATE transactions SET type = ?, amount = ?, category = ?, date = ?, note = ? WHERE id = ?'
  ).run(t.type, t.amount, CATEGORIES[t.type].includes(t.category) ? t.category : '其他', t.date, String(t.note), id);
  res.json(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
});

apiRouter.delete('/transactions/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: '账单不存在' });
  res.json({ ok: true });
});

// ---------- 统计 ----------
// 单月汇总：收入 / 支出 / 结余
apiRouter.get('/stats/summary', (req, res) => {
  const month = MONTH_RE.test(req.query.month || '') ? req.query.month : currentMonth();
  const rows = db
    .prepare(
      "SELECT type, SUM(amount) AS total FROM transactions WHERE user_id = ? AND substr(date, 1, 7) = ? GROUP BY type"
    )
    .all(req.user.id, month);
  const income = rows.find((r) => r.type === 'income')?.total ?? 0;
  const expense = rows.find((r) => r.type === 'expense')?.total ?? 0;
  res.json({ month, income, expense, balance: income - expense });
});

// 近 N 月收支趋势
apiRouter.get('/stats/trend', (req, res) => {
  const months = Math.max(3, Math.min(12, Number(req.query.months) || 6));
  const rows = db
    .prepare(
      "SELECT substr(date, 1, 7) AS m, type, SUM(amount) AS total FROM transactions WHERE user_id = ? GROUP BY m, type"
    )
    .all(req.user.id);
  const byMonth = {};
  rows.forEach((r) => {
    byMonth[r.m] ||= {};
    byMonth[r.m][r.type] = r.total;
  });
  const now = new Date();
  const labels = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  res.json({
    months: labels.map((m) => ({ month: m, income: byMonth[m]?.income ?? 0, expense: byMonth[m]?.expense ?? 0 })),
  });
});

// 分类占比（默认支出）
apiRouter.get('/stats/categories', (req, res) => {
  const month = MONTH_RE.test(req.query.month || '') ? req.query.month : currentMonth();
  const type = req.query.type === 'income' ? 'income' : 'expense';
  const items = db
    .prepare(
      "SELECT category, SUM(amount) AS total FROM transactions WHERE user_id = ? AND type = ? AND substr(date, 1, 7) = ? GROUP BY category ORDER BY total DESC"
    )
    .all(req.user.id, type, month);
  res.json({ items });
});