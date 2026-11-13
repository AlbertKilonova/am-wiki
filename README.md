# AlightMotionWiki · 纯静态 Wiki + 无后端 CMS

Vue 3 + Vite 单页应用，**没有后端、没有数据库**。
文章是 `content/` 下的 Markdown，构建时打包进产物；编辑走「站内 CMS → GitHub PR → Actions 校验」，合并后由 Cloudflare 自动构建上线。

生产域名：**https://amw.mtga.top/**（Cloudflare Workers + Static Assets，自定义域）
备用域名：https://am-wiki.albertkilonova.workers.dev
发布手册：[docs/DEPLOY-cloudflare.md](docs/DEPLOY-cloudflare.md)

## 工作流

```
访客/编辑 ──► #/cms（文章） / #/cms/downloads（下载条目，纯前端编辑器）
                 ├─ A. GitHub 网页新建（免 Token，预填内容 → fork/分支 → PR）
                 └─ B. 细粒度 PAT 直连 GitHub API（一键建分支 + 提 PR）
                                   │
PR 打开 ──► ci.yml：校验 frontmatter + 构建（失败红叉，产物 dist-preview 留 7 天）
                                   │
合并到 main ──► Cloudflare Workers Builds 自动构建 → wrangler deploy → https://amw.mtga.top/
```

## 结构

```
am-wiki/
├─ content/                     ← 内容（构建时读取）
│  ├─ 01-tutorial/              文章：教程
│  ├─ 02-downloads/             下载条目：一个改版一个 .md，字段即 frontmatter
│  └─ 03-contributions/         文章：贡献与协作
├─ public/                      ← 原样拷进 dist 的静态资产
│  ├─ _headers                  ← 响应头（安全头 + 缓存策略）
│  ├─ 404.html                  ← 兜底页
│  ├─ favicon.svg / robots.txt / sitemap.xml
├─ src/
│  ├─ config.js                 仓库与站点配置（环境变量 VITE_REPO_* 覆盖）
│  ├─ lib/github.js             浏览器直连 GitHub API：建分支/写文件/开 PR
│  ├─ lib/useToken.js           Token 状态机（文章 CMS 与下载 CMS 共用）
│  ├─ data/categories.js        分类 ↔ 目录映射
│  ├─ data/posts.js             import.meta.glob 读取 content/**/*.md（排除 02-downloads）
│  ├─ data/downloads.js         下载条目：名称 / 版本 / 链接 / 图片 / 简介
│  ├─ views/                    Home / Post / Cms / Downloads / DownloadCms
│  ├─ directives/reveal.js      滚动揭示
│  └─ styles.css                瑞士国际主义 + 工业风 + 动效
├─ scripts/
│  ├─ validate-content.mjs      frontmatter 校验（CI / 本地）
│  └─ deploy-cloudflare.sh      本地直传（wrangler deploy）
├─ .github/workflows/
│  ├─ ci.yml                    PR：校验 + 构建 + 产物
│  └─ deploy.yml                手动直传通道（Git 集成时不需要）
├─ wrangler.toml                Worker 名 / [assets] 目录 / SPA 回退
├─ .env.example                 构建期环境变量样例
├─ build.sh                     手机上构建（借 /root/build 绕开 FUSE 符号链接）
└─ dist/                        构建产物（含 public/ 拷入的 _headers 等）
```

## 发布（Cloudflare Workers + Static Assets）

线上项目名 **am-wiki**，Git 集成模式：push 到 `main` 触发 Workers Builds。

```
构建命令   pnpm run build
部署命令   npx wrangler deploy
根目录     /
构建变量   VITE_REPO_NAME=am-wiki
          VITE_REPO_OWNER=AlbertKilonova
```

`wrangler.toml` 关键段：

