<template>
  <div>
    <h1 class="page-title">账单</h1>
    <p class="page-sub">记录每一笔收支，让钱花得明明白白</p>

    <!-- 本月汇总 -->
    <div class="summary-chips">
      <div class="chip income"><div class="label">本月收入</div><div class="value">¥{{ fmt(summary.income) }}</div></div>
      <div class="chip expense"><div class="label">本月支出</div><div class="value">¥{{ fmt(summary.expense) }}</div></div>
      <div class="chip balance"><div class="label">本月结余</div><div class="value">¥{{ fmt(summary.balance) }}</div></div>
    </div>

    <!-- 记一笔 / 编辑 -->
    <section class="card add-panel">
      <h2 class="list-head" style="margin-bottom: 14px">{{ editing ? '编辑这笔账单' : '记一笔' }}</h2>
      <p class="err-msg" v-if="error">{{ error }}</p>
      <div class="form-row">
        <div class="field-full">
          <div class="type-toggle">
            <button :class="{ 'on-expense': type === 'expense' }" @click="type = 'expense'">支出</button>
            <button :class="{ 'on-income': type === 'income' }" @click="type = 'income'">收入</button>
          </div>
        </div>
        <div>
          <label class="f">金额（元）</label>
          <input v-model="amount" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div>
          <label class="f">分类</label>
          <select v-model="category">
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="f">日期</label>
          <input v-model="date" type="date" />
        </div>
        <div>
          <label class="f">备注</label>
          <input v-model="note" placeholder="选填" />
        </div>
      </div>
      <button class="btn btn-primary" @click="save">{{ editing ? '保存修改' : '记 一 笔' }}</button>
      <button class="btn btn-ghost" v-if="editing" @click="cancelEdit" style="margin-left: 10px">取消</button>
    </section>

    <!-- 账单列表 -->
    <section class="card">
      <div class="list-head">
        <h2>账单明细</h2>
        <select class="filter-select" v-model="month" @change="load">
          <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div v-if="list.length === 0" class="empty">这个月还没有账单，记一笔吧 ☕</div>
      <table class="list" v-else>
        <thead>
          <tr>
            <th>日期</th><th>分类</th><th>备注</th><th>金额</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in list" :key="tx.id">
            <td>{{ tx.date }}</td>
            <td><span class="tag">{{ tx.category }}</span></td>
            <td class="note-dim">{{ tx.note || '—' }}</td>
            <td :class="tx.type === 'income' ? 'amt-income' : 'amt-expense'">
              {{ tx.type === 'income' ? '+' : '-' }}¥{{ fmt(tx.amount) }}
            </td>
            <td class="row-actions">
              <button @click="edit(tx)">✏️</button>
              <button @click="remove(tx.id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api.js';

const month = ref(new Date().toISOString().slice(0, 7));
const type = ref('expense');
const amount = ref('');
const category = ref('餐饮');
const date = ref(new Date().toISOString().slice(0, 10));
const note = ref('');
const categories = ref({ expense: [], income: [] });
const list = ref([]);
const summary = ref({ income: 0, expense: 0, balance: 0 });
const error = ref('');
const editing = ref(null);

const categoryOptions = computed(() => categories.value[type.value] || []);

// 最近 12 个月的月份下拉
const monthOptions = (() => {
  const now = new Date();
  const list = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return list;
})();

async function load() {
  list.value = (await api.listTransactions(`?month=${month.value}`)).items;
  summary.value = await api.summary(month.value);
}

onMounted(async () => {
  categories.value = await api.categories();
  category.value = categories.value.expense[0];
  await load();
});

async function save() {
  error.value = '';
  const num = Number(amount.value);
  if (!num || !(num > 0)) {
    error.value = '请输入大于 0 的金额';
    return;
  }
  const body = { type: type.value, amount: num, category: category.value, date: date.value, note: note.value };
  try {
    if (editing.value) await api.updateTransaction(editing.value, body);
    else await api.createTransaction(body);
    cancelEdit();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function edit(tx) {
  editing.value = tx.id;
  type.value = tx.type;
  amount.value = tx.amount;
  category.value = tx.category;
  date.value = tx.date;
  note.value = tx.note;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  editing.value = null;
  amount.value = '';
  note.value = '';
  date.value = new Date().toISOString().slice(0, 10);
  type.value = 'expense';
  category.value = categories.value.expense[0];
}

async function remove(id) {
  if (!confirm('确定删除这笔账单？')) return;
  await api.deleteTransaction(id);
  await load();
}

const fmt = (n) => (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>