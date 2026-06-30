# `/share` 传输协议与后端实现说明

本文基于仓库当前实现整理，目标是回答下面几个问题：

- `/share` 到底会上传什么
- 走哪些接口
- 如何认证
- 如何撤销
- 后端最少要实现什么，才能兼容当前客户端

本文只描述代码里已经存在的真实行为，不假设未来设计。

---

## 1. 总览

`/share` 不是直接把整段会话一次性 POST 到公开页面。

它的真实流程是：

1. TUI/CLI 调用本地实例 API：`POST /session/:sessionID/share`
2. 本地实例再调用外部 share service 的“创建分享”接口
3. share service 返回：
   - `id`
   - `url`
   - `secret`
4. 本地实例把这 3 个值保存到本地数据库
5. 本地实例立即做一次“全量同步”
6. 之后会话只要继续变化，就按增量事件继续 `sync`
7. 撤销分享时，本地实例调用 share service 的删除接口，并带上 `secret`

也就是说，真正需要你搭建的“分享后端”是一个单独的 share service，而不是本地实例里的 `/session/:id/share` 路由。

---

## 2. 参与的接口分层

### 2.1 本地实例 API

这是 TUI/CLI 调用的本地接口：

- `POST /session/:sessionID/share`
- `DELETE /session/:sessionID/share`

这两个接口只存在于本地 opencode instance 上，主要职责是：

- 检查 session 是否存在
- 读取本地配置
- 选择外部 share service 的地址和认证方式
- 把分享结果写回本地 session / sqlite

它们不是最终公开分享地址。

### 2.2 外部 share service API

这是你需要实现的核心接口。

客户端当前有两套路径前缀：

#### Legacy 模式

当没有激活的组织账号时，使用：

- `POST /api/share`
- `POST /api/share/:shareID/sync`
- `DELETE /api/share/:shareID`
- `GET /api/share/:shareID/data`

#### Org / Console 模式

当存在激活账号且有 `active_org_id` 时，使用：

- `POST /api/shares`
- `POST /api/shares/:shareID/sync`
- `DELETE /api/shares/:shareID`
- `GET /api/shares/:shareID/data`

两套协议的 payload 结构相同，只有路径和认证头不同。

### 2.3 公开页面侧接口

Web 分享页本身还使用了另一层页面适配接口：

- `GET /share_data?id=<share-id>`
- `WS /share_poll?id=<share-id>`

这两个更像“官网前端专用聚合接口”，不是 `ShareNext` 的 canonical 协议。

如果你的目标只是兼容当前本地客户端的上传、导入、撤销，那么先实现 `/api/share*` 或 `/api/shares*` 这一层就够了。

---

## 3. `/share` 命令本地行为

### 3.1 TUI 行为

在 TUI 中：

- 如果当前 session 已经有 `share.url`，再次执行 `/share` 不会重新上传，而是直接复制链接
- 第一次分享前会弹一次确认框，确认后把 `share_consent=true` 写到本地 KV
- 真正发起的是 SDK 调用：`sdk.client.session.share({ sessionID })`

### 3.2 `/unshare` 行为

TUI 里 `/unshare` 会调用：

- `sdk.client.session.unshare({ sessionID })`

成功后只弹 toast，不会保留旧链接。

### 3.3 自动分享

如果配置为：

- `"share": "auto"`

或者运行时 flags 开了 `autoShare`，新建顶层 session 后会自动异步调用分享。

### 3.4 禁用分享

如果配置为：

- `"share": "disabled"`

则本地会直接拒绝分享。

另外如果环境变量：

- `OPENCODE_DISABLE_SHARE=true`
- 或 `OPENCODE_DISABLE_SHARE=1`

则 `ShareNext` 层整体短路，创建/同步/删除都会变成 no-op，不应该用于正式后端联调。

---

## 4. 鉴权模型

这里有两层鉴权，别混淆。

### 4.1 本地实例 API 的鉴权

本地 `POST /session/:id/share`、`DELETE /session/:id/share` 走的是实例 HTTP API 中间件。

如果本地 instance 开了服务端密码，则需要 HTTP Basic Auth，支持两种传法：

- `Authorization: Basic <base64(username:password)>`
- query 参数 `auth_token=<base64(username:password)>`

公开 UI 路径会跳过这个 Basic Auth，但 session share 路由不会跳过。

### 4.2 外部 share service 的鉴权

#### 模式 A：Legacy / Public share

触发条件：

- 没有激活账号，或
- 没有 `active_org_id`

此时：

- base URL = `config.enterprise.url`，如果没配则默认 `https://opencode.lzy1.fun`
- 不附带任何认证 header
- 走 `/api/share/...`