```toml
name = "am-wiki"
compatibility_date = "2026-11-01"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

> 为什么不是 Pages：本项目在 CF 面板里建为 Workers 项目，Pages 的构建令牌调
> `/pages/projects/...` 会返回 `Authentication error [code: 10000]`；改用 `[assets]` +
> `wrangler deploy` 后部署通过。若要回到 Pages，把 `[assets]` 换成
> `pages_build_output_dir = "dist"` 并用 `pnpm run deploy:pages`。

**本地直传**：`CLOUDFLARE_API_TOKEN=... pnpm run deploy`（= `wrangler deploy`）。
**Pages 备选**：`pnpm run deploy:pages`（= `wrangler pages deploy dist --project-name am-wiki`）。

自定义域 `amw.mtga.top` 在项目「域 → 添加域名 → mtga.top → 子域 amw」绑定，CF 自动写 DNS 记录与证书。

环境变量是**构建期**变量，改完要重新构建才生效。未设置 `VITE_REPO_*` 时站点照常浏览，`#/cms` 会显示 `REPO_NOT_SET` 提示条。

## 下载页与下载 CMS

「下载」是独立页面（`#/downloads`），卡片流，不用文章模板。每张卡只维护五个字段：

| 字段 | frontmatter | 说明 |
| --- | --- | --- |
| 名称 | `title` | 必填，卡片标题 |
| 版本 | `version` | 可空，显示为版本标签 |
| 下载链接 | `url` | 可空，填了才有「下载 ↗」按钮 |
| 图片 | `image` | 可空，外链图；空着显示两位编号 |
| 简介 | `summary` | 一句话说明这个改版是什么、适合谁 |

专用后台在 **`#/cms/downloads`**：左侧字段、右侧实时预览，提交同样是「建分支 → 写文件 → 开 PR」；没有 Token 时可用「GitHub 网页新建 / 复制 / 下载 .md」。

```md
---
title: AlightMotion Mix3
version: 4.2.3            # 可空
date: 2026-11-13
summary: 同为柠檬制作，优化更好，对低配机友好。
url: https://example.com/mix3.apk   # 可空
image: https://example.com/mix3.jpg # 可空
---
```

## 加文章（三种方式）

**① 站内 CMS（推荐）**：打开 `#/cms`
- **免 Token 通道**：填写内容 → 点「GitHub 网页新建」→ 内容已预填，点 Create branch → 提 PR（无仓库权限的人会被引导 fork）
- **Token 通道**：粘贴细粒度 PAT → 校验通过后点「提交 PR」，自动建 `cms/<slug>-<stamp>` 分支并开 PR

**② 直接改文件**：在 `content/<分类目录>/` 新建 `.md`，提 PR。

**③ 文章页右上角**「GITHUB ↗」直接跳到 GitHub 编辑页。

### 文件格式

```md
---
title: 文章标题
date: 2026-11-13
tags: [Alight Motion, 教程]
summary: 列表里的一句话摘要
# placeholder: true      # 可选：显示「待补充」
# id: custom-id          # 可选：默认用文件名
---

正文（完整 Markdown）
```

## PAT 该怎么建

GitHub → Settings → Developer settings → **Fine-grained tokens** → 只选这一个仓库：

- `Contents`: Read and write（写文件）
- `Pull requests`: Read and write（开 PR）
- `Metadata`: Read（必需）

**安全边界**：
- Token 默认存 `sessionStorage`（关标签页即失效）；勾「记住设备」才落 localStorage
- CSP 双层：`index.html` 的 meta + `public/_headers`，均为 `script-src 'self'`、`connect-src 'self' https://api.github.com`，站点无任何第三方脚本
- 不想要了就点「清除」，或去 GitHub 撤销该 token

## 本地开发 / 构建

```sh
pnpm install
pnpm run validate     # 校验 content/*.md
pnpm run build        # → dist/（含 _headers、404.html）
pnpm run preview      # vite preview
npx wrangler deploy --dry-run   # 只校验 Worker 配置，不上传
python -m http.server 8899 --bind 127.0.0.1 --directory dist
```

手机上构建用 `sh build.sh`（`/sdcard` 是 FUSE，不支持 pnpm 需要的符号链接，脚本会先同步到 `/root/build`）。

## 已知取舍

- 内容改动必须走 PR（这是设计目标，不是缺陷）
- 没有 PR 预览部署（Workers 有 `*-am-wiki.albertkilonova.workers.dev` 预览域，但本项目未启用分支预览）
- 图片用外链图床，不做仓库内上传
- CMS 的文章列表来自构建时的快照；合并后重新构建即为最新
- `_headers` 由 Workers Static Assets 生效；路径回退交给 `not_found_handling = "single-page-application"`（`_redirects` 会与它冲突，已移除）
