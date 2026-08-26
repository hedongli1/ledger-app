# 记账本 · Ledger 📒

一个**真正能用的个人记账全栈应用**：注册登录 → 记收支 → 看统计图表。黑金风格 UI，前后端分离，SQLite 单文件存储，Docker 一键启动。

> 项目经历型作品：从零手写，含端到端接口测试（15 个用例），代码结构清晰，适合作为前端/全栈方向的简历项目。

## ✅ 可验证状态

| 徽章 | 说明 |
| --- | --- |
| ![CI](https://img.shields.io/github/actions/workflow/status/hedongli1/ledger-app/ci.yml?branch=main&label=CI&logo=github) | 测试 + 构建流水线（Node 22/24，`npm test` 15 用例 + `vite build`），点击徽章可查看运行历史 |
| ![tests](https://img.shields.io/badge/tests-15%20passed-brightgreen) | 端到端接口测试全部通过（`node --test`，零框架依赖） |
| ![license](https://img.shields.io/github/license/hedongli1/ledger-app) | MIT |

> 本地复现：`cd server && npm install && npm test` → 15 个用例全部通过（需 Node ≥ 22）。

## ✨ 功能

- **账号系统**：注册 / 登录 / JWT 鉴权（密码 bcrypt 加盐哈希）
- **记账 CRUD**：记收入 / 支出，分类选择（餐饮 / 交通 / 购物 / 工资…），日期、备注
- **月度汇总**：本月收入 / 支出 / 结余三张卡片
- **可视化统计**：近 6 个月收支趋势折线图 + 本月支出构成环形图（ECharts）
- **安全边界**：用户只能操作自己的账单（所有 SQL 带 user_id 条件 + 参数化查询）
- **输入校验**：金额 > 0、日期格式、类型枚举均在服务端校验

## 🧱 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Vue 3 + Vite | 组合式 API，hash 路由（可放任意静态托管） |
| 图表 | ECharts 5 | 折线图 + 环形图，黑金主题定制 |
| 后端 | Node.js + Express | RESTful API，统一错误处理 |
| 数据库 | SQLite（Node 内置 `node:sqlite`） | 单文件存储，零额外依赖 |
| 认证 | JWT + bcryptjs | 7 天过期，中间件统一鉴权 |
| 部署 | Docker Compose | 前端 nginx + 后端，一条命令启动 |

> 💡 亮点：数据库用的是 **Node 22 内置的 `node:sqlite`**，整个后端没有原生编译依赖，`npm install` 秒装、跨平台零坑——这是刻意做的技术选型。

## 🏗️ 架构

```
浏览器 (Vue3 SPA, hash 路由)
   │  /api/*  (JWT in Authorization header)
   ▼
Express (server)
   ├── /api/auth/*        注册 / 登录 / me
   ├── /api/transactions  账单 CRUD（鉴权）
   └── /api/stats/*       汇总 / 趋势 / 分类占比
   │
   ▼
SQLite (ledger.db, 单文件, WAL)
```

## 📁 目录结构

```
ledger-app/
├── server/                 后端
│   ├── src/
│   │   ├── index.js        入口：Express 组装 + 启动
│   │   ├── db.js           数据库初始化 / 表结构 / 内置分类
│   │   ├── auth.js         注册登录 + JWT 中间件
│   │   └── routes.js       记账 CRUD + 统计接口
│   └── test/api.test.js    端到端接口测试（node:test，零依赖）
└── web/                    前端（Vue3 + Vite + ECharts）
    └── src/
        ├── api.js          请求封装（自动带 token、401 跳登录）
        ├── router.js       路由（登录守卫）
        ├── App.vue         布局 + 导航
        └── views/
            ├── Login.vue          登录 / 注册
            ├── Transactions.vue   记一笔 + 账单列表 + 月度汇总
            └── Dashboard.vue      统计图表页
```

## 🚀 快速开始

环境要求：Node >= 22

```bash
# 1. 启动后端（端口 3000）
cd server
npm install
npm start

# 2. 启动前端（端口 5173，已配置 /api 代理）
cd ../web
npm install
npm run dev
# 打开 http://localhost:5173
```

### 跑测试

```bash
cd server && npm test   # 15 个端到端用例，零额外依赖
```

### Docker 一键启动

```bash
docker compose up -d
# 前端 http://localhost:8080 · 后端 http://localhost:3000/api
```

## 📡 API 一览

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 注册，返回 token | - |
| POST | `/api/auth/login` | 登录，返回 token | - |
| GET | `/api/auth/me` | 当前用户 | ✅ |
| GET | `/api/categories` | 内置收支分类 | ✅ |
| GET | `/api/transactions?month=&type=&category=&q=` | 账单列表 | ✅ |
| POST | `/api/transactions` | 记一笔 | ✅ |
| PUT | `/api/transactions/:id` | 更新账单 | ✅ |
| DELETE | `/api/transactions/:id` | 删除账单 | ✅ |
| GET | `/api/stats/summary?month=` | 单月汇总 | ✅ |
| GET | `/api/stats/trend?months=` | 近 N 月趋势 | ✅ |
| GET | `/api/stats/categories?month=&type=` | 分类占比 | ✅ |

## 🎯 简历可以这样写

- 独立完成个人记账全栈应用，前端 Vue3 + ECharts，后端 Express + SQLite，JWT 实现用户鉴权与数据隔离
- 服务端对金额、日期、类型等做完整输入校验，防止脏数据与越权访问（所有查询带 user_id 条件 + 参数化）
- 使用 Node 内置 SQLite 消除原生编译依赖，实现零配置跨平台运行；提供 Docker Compose 一键部署
- 编写 15 个端到端接口测试（node:test + 内置 fetch），覆盖注册 / 登录 / 授权 / CRUD / 统计全链路，无需额外测试框架

## 📄 License

MIT