也就是说，legacy share service 默认是“客户端不带 Bearer 的”。

#### 模式 B：Org / Console share

触发条件：

- 有激活账号
- 且账号存在 `active_org_id`

此时每次请求都会附带：

```http
authorization: Bearer <access-token>
x-org-id: <active-org-id>
```

并且：

- base URL = 当前激活账号的 `url`
- 走 `/api/shares/...`

### 4.3 `secret` 的作用

share service 返回的 `secret` 非常关键。

后续两个敏感操作都依赖它：

- `POST /api/share(s)/:id/sync`
- `DELETE /api/share(s)/:id`

客户端不会把 `secret` 放到 header，而是放在 JSON body 里。

因此后端至少要把 `secret` 当作这个 share 的写权限凭证。

建议语义：

- `create`：靠 Bearer 或公开策略控制谁能创建
- `sync`：靠 `secret` 控制谁能改数据
- `delete`：靠 `secret` 控制谁能撤销
- `data`：按你的产品策略决定是否公开读

---

## 5. 外部 share service API 详细协议

下面描述的是客户端实际发送的数据。

## 5.1 创建分享

### 请求

`POST /api/share` 或 `POST /api/shares`

```json
{
  "sessionID": "ses_xxx"
}
```

### 响应

必须返回 JSON：

```json
{
  "id": "shr_abc",
  "url": "https://your-share-site/share/abc",
  "secret": "sec_123"
}
```

字段要求：

- `id`: share 记录 ID，后续用于 sync / delete / data 路径
- `url`: 最终给用户看的分享链接
- `secret`: 后续写入和删除的凭证

客户端本地会把这三个值存到 `session_share` 表，并把 `url` 写回 session 的 `share_url`。

---

## 5.2 全量/增量同步

### 请求

`POST /api/share/:shareID/sync` 或 `POST /api/shares/:shareID/sync`

```json
{
  "secret": "sec_123",
  "data": [
    {
      "type": "session",
      "data": { "...": "..." }
    },
    {
      "type": "message",
      "data": { "...": "..." }
    },
    {
      "type": "part",
      "data": { "...": "..." }
    },
    {
      "type": "session_diff",
      "data": [ { "...": "..." } ]
    },
    {
      "type": "model",
      "data": [ { "...": "..." } ]
    }
  ]
}
```

### `data` 是什么

它是一个“扁平数组”，元素类型固定只有 5 种：

- `session`
- `message`
- `part`
- `session_diff`
- `model`

客户端不会传“嵌套好的 session -> messages -> parts”结构。

后端需要自己决定：

- 原样存为 KV / JSON 文档
- 或在服务端重组为更便于查询的结构

### 全量同步发送哪些内容

第一次分享创建成功后，本地会异步发送一轮全量数据：

- 1 个 `session`
- N 个 `message`
- 所有消息对应的 N 个 `part`
- 1 个 `session_diff`
- 1 个 `model`

### 增量同步如何触发

本地实例监听这些事件并同步：

- session 更新 -> `session`
- message 更新 -> `message`
- part 更新 -> `part`
- session diff 变化 -> `session_diff`
- 用户消息出现新模型 -> `model`

### 增量同步的去重/合并规则

客户端在本地先做 1 秒去抖和 key 合并。

每类数据的内部 key 是：

- `session` -> `session`
- `message` -> `message/<messageID>`
- `part` -> `part/<messageID>/<partID>`
- `session_diff` -> `session_diff`
- `model` -> `model`

同一个 key 在 1 秒内多次变化时，只会保留最后一份。

例如 `session_diff` 连续变化两次，最终只会上传最后一次 diff。

### 响应

客户端只要求 HTTP 2xx。

`sync` 的响应体当前不会被读取，返回空 body 或简单 `{ "ok": true }` 都可以。

如果返回 4xx/5xx，本地只会记 warning，不会自动回滚或重试补偿。

---

## 5.3 删除分享

### 请求

`DELETE /api/share/:shareID` 或 `DELETE /api/shares/:shareID`

请求体：

```json
{
  "secret": "sec_123"
}
```

### 客户端期望

- 只要是 2xx 就视为成功
- 成功后本地会删除 `session_share` 表记录
- 同时把本地 session 的 `share_url` 清空

### 撤销后的服务端建议行为

建议至少做到：

- 删除 share 元数据
- 删除关联的已同步数据
- 让后续 `GET /data` 返回 404 或空
- 让旧公开链接不可再访问

---

## 5.4 读取分享数据

### 请求

`GET /api/share/:shareID/data` 或 `GET /api/shares/:shareID/data`

### 响应格式

CLI `import` 期待的是“扁平数组”，格式必须和 `sync` 的 `data` 数组一致：

```json
[
  {
    "type": "session",
    "data": { "...": "..." }
  },
  {
    "type": "message",
    "data": { "...": "..." }
  },
  {
    "type": "part",
    "data": { "...": "..." }
  },
  {
    "type": "session_diff",
    "data": [ { "...": "..." } ]
  },
  {
    "type": "model",
    "data": [ { "...": "..." } ]
  }
]
```

### 导入端兼容逻辑

CLI 导入 share URL 时会这样处理：

1. 从分享 URL 中解析 slug，格式要求是：
   - `https://host/share/<slug>`
2. 先请求：
   - `baseUrl + req.api.data(slug)`
3. 如果失败，且当前路径不是 legacy 的 `/api/share/<slug>/data`
   则会再 fallback 一次到：
   - `/api/share/<slug>/data`

这意味着如果你只实现一套路径，优先实现 legacy 读接口兼容性最好。

### 读取接口是否带认证

这点要分情况：

- 如果导入 URL 的 origin 与账号控制台 `baseUrl` 相同，CLI 会把 Bearer + `x-org-id` 一起带上
- 否则默认不带这些认证头

因此最稳妥的服务端策略是：

- legacy `GET /api/share/:id/data` 支持公开读
- org `GET /api/shares/:id/data` 可按 Bearer + `x-org-id` 做受控读取

---

## 6. 实际上传的数据内容

这里按类型说明“会上传什么”。

## 6.1 `session`

`session` 上传的是 SDK v2 的 session 对象，至少包含这些字段：

```json
{
  "id": "ses_xxx",
  "slug": "some-slug",
  "projectID": "pro_xxx",
  "workspaceID": "ws_xxx",
  "directory": "E:/repo",
  "path": "sub/path",
  "parentID": "ses_parent",
  "title": "My Session",
  "agent": "build",
  "model": {
    "id": "gpt-5",
    "providerID": "openai",
    "variant": "default"
  },
  "version": "x.y.z",
  "summary": {
    "additions": 12,
    "deletions": 3,
    "files": 2,
    "diffs": []
  },
  "cost": 0.123,
  "tokens": {
    "input": 100,
    "output": 200,
    "reasoning": 50,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "share": {
    "url": "https://..."
  },
  "metadata": {},
  "permission": [],
  "revert": {},
  "time": {
    "created": 0,
    "updated": 0,
    "compacting": 0,
    "archived": 0
  }
}
```

不是所有字段每次都有值，但公开页和导入逻辑会用到至少这些信息：

- `id`
- `slug`
- `projectID`
- `directory`
- `title`
- `version`
- `time`
- `share.url`

注意：`directory`、`path`、`metadata`、`permission` 等都可能包含敏感上下文。当前实现不会额外脱敏。

## 6.2 `message`

上传的是 session 内每条 message 的原始 SDK/v2 message 结构。

至少可以假设会有：

- `id`
- `sessionID`
- `role`
- `time`

其中：

- user message 还会带模型选择信息
- assistant message 还会带 cost / tokens / provider / model / path / summary / error 等

公开页会基于这些字段统计：

- 模型列表
- token 用量
- cost
- 完成时间

## 6.3 `part`

上传的是消息内部每个 part。

常见 part 包括：

- `text`
- `tool`
- `file`
- `reasoning`
- `step-start`
- `step-finish`
- 以及其他内部步骤类 part

公开页会过滤掉一部分中间态内容，例如：

- `snapshot`
- `patch`
- `step-finish`
- synthetic `text`
- `tool` 的 `pending/running` 状态

但这些 part 在上传时并不会被裁剪，后端应原样保存。

## 6.4 `session_diff`

这是整个 session 的文件 diff 汇总，结构是数组。

元素至少包含：

- `file`
- `patch`
- `additions`
- `deletions`
- `status`

例子：

```json
{
  "type": "session_diff",
  "data": [
    {
      "file": "src/a.ts",
      "patch": "Index: ...",
      "additions": 2,
      "deletions": 1,
      "status": "modified"
    }
  ]
}
```

## 6.5 `model`

这是当前 session 使用过的模型列表数组。

来源是所有 user message 里出现过的 `(providerID, modelID)` 去重后，再查 provider registry 得到的完整 model 对象。

后端如果不关心模型元信息，也可以把它当作不透明 JSON 数组保存。

---

## 7. 公开页面侧的另一套读取协议

如果你还想自己实现分享网页，而不是只做上传后端，需要额外知道这一层。

### 7.1 首屏数据

官网分享页先请求：

`GET /share_data?id=<share-id>`

返回的不是上面那种扁平数组，而是适配后的结构：

```json
{
  "info": {
    "...": "session info"
  },
  "messages": {
    "<messageID>": {
      "...": "message with parts"
    }
  }
}
```

### 7.2 实时更新

浏览器随后连接：

`wss://<api-host>/share_poll?id=<share-id>`

WebSocket 消息格式看起来像：

```json
{
  "key": "session/info"
}
```

或：

```json
{
  "key": "session/message/<messageID>",
  "content": { "...": "..." }
}
```

或：

```json
{
  "key": "session/part/<messageID>/<partID>",
  "content": { "...": "..." }
}
```

也就是说，公开页消费的是“按 key 推送的变更流”，而不是直接消费 `ShareNext.sync` 的原始 payload。

如果你的目标只是“根据传输数据搭后端”，这一层可以晚点做。

---

## 8. 后端最小可用实现建议

如果你的目标是先跑通当前客户端，最小实现建议如下。

### 必须实现

1. `POST /api/share`
2. `POST /api/share/:id/sync`
3. `DELETE /api/share/:id`
4. `GET /api/share/:id/data`

如果要兼容组织账号模式，再额外实现同语义的：

1. `POST /api/shares`
2. `POST /api/shares/:id/sync`
3. `DELETE /api/shares/:id`
4. `GET /api/shares/:id/data`

### 建议的数据表

至少两张：

#### `shares`

- `id`
- `public_slug` 或直接复用 `id`
- `secret`
- `url`
- `org_id` nullable
- `owner_account_id` nullable
- `created_at`
- `updated_at`
- `deleted_at` nullable

#### `share_payloads`

两种做法任选其一：

- 直接存一份当前“扁平数组”快照
- 或拆成 KV：
  - `share_id`
  - `key`
  - `type`
  - `content_json`
  - `updated_at`

KV 方式更贴合客户端的增量模型，因为客户端本地就是按 key 去重的。

### `sync` 合并建议

服务端可以直接按下面规则 upsert：

- `session` -> key 固定 `session`
- `message` -> key = `message/<id>`
- `part` -> key = `part/<messageID>/<id>`
- `session_diff` -> key = `session_diff`
- `model` -> key = `model`

这样 `GET /data` 时再按固定顺序吐回数组即可：

1. `session`
2. 所有 `message`
3. 所有 `part`
4. `session_diff`
5. `model`

这正好兼容 CLI import 的 `transformShareData()`。

---

## 9. 风险与注意事项

### 9.1 当前实现不会脱敏

分享内容可能包含：

- 用户 prompt
- 模型回复
- 文件路径
- 文件内容摘要
- tool 输入输出
- diff patch
- 代价和 token 统计
- 可能的报错文本

也就是说，只要会话里出现过，这套分享链路就很可能被同步出去。

### 9.2 `secret` 是真正的写权限

如果 `secret` 泄漏，别人就可能：

- 覆盖同步内容
- 删除分享

因此它不应该出现在公开页面，也不应该暴露给前端浏览器。

### 9.3 删除要尽量做硬删除或逻辑不可见

因为用户对 `/unshare` 的直觉是“链接失效”。

如果只是前端隐藏，但 `GET /data` 还能拿到内容，体验上等于没撤销。

### 9.4 路径兼容性

CLI import 对：

- `/api/shares/:id/data`
- `/api/share/:id/data`

都有兼容逻辑。

如果你只能先做一套，优先做 legacy 的 `/api/share/:id/data`。

---

## 10. 推荐实现结论

如果你现在要“根据传输数据搭建后端”，推荐先做这版：

### 第一步

实现无认证或弱认证的 legacy 协议：

- `POST /api/share`
- `POST /api/share/:id/sync`
- `DELETE /api/share/:id`
- `GET /api/share/:id/data`

### 第二步

内部按 KV 模型存储每个 share 的最新快照。

### 第三步

`sync` 校验 body 里的 `secret`，通过后按 key 覆盖。

### 第四步

`GET /data` 返回扁平数组，顺序保持：

- `session`
- `message*`
- `part*`
- `session_diff`
- `model`

### 第五步

如果后续要接入组织账号，再补：

- `Bearer` + `x-org-id`
- `/api/shares/*`

---

## 11. 一句话总结

`/share` 上传的不是一个单独“聊天文本”，而是一套持续同步的 session 快照流；写入权限靠 `secret`，组织模式下创建/读取还可能叠加 `Bearer + x-org-id`；撤销则是对 share ID 发 `DELETE` 并在 body 中提交同一个 `secret`。
