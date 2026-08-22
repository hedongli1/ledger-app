// 统一的 API 请求封装：自动带 JWT，401 时跳登录
const TOKEN_KEY = 'ledger_token';

export const token = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    window.location.hash = '#/login';
    throw new Error('登录已失效，请重新登录');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
  return data;
}

export const api = {
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
  categories: () => request('/categories'),
  listTransactions: (qs = '') => request(`/transactions${qs}`),
  createTransaction: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id, body) =>
    request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  summary: (month) => request(`/stats/summary?month=${month}`),
  trend: (months = 6) => request(`/stats/trend?months=${months}`),
  categoriesStats: (month, type) => request(`/stats/categories?month=${month}&type=${type}`),
};