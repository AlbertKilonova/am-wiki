# Cloudflare 部署与运维（Workers + Static Assets）

> 记录 2026-11-13 实际落地的发布链路、踩过的三个坑与验证命令。
> 站点：**https://amw.mtga.top/**（自定义域）｜ https://am-wiki.albertkilonova.workers.dev（备用）

## 1. 事实清单

| 项目 | 值 |
| --- | --- |
| GitHub 仓库 | `AlbertKilonova/am-wiki`（分支 `main`） |
| Cloudflare 账号 | Albert.kilonova@gmail.com（Account ID `310d207c037f532713250d4feb05aad5`） |
| CF 项目 | **am-wiki**（Workers 项目，Git 集成 / Workers Builds） |
| 构建命令 | `pnpm run build` |
| 部署命令 | `npx wrangler deploy` |
| 根目录 | `/` |
| 构建变量 | `VITE_REPO_NAME=am-wiki`、`VITE_REPO_OWNER=AlbertKilonova` |
| 自定义域 | `amw.mtga.top`（zone `mtga.top` 在同一个 CF 账号） |
| 输出目录 | `dist/`（见 `wrangler.toml` 的 `[assets]`） |

## 2. 发布配置（wrangler.toml）

```toml
name = "am-wiki"
compatibility_date = "2026-11-01"

[observability]
enabled = false

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

- `not_found_handling = "single-page-application"` 承担所有非静态路径回退（hash 路由站点需要它兜 `/post/*`、`/cms`）。
- `public/_headers` 由 Static Assets 生效：安全头 + `/assets/*` 一年 immutable。
- **不要再加 `public/_redirects`**：SPA 模式下 `/index → /index.html` 会被判「无限循环」并让整次部署失败。

## 3. 三个坑（现象 → 原因 → 处理）

**① Pages 构建令牌鉴权失败**

```
✘ [ERROR] A request to the Cloudflare API (/accounts/<id>/pages/projects/am-wiki) failed.
  Authentication error [code: 10000]
Failed: error occurred while running deploy command
```

原因：面板里建的是 **Workers 项目**，构建令牌只对 Workers 有效；`wrangler pages deploy` 调 Pages API 必然 10000。
处理：改成 Workers 静态资产 —— `wrangler.toml` 用 `[assets]`，部署命令 `npx wrangler deploy`。

**② Missing entry-point（早期用 `wrangler deploy` 时）**

```
▲ [WARNING] It seems that you have run 'wrangler deploy' on a Pages project…
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

原因：当时 `wrangler.toml` 只有 `pages_build_output_dir = "dist"`，Workers 不认这个键。
处理：同上，换成 `[assets] directory = "./dist"`。

**③ `_redirects` 无限循环**

```
✘ [ERROR] Invalid _redirects configuration:
  Line 3: Infinite loop detected in this rule… [code: 100324]
```

原因：`/index /index.html 200` 与 SPA 回退互相触发。
处理：删掉 `public/_redirects`，只留 `not_found_handling`。

## 4. 触发构建

- **自动**：push 到 `main` → Workers Builds 自动跑（约 40–60 s）。
- **手动**：面板 → deployments 里某次构建 → 「重试构建」；或本地 `CLOUDFLARE_API_TOKEN=... pnpm run deploy`。

构建日志里看到这三行即成功：

```
✨ Read 10 files from the assets directory /opt/buildhome/repo/dist
Uploaded am-wiki (5.20 sec)
Success: Build completed.
```

## 5. 自定义域

面板 → 项目 → **域 → 添加域名 → 选择 zone `mtga.top` → 子域填 `amw` → 添加域名**。
CF 自动写 DNS 记录并签发证书；生效后 `https://amw.mtga.top/` 直接 200（无需额外 CNAME 手工操作，因为 zone 在同一账号）。

## 6. 验证命令

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://amw.mtga.top/                 # 200
curl -s https://amw.mtga.top/ | grep -o "<title>[^<]*</title>"                # AlightMotionWiki · Alight Motion 中文知识库
curl -s -D- -o /dev/null https://amw.mtga.top/assets/index-*.js | grep -i cache-control   # immutable
curl -s -o /dev/null -w "%{http_code}\n" https://amw.mtga.top/post/versions  # 200（SPA 回退）
curl -s https://amw.mtga.top/robots.txt                                       # Disallow: /cms
curl -s https://amw.mtga.top/assets/index-*.js | grep -c AlbertKilonova       # ≥1（构建变量已注入）
```

浏览器侧清单：首页三分类都在、文章页可进、`#/cms` 顶部显示 `AlbertKilonova/am-wiki`（无 `REPO_NOT_SET` 提示条）。

## 7. 环境变量

| 变量 | 用途 | 位置 |
| --- | --- | --- |
| `VITE_REPO_OWNER` / `VITE_REPO_NAME` / `VITE_REPO_BRANCH` | 站内 CMS 的目标仓库 | CF **构建变量**（构建期注入，改完要重建） |
| `VITE_SITE_URL` | canonical / og:url / sitemap 基址（默认 `https://amw.mtga.top/`） | 同上 |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | 本地 `wrangler deploy` 直传 | 本机环境变量 |

> 注意：面板「运行时变量」不会进 Vite 构建，必须加在**构建变量**区。

## 8. 日常流程

1. `#/cms` 写文章 → 提 PR
2. CI（`.github/workflows/ci.yml`）校验 + 构建
3. 合并到 `main` → CF 自动构建部署 → 数十秒后线上生效

## 9. GitHub 推送注意（本机）

本机直连 github.com 的 DNS 被污染，通过 FlClash（`mixed-port: 7890`）+ `git config http.proxy http://127.0.0.1:7890` 推送。
若代理未启动，push 会报 `schannel: CRYPT_E_NO_REVOCATION_CHECK` 或 `Connection was reset`。
