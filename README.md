# AlightMotionWiki · 纯静态 Wiki + 无后端 CMS

Vue 3 + Vite 单页应用，**没有后端、没有数据库**。
文章是 `content/` 下的 Markdown，构建时打包进产物；编辑走「站内 CMS → GitHub PR → Actions 校验 → Cloudflare Pages 部署」。

生产域名：**https://amw.mtga.top/**（Cloudflare Pages，自定义域）。
发布手册：[docs/DEPLOY-cloudflare-pages.md](docs/DEPLOY-cloudflare-pages.md)。

## 工作流

```
访客/编辑 ──► #/cms（纯前端编辑器）
                 ├─ A. GitHub 网页新建（免 Token，预填内容 → fork/分支 → PR）
                 └─ B. 细粒度 PAT 直连 GitHub API（一键建分支 + 提 PR）
                                   │
PR 打开 ──► ci.yml：校验 frontmatter + 构建（失败红叉，产物 dist-preview 留 7 天）
                                   │
合并到 main ──► Cloudflare Pages 自动构建 → https://amw.mtga.top/
```

## 结构

```
am-wiki/
├─ content/                     ← 内容（构建时读取）
│  ├─ 01-tutorial/
│  ├─ 02-downloads/
│  └─ 03-contributions/
├─ public/                      ← 原样拷进 dist 的静态资产
│  ├─ _headers                  ← Cloudflare 响应头（安全头 + 缓存策略）
│  ├─ _redirects                ← 直连 /cms、/post/* 时回退 index
│  ├─ 404.html                  ← Pages 的 404 页
│  ├─ favicon.svg / robots.txt / sitemap.xml
├─ src/
│  ├─ config.js                 仓库与站点配置（环境变量 VITE_REPO_* 覆盖）
│  ├─ lib/github.js             浏览器直连 GitHub API：建分支/写文件/开 PR
│  ├─ data/categories.js        分类 ↔ 目录映射
│  ├─ data/posts.js             import.meta.glob 读取 content/**/*.md
│  ├─ views/                    Home / Post / Cms
│  ├─ directives/reveal.js      滚动揭示
│  └─ styles.css                瑞士国际主义 + 工业风 + 动效
├─ scripts/
│  ├─ validate-content.mjs      frontmatter 校验（CI / 本地）
│  └─ deploy-cloudflare.sh      直传发布（wrangler pages deploy）
├─ .github/workflows/
│  ├─ ci.yml                    PR：校验 + 构建 + 产物
│  └─ deploy.yml                CF Pages 手动直传通道（Git 集成时不需要）
├─ wrangler.toml                Pages 项目名 / 输出目录
├─ .env.example                 构建期环境变量样例
├─ build.sh                     手机上构建（借 /root/build 绕开 FUSE 符号链接）
└─ dist/                        构建产物（含 public/ 拷入的 _headers 等）
```

## 发布（Cloudflare Pages）

**A. Git 集成（推荐）**：Pages → Connect to Git，构建命令 `pnpm build`、输出目录 `dist`，环境变量：

```
VITE_REPO_OWNER  = <你的 GitHub 用户名>
VITE_REPO_NAME   = am-wiki
VITE_REPO_BRANCH = main
VITE_SITE_URL    = https://amw.mtga.top/
NODE_VERSION     = 20
```

**B. 直传**：`CLOUDFLARE_API_TOKEN=... pnpm run deploy`（等价 `npx wrangler pages deploy dist --project-name am-wiki --branch main`）。

自定义域 `amw.mtga.top` 在 Pages → Custom domains 添加；DNS 在 Cloudflare 时自动写入 CNAME `amw → am-wiki.pages.dev`。

环境变量是**构建期**变量，改完要重新部署才生效。未设置 `VITE_REPO_*` 时站点照常浏览，`#/cms` 会显示 `REPO_NOT_SET` 提示条。

> 仍用 GitHub Pages 时：把 `vite.config.js` 的 `base` 改回 `'./'`，并把 `deploy.yml` 换回 Pages 版本；仓库 Settings → Pages → Source 选 GitHub Actions。

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
pnpm run build        # → dist/（含 _headers、_redirects、404.html）
pnpm run preview      # vite preview
python -m http.server 8899 --bind 127.0.0.1 --directory dist
```

手机上构建用 `sh build.sh`（`/sdcard` 是 FUSE，不支持 pnpm 需要的符号链接，脚本会先同步到 `/root/build`）。

## 已知取舍

- 内容改动必须走 PR（这是设计目标，不是缺陷）
- 没有 PR 预览部署（Cloudflare Pages 自带分支预览域，可用 `<branch>.am-wiki.pages.dev`）
- 图片用外链图床，不做仓库内上传
- CMS 的文章列表来自构建时的快照；合并后重新构建即为最新
- `_headers` / `_redirects` 只在 Cloudflare 生效，本地静态服务器会忽略
