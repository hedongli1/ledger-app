// 端到端接口测试：node --test（零额外依赖，用内置 fetch 直连真实服务）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { resetDb } from '../src/db.js';

let server;
let base;

before(async () => {
  resetDb(); // 清空用户与账单，保证测试可重复运行
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

let token;

async function post(path, body, tok) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(tok ? { authorization: `Bearer ${tok}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
}

async function get(path, tok) {
  return fetch(`${base}${path}`, {
    headers: tok ? { authorization: `Bearer ${tok}` } : {},
  });
}

test('健康检查', async () => {
  const res = await get('/health');
  assert.equal(res.status, 200);
});

test('注册新用户', async () => {
  const res = await post('/auth/register', { username: 'tester', password: 'secret123' });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.username, 'tester');
});

test('重复注册返回 409', async () => {
  const res = await post('/auth/register', { username: 'tester', password: 'secret123' });
  assert.equal(res.status, 409);
});

test('密码过短被拒绝', async () => {
  const res = await post('/auth/register', { username: 'nobody', password: '123' });
  assert.equal(res.status, 400);
});

test('登录成功拿到 token', async () => {
  const res = await post('/auth/login', { username: 'tester', password: 'secret123' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  token = data.token;
});

test('密码错误登录失败', async () => {
  const res = await post('/auth/login', { username: 'tester', password: 'wrong-pass' });
  assert.equal(res.status, 401);
});

test('未登录访问记账接口返回 401', async () => {
  const res = await get('/transactions');
  assert.equal(res.status, 401);
});

test('记一笔支出', async () => {
  const res = await post(
    '/transactions',
    { type: 'expense', amount: 25.5, category: '餐饮', date: '2026-08-22', note: '午饭' },
    token
  );
  assert.equal(res.status, 201);
  const tx = await res.json();
  assert.equal(tx.category, '餐饮');
  assert.ok(tx.id);
});

test('记一笔收入，月度汇总正确', async () => {
  await post(
    '/transactions',
    { type: 'income', amount: 10000, category: '工资', date: '2026-08-10' },
    token
  );
  const res = await get('/stats/summary?month=2026-08', token);
  const s = await res.json();
  assert.equal(s.income, 10000);
  assert.equal(s.expense, 25.5);
  assert.equal(s.balance, 9974.5);
});

test('非法金额被拒绝', async () => {
  const res = await post(
    '/transactions',
    { type: 'expense', amount: 0, category: '餐饮', date: '2026-08-22' },
    token
  );
  assert.equal(res.status, 400);
});

test('趋势统计返回近 6 个月', async () => {
  const res = await get('/stats/trend?months=6', token);
  const data = await res.json();
  assert.equal(data.months.length, 6);
  assert.equal(data.months[5].expense, 25.5);
});

test('分类占比统计', async () => {
  const res = await get('/stats/categories?month=2026-08&type=expense', token);
  const data = await res.json();
  assert.equal(data.items[0].category, '餐饮');
});

test('更新账单', async () => {
  const list = await (await get('/transactions?month=2026-08', token)).json();
  const id = list.items.find((i) => i.category === '餐饮').id;
  const res = await fetch(`${base}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: 30, note: '午饭（更新后）' }),
  });
  assert.equal(res.status, 200);
  const tx = await res.json();
  assert.equal(tx.amount, 30);
});

test('删除账单', async () => {
  const list = await (await get('/transactions', token)).json();
  const id = list.items[0].id;
  const res = await fetch(`${base}/transactions/${id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
});

test('删除不存在的账单返回 404', async () => {
  const res = await fetch(`${base}/transactions/999999`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 404);
});