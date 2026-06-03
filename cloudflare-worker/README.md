# K4RTO Browser Proxy (Cloudflare Worker)

让 Safari app 真正能在 iframe 里浏览**任意网站** —— 通过一个 Cloudflare Worker 代理剥掉 `X-Frame-Options` 和 `Content-Security-Policy: frame-ancestors` 响应头。

## 工作原理

```
访客 Safari app  →  iframe src = https://你的-worker.workers.dev/?url=https://github.com
                                                                       ↓
                                                       Worker fetch GitHub →
                                                       剥 XFO/CSP headers →
                                                       注入 <base> tag →
                                                       返回干净 HTML
                                                                       ↓
                                                       iframe 正常渲染 GitHub 页面
```

## 一次性部署（约 10 分钟）

### 前置

- Cloudflare 账号（免费，注册 https://dash.cloudflare.com）
- Node.js ≥ 16

### 步骤

```bash
# 1. 进 worker 目录
cd cloudflare-worker

# 2. 装 wrangler CLI（Cloudflare 官方部署工具，全局或局部都行）
npm install -g wrangler

# 3. 登录（会打开浏览器 OAuth）
wrangler login

# 4. 部署
wrangler deploy
```

部署成功后会输出类似：

```
✨ Deployed k4rto-browser-proxy
   https://k4rto-browser-proxy.<你的-account>.workers.dev
```

**记下这个 URL** —— 下一步要填给 portfolio 用。

### 测试 Worker

打开浏览器访问：

```
https://k4rto-browser-proxy.<你的-account>.workers.dev/?url=https://example.com
```

应该看到 example.com 的内容（不是错误页）。

### 让 portfolio 用上 Worker

在 portfolio 项目根目录的 `.env`（或 `.env.local`）加一行：

```
NEXT_PUBLIC_PROXY_URL=https://k4rto-browser-proxy.<你的-account>.workers.dev
```

重启 dev：

```bash
npm run dev
```

现在打开 Safari app → Start Page 顶部会显示 **🛡 Proxy enabled** 徽章 → 试点 GitHub / LinkedIn / Wikipedia 应该都能内嵌了。

部署到 GH Pages 时同样需要在 build 环境设置 `NEXT_PUBLIC_PROXY_URL`（GitHub Actions 加 env var）。

## 安全考虑

✅ **SSRF 防护**：
- 内部 IP（localhost / 10.x / 192.168.x / 169.254.169.254 / Azure 168.63.129.16 等）被拒
- IPv6 unique-local (`fc00::/7`) + link-local (`fe80::/10`) + loopback 被拒
- **重定向链每跳都重新验证**（防 `302 Location: http://192.168.x.x/` 绕过的 DNS rebinding 攻击）
- 最多 5 跳重定向

✅ **协议白名单**：只允许 `http:` / `https:`，拒 `file:` / `javascript:` 等。

✅ **不转发凭据**：cookies / authorization header 不会传给目标站。访客 GitHub 登录态在 iframe 里看不到。

✅ **响应头剥离**：
- `X-Frame-Options` / `Content-Security-Policy` / `COOP` / `COEP` / `CORP` 都被剥
- `Set-Cookie` 不透传（防止第三方 cookie 污染）

🔴 **强烈建议**：在 wrangler.toml 的 `ALLOWED_ORIGINS` 填你的 portfolio 域名。**留空 = 任何人都能用你的 Worker 当公开代理**，会消耗你的 100k/天免费额度 + Cloudflare 日志记录访客 IP 都算你账上。

⚠️ **会暴露什么**：每次访客点击某个站点，请求都先经过你的 Worker。Worker 日志会记录访客 IP 和目标 URL（Cloudflare 默认保留几天）。

## 限额（免费档）

- 100,000 请求/天 — 远超 portfolio 流量
- 10ms CPU/请求 — 充裕
- 128MB 内存 — 充裕

升级到 $5/月 Workers Paid 可解锁 10M 请求/月（完全没必要）。

## 已知失效场景

- **登录后才能看的内容**：Worker 不转发 cookies，所以访客 GitHub 登录 ≠ iframe 内的 GitHub 也登录。Iframe 里始终是匿名访问视图。
- **SPA 内嵌路由的资源**：站点 JS 用 `fetch('/api/...')` 时，base tag 让请求走 target origin（不通过 proxy），可能被站点的 CORS 拒。多数静态内容站点没问题，但 React SPA 等可能部分功能受影响。
- **WebSocket / streaming**：不支持，Worker 是请求-响应模型。
- **下载文件**：HTML 之外的资源（图片/JS/CSS）原样透传，下载触发的 `Content-Disposition` 头会保留，但下载行为受 iframe sandbox 限制。
- **`X-Frame-Options` 之外的反 embed 机制**：部分站点用 JS 检测 `window.top !== window.self` 然后跳转，proxy 不能干预这种客户端检查。

## 关闭 Worker

```bash
wrangler delete
```

或在 https://dash.cloudflare.com → Workers & Pages → 选 worker → Settings → Delete。

## 故障排查

| 症状 | 原因 | 解决 |
|---|---|---|
| `wrangler deploy` 报 "Authentication error" | 没登录 | `wrangler login` |
| Iframe 显示 502 / "Upstream fetch failed" | 目标站点拒连或被 CF Worker 网络拦截 | 大部分情况换个 URL 试 |
| Iframe 显示 403 / "Origin not allowed" | 设了 `ALLOWED_ORIGINS` 但当前 origin 不匹配 | 检查 wrangler.toml 的 vars 设置后 redeploy |
| 部分图片 / CSS 404 | 站点用 protocol-relative URL（`//cdn...`） | 已知问题，base tag 处理大部分相对 URL，protocol-relative 需要更复杂的 HTML rewriting |
| GH Pages 上 proxy 不生效 | 没设 build-time env var | GitHub Actions 加 `env: NEXT_PUBLIC_PROXY_URL: ...` |

## 不想用 Worker？

完全可以。**不部署 Worker** 时 portfolio 行为：
- 内嵌友好的站点（YouTube /embed/、Spotify /embed/、example.com）正常嵌入
- 其他站点显示 in-app fallback 卡片 + "Open in browser tab" 兜底

是否升级到 Worker 完全可选。
