import { createRouter, createWebHashHistory } from 'vue-router';
import { token } from './api.js';

const routes = [
  { path: '/login', name: 'login', component: () => import('./views/Login.vue') },
  { path: '/', name: 'transactions', component: () => import('./views/Transactions.vue'), meta: { auth: true } },
  { path: '/stats', name: 'stats', component: () => import('./views/Dashboard.vue'), meta: { auth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to) => {
  if (to.meta.auth && !token()) return { name: 'login' };
  if (to.name === 'login' && token()) return { name: 'transactions' };
});

export default router;