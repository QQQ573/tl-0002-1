# 情人节礼盒投票 💝

一个实时投票应用，帮助小情侣在情人节晚餐选择蛋糕和鲜花的组合。支持多人实时投票、实时榜单刷新、连续反对警示等功能。

## 功能特性

- 🏠 **创建投票房**：发起人设置截止时间、可选品类标签，一键创建投票房间
- 👥 **多人投票**：支持多人同时在线投票，实时刷新得票榜
- 👍👎 **点赞/点踩**：对草莓千层+红玫瑰、黑森林+百合等组合投票
- ⚠️ **强烈不建议**：连续3票反对的组合自动进入警示区
- 🔒 **锁定结果**：发起人锁定后生成分享海报文案
- 📱 **响应式设计**：完美适配手机、平板竖屏、桌面端
- 🔄 **断线重连**：5秒内重连自动恢复当前榜单，不会显示空白
- 🤖 **模拟投票**：内置5位模拟用户自动参与投票
- 🎂💐 **私房组合**：发起人可追加最多3组私房组合，自定义蛋糕名、鲜花名、表情符号、风格标签、参考预算价
- 💰 **预算排序**：榜单支持按热度/按预算排序切换，同分热度时预算更低者靠前
- 🚌 **末班车加权**：距截止不足10分钟自动进入末班车阶段，点赞权重×2、点踩仍×1
- 📋 **投票动态流**：底部可折叠面板，按时间倒序展示投票动态，最多保留50条，断线重连自动恢复

## 技术栈

- **前端**：Vue 3 + Composition API + Vite
- **后端**：Node.js + WebSocket (ws)
- **部署**：Docker + docker-compose
- **样式**：纯 CSS，粉色浪漫主题

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 构建并启动服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

启动后访问：http://localhost

### 本地开发

#### 启动后端服务

```bash
cd server
npm install
npm start
```

后端服务运行在 http://localhost:8080

#### 启动前端开发服务

```bash
cd client
npm install
npm run dev
```

前端开发服务运行在 http://localhost:5173

## 使用说明

### 1. 创建投票房

1. 点击「创建投票房」
2. 输入你的昵称
3. 设置投票截止时间
4. 选择品类标签（可选，不选则展示全部）
5. 选择是否启用模拟投票
6. 点击「创建投票房」

### 2. 邀请好友投票

1. 复制房间号分享给好友
2. 好友点击「加入投票房」，输入房间号和昵称
3. 每人可以为喜欢的组合点赞，不喜欢的点踩

### 3. 查看实时榜单

- 页面顶部显示实时得票榜，按得分排序
- 前三名有金银铜牌标识
- 连续收到3票反对的组合会进入「强烈不建议」警示区

### 4. 锁定结果

- 发起人可以点击「锁定结果并生成海报」
- 锁定后生成分享海报和文案，可一键复制

### 5. 断线重连测试

- 网络断开后页面会显示「重连中...」
- 5秒内重新连接会自动恢复当前榜单状态
- 不会显示空白页面，保证投票体验连贯

## API 协议（WebSocket）

### 消息格式

所有消息均为 JSON 格式，结构如下：

```json
{
  "type": "message_type",
  "data": { ... }
}
```

### 客户端 -> 服务端

| 类型 | 说明 | data 字段 |
|------|------|-----------|
| `create_room` | 创建房间 | `userName`, `config: { deadline, selectedTags, mockEnabled }` |
| `join_room` | 加入房间 | `roomId`, `userId`, `userName` |
| `vote` | 投票 | `comboId`, `voteType: 'up' \| 'down' \| 'cancel'` |
| `lock_room` | 锁定房间 | 无（仅发起人有效） |
| `get_state` | 获取房间状态 | 无 |
| `ping` | 心跳 | 无 |

### 服务端 -> 客户端

| 类型 | 说明 | data 字段 |
|------|------|-----------|
| `room_created` | 房间创建成功 | `roomId`, `userId`, `state` |
| `joined_room` | 加入房间成功 | `roomId`, `userId`, `state` |
| `state_update` | 状态更新 | `state` |
| `vote_update` | 投票更新 | `combo`, `voter`, `voteType` |
| `user_joined` | 用户加入 | `userId`, `userName` |
| `user_left` | 用户离开 | `userId`, `userName` |
| `room_locked` | 房间锁定 | `isLocked`, `finalRank` |
| `pong` | 心跳响应 | `timestamp` |
| `error` | 错误 | `message` |

## 双人并发点赞演示

### 演示脚本

使用 Node.js 脚本模拟两个用户同时对同一个组合点赞：

```bash
# 进入 server 目录
cd server

# 确保依赖已安装
npm install

# 运行演示脚本
node scripts/concurrent-vote-demo.js
```

### 期望排序结果

假设有6个组合，两个用户（用户A、用户B）同时投票：

| 组合 | 用户A | 用户B | 总得分 | 期望排名 |
|------|-------|-------|--------|----------|
| 草莓千层 + 红玫瑰 | 👍 | 👍 | +2 | 第1名 |
| 黑森林 + 百合 | 👍 | 👎 | 0 | 中间 |
| 提拉米苏 + 郁金香 | 👎 | 👎 | -2 | 最后 |

### 预期行为

1. 两个用户的投票都会被正确记录
2. 得分计算正确（点赞+1，点踩-1）
3. 排行榜实时更新，按得分降序排列
4. 投票后能立即在所有客户端看到更新
5. 并发投票不会导致数据错乱

### 使用 curl/wscat 手动测试

```bash
# 安装 wscat
npm install -g wscat

# 终端1 - 创建房间
wscat -c ws://localhost:8080
# 发送: {"type":"create_room","userName":"发起人","config":{"mockEnabled":false}}

# 终端2 - 用户A加入
wscat -c ws://localhost:8080
# 发送: {"type":"join_room","roomId":"房间号","userId":"user_a","userName":"用户A"}
# 发送: {"type":"vote","comboId":"combo_1","voteType":"up"}

# 终端3 - 用户B加入
wscat -c ws://localhost:8080
# 发送: {"type":"join_room","roomId":"房间号","userId":"user_b","userName":"用户B"}
# 发送: {"type":"vote","comboId":"combo_1","voteType":"up"}
```

预期：combo_1 的 upVotes = 2，score = +2，排名第一

## 项目结构

```
.
├── client/                 # 前端 Vue 3 应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   ├── CreateRoom.vue
│   │   │   ├── VotingRoom.vue
│   │   │   ├── ComboCard.vue
│   │   │   ├── Leaderboard.vue
│   │   │   ├── WarningZone.vue
│   │   │   ├── SharePoster.vue
│   │   │   └── CustomComboForm.vue
│   │   ├── composables/    # 组合式函数
│   │   │   └── useWebSocket.js
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── server/                 # 后端 WebSocket 服务
│   ├── src/
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 响应式断点

| 设备 | 宽度 | 布局 |
|------|------|------|
| 手机 | < 768px | 单列布局 |
| 平板竖屏 | 768px - 1024px | 双列布局 |
| 平板横屏/桌面 | > 1024px | 自适应多列 |

## 许可证

MIT
