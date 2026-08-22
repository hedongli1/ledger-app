<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="brand">
        <span class="brand-mark">¥</span>
        <span class="brand-text">记账本<em>Ledger</em></span>
      </div>
      <h1 class="login-title">{{ isLogin ? '登录' : '注册' }}</h1>
      <p class="login-sub">{{ isLogin ? '欢迎回来，继续记录你的每一笔' : '创建账号，开始记账' }}</p>

      <p class="err-msg" v-if="error">{{ error }}</p>

      <div class="form-row">
        <div class="field-full">
          <label class="f">用户名</label>
          <input v-model="username" placeholder="至少 3 位" autocomplete="username" />
        </div>
        <div class="field-full">
          <label class="f">密码</label>
          <input v-model="password" type="password" placeholder="至少 6 位" autocomplete="current-password" @keyup.enter="submit" />
        </div>
      </div>

      <button class="btn btn-primary btn-block" :disabled="loading" @click="submit">
        {{ loading ? '请稍候…' : (isLogin ? '登 录' : '注 册') }}
      </button>

      <p class="switch-line">
        {{ isLogin ? '还没有账号？' : '已有账号？' }}
        <a @click="isLogin = !isLogin; error = ''">{{ isLogin ? '去注册' : '去登录' }}</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setToken } from '../api.js';

const router = useRouter();
const isLogin = ref(true);
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const data = isLogin.value
      ? await api.login(username.value.trim(), password.value)
      : await api.register(username.value.trim(), password.value);
    setToken(data.token);
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>