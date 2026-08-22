<template>
  <div>
    <h1 class="page-title">统计</h1>
    <p class="page-sub">近 6 个月收支趋势与本月支出构成</p>

    <div class="stat-cards">
      <div class="chip income"><div class="label">本月收入</div><div class="value">¥{{ fmt(summary.income) }}</div></div>
      <div class="chip expense"><div class="label">本月支出</div><div class="value">¥{{ fmt(summary.expense) }}</div></div>
      <div class="chip balance"><div class="label">本月结余</div><div class="value">¥{{ fmt(summary.balance) }}</div></div>
    </div>

    <section class="card chart-card">
      <div class="list-head"><h2>收支趋势（近 6 个月）</h2></div>
      <div ref="trendEl" class="chart-lg"></div>
    </section>

    <section class="card chart-card">
      <div class="list-head"><h2>本月支出构成</h2></div>
      <div ref="pieEl" class="chart"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { api } from '../api.js';

const trendEl = ref(null);
const pieEl = ref(null);
const summary = ref({ income: 0, expense: 0, balance: 0 });
let charts = [];
let onResize;

const PALETTE = ['#f5a623', '#e8b04b', '#c9842a', '#f7c976', '#a06a20', '#d98912', '#ffe3a3', '#8a5a1c'];

onMounted(async () => {
  const month = new Date().toISOString().slice(0, 7);
  summary.value = await api.summary(month);

  const trend = await api.trend(6);
  const cats = await api.categoriesStats(month, 'expense');

  const c1 = echarts.init(trendEl.value);
  c1.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#1a1610', borderColor: '#2c2517', textStyle: { color: '#f6f0e4' } },
    legend: { data: ['收入', '支出'], textStyle: { color: '#b8ac95' }, top: 0 },
    grid: { left: 46, right: 16, top: 38, bottom: 26 },
    xAxis: { type: 'category', data: trend.months.map((m) => m.month), axisLine: { lineStyle: { color: '#2c2517' } }, axisLabel: { color: '#7d7262' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(44,37,23,.6)' } }, axisLabel: { color: '#7d7262' } },
    series: [
      { name: '收入', type: 'line', smooth: true, data: trend.months.map((m) => m.income), itemStyle: { color: '#35d17a' }, lineStyle: { color: '#35d17a', width: 2 }, areaStyle: { color: 'rgba(53,209,122,.08)' } },
      { name: '支出', type: 'line', smooth: true, data: trend.months.map((m) => m.expense), itemStyle: { color: '#f5a623' }, lineStyle: { color: '#f5a623', width: 2 }, areaStyle: { color: 'rgba(245,166,35,.10)' } },
    ],
  });

  const c2 = echarts.init(pieEl.value);
  c2.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#1a1610', borderColor: '#2c2517', textStyle: { color: '#f6f0e4' }, formatter: '{b}: ¥{c}（{d}%）' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#b8ac95' } },
    series: [
      {
        name: '支出构成',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '50%'],
        itemStyle: { borderColor: '#0d0b09', borderWidth: 2, borderRadius: 6 },
        label: { color: '#b8ac95' },
        data: cats.items.map((c, i) => ({ name: c.category, value: c.total, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
      },
    ],
  });

  charts = [c1, c2];
  onResize = () => charts.forEach((c) => c.resize());
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  if (onResize) window.removeEventListener('resize', onResize);
  charts.forEach((c) => c.dispose());
});

const fmt = (n) => (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>