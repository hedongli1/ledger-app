<template>
  <div class="shell">
    <header class="topbar" v-if="route.name !== 'login'">
      <div class="brand">
        <span class="brand-mark">¥</span>
        <span class="brand-text">记账本<em>Ledger</em></span>
      </div>
      <nav class="nav">
        <RouterLink to="/" :class="{ on: route.name === 'transactions' }">账单</RouterLink>
        <RouterLink to="/stats" :class="{ on: route.name === 'stats' }">统计</RouterLink>
      </nav>
      <button class="logout" @click="logout">退出</button>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { setToken } from './api.js';

const route = useRoute();
const router = useRouter();

function logout() {
  setToken(null);
  router.push('/login');
}
</script>