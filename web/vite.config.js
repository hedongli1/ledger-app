import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // 按需分包：echarts / vue 各自独立 chunk，首屏更快
        manualChunks: { echarts: ['echarts'], vue: ['vue', 'vue-router'] },
      },
    },
  },
});