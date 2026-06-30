# Relay share service

一个与 opencode 本体解耦的分享服务，使用 Bun、Next.js 和 Postgres。它只依赖
[`share-backend.md`](../share-backend.md) 描述的 HTTP 契约，不导入任何 opencode 内部包。

## 启动

```powershell
cd share-service
bun install
bun run dev
```

首次访问 API 时会自动创建 `shares` 与 `share_payloads` 表。默认地址是
`http://localhost:3000`，健康检查为 `GET /api/health`。

## 配置

复制 `.env.example` 为 `.env.local`，至少设置：

```dotenv
DATABASE_URL=postgresql://...
PUBLIC_BASE_URL=https://share.example.com
```

本地 `.env.local` 已被 `.gitignore` 排除。生产环境请在部署平台注入环境变量，不要提交连接串。

若启用组织路由 `/api/shares/*`，建议设置 `ORG_BEARER_TOKEN`。未设置时，服务只检查请求同时具有
非空 Bearer token 与 `x-org-id`，这只适合本地联调；生产环境应配置 token，或接入自己的身份提供商。

## 路由

Legacy 路由：

- `POST /api/share`
- `POST /api/share/:id/sync`
- `DELETE /api/share/:id`
- `GET /api/share/:id/data`

Org 路由：

- `POST /api/shares`
- `POST /api/shares/:id/sync`
- `DELETE /api/shares/:id`
- `GET /api/shares/:id/data`

网页位于 `/share/:id`，并通过 `GET /share_data?id=:id` 每 3 秒更新一次。写入 secret
只以 SHA-256 哈希保存，不会返回到公开读取接口。

## 接入 opencode

在 opencode 配置中把 enterprise 基础地址指向本服务的公开 origin：

```json
{
  "enterprise": {
    "url": "http://localhost:3000"
  }
}
```

随后 TUI 的 `/share` 会走本服务的 Legacy API。生产环境应将两处地址都换成 HTTPS 公网域名，
并同步更新 `PUBLIC_BASE_URL`。Legacy 模式不需要额外认证；组织模式需让客户端发送与
`ORG_BEARER_TOKEN` 一致的 Bearer token 及 `x-org-id`。
