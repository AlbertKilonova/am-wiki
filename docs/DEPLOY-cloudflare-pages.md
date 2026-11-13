# 发布：GitHub → Cloudflare Pages → https://amw.mtga.top

> 目标形态：仓库在 GitHub，构建与托管在 Cloudflare Pages，生产域名 `amw.mtga.top`；
> 换内容 = 一次 PR，合并后自动重建，全站仍是纯静态、零服务器。

## 0. 前置检查

| 项 | 要求 |
|---|---|
| Cloudflare 账号 | 已添加站点 `mtga.top`（推荐：DNS 托管在 Cloudflare，自定义域一行搞定） |
| GitHub 仓库 | 空仓库即可，例如 `YOUR_GITHUB_USER/am-wiki`（公开/私有都能接 Pages） |
| 本机 | Node ≥ 20、pnpm 10（`npm i -g pnpm@10`） |
| 已就绪 | `packageManager`、`public/_headers`、`public/_redirects`、`public/404.html`、`wrangler.toml` 均已在本仓库配好 |

## 1. 推仓库

```bash
cd web/am-wiki
git add -A
git commit -m "chore: Cloudflare Pages 发布配置（amw.mtga.top）"
git branch -M main
git remote add origin git@github.com:YOUR_GITHUB_USER/am-wiki.git
git push -u origin main
```

## 2. 建 Pages 项目（二选一）

### A. Git 集成（推荐，push 即部署）

Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → 选仓库，构建设置：

| 字段 | 值 |
|---|---|
| Production branch | `main` |
| Framework preset | `None`（或 Vite，二者等价） |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | 留空（仓库根就是项目根） |
| Node version | 环境变量 `NODE_VERSION=20` |

环境变量（**Production 与 Preview 都要加**，都是构建期变量，改完必须重新部署才生效）：

```
VITE_REPO_OWNER = YOUR_GITHUB_USER
VITE_REPO_NAME  = am-wiki
VITE_REPO_BRANCH= main
VITE_SITE_URL   = https://amw.mtga.top/
```

> `VITE_REPO_*` 决定站内 CMS 的「预填到 GitHub / 提交 PR」指向哪个仓库。
> 不设也能正常浏览，只是 CMS 顶部会出现 `REPO_NOT_SET` 提示条。

pnpm 说明：仓库带 `pnpm-lock.yaml` 且 `package.json` 写了 `packageManager: pnpm@10.34.9`，Cloudflare 会自动用 pnpm 10。

### B. 直传（无 Git 集成）

```bash
export CLOUDFLARE_API_TOKEN=...      # 权限：Pages: Edit
export CLOUDFLARE_ACCOUNT_ID=...
pnpm run deploy                       # = scripts/deploy-cloudflare.sh
# 等价手写：npx wrangler pages deploy dist --project-name am-wiki --branch main
```

首次执行会创建名为 `am-wiki` 的 Pages 项目。GitHub Actions 的手动通道见 `.github/workflows/deploy.yml`（需 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` 两个 secrets）。

## 3. 绑定域名 amw.mtga.top

Pages 项目 → **Custom domains → Set up a custom domain** → 填 `amw.mtga.top` → Activate。

- **DNS 在 Cloudflare（推荐）**：它会自动写入 `CNAME amw → am-wiki.pages.dev`，代理状态橙色；证书由 Cloudflare 自动签发（通常 1–3 分钟）。
- **DNS 不在 Cloudflare**：到域名商处手工加 `CNAME amw → am-wiki.pages.dev`，回到 Pages 点 Check DNS；证书仍由 Cloudflare 侧签发，但解析生效前页面会显示 `DNS record not found`。
- 想让根域 `mtga.top` 或 `www` 也指过去：再添加一次自定义域即可；本项目只声明了 `amw`。
- **不要**给 `amw` 加 A 记录指向任意 IP，Pages 只认 CNAME。

## 4. 上线后验证

```bash
# 1) 证书与响应头（HSTS / CSP 应来自 public/_headers）
curl -sSI https://amw.mtga.top/ | sed -n '1,20p'

# 2) 关键路径
curl -s -o /dev/null -w '%{http_code}\n' https://amw.mtga.top/
curl -s -o /dev/null -w '%{http_code}\n' https://amw.mtga.top/sitemap.xml
curl -s -o /dev/null -w '%{http_code}\n' https://amw.mtga.top/robots.txt

# 3) 资源缓存头应为 immutable
curl -sSI https://amw.mtga.top/assets/index-xxxx.js | grep -i cache-control
```

浏览器侧清单：

- [ ] `https://amw.mtga.top/` 首屏 3 个分类 + 5 篇文章行，无控制台报错
- [ ] 点进文章（`/#/post/versions`）面包屑、正文、上下篇正常
- [ ] 直接刷新文章页仍是同一篇（hash 路由不依赖服务器）
- [ ] `/#/cms` 能打开；未设 `VITE_REPO_*` 时显示 `REPO_NOT_SET` 提示条
- [ ] 故意访问 `https://amw.mtga.top/not-exist` 出现 404 页（来自 `404.html`）
- [ ] 深色模式下 theme-color 与配色正确

## 5. 站内 CMS 的 Token（写内容时才需要）

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token
2. Repository access：只勾 `am-wiki` 一个仓库
3. Permissions：**Contents: Read and write**、**Pull requests: Read and write**、**Metadata: Read**
4. 打开 `https://amw.mtga.top/#/cms` → 02 · GitHub Token 里粘贴 → 「校验」→ 通过后即可「提交 PR」

Token 只存在访问者自己的 `sessionStorage`（勾「记住设备」才落 `localStorage`），不经过任何服务器；站点 CSP 限定 `connect-src` 只有 `'self'` 与 `https://api.github.com`。

## 6. 发布流程（日常）

```
写内容（站内 CMS 或直接改 content/*.md）
        ↓  提 PR
GitHub Actions: ci.yml → validate-content + build + dist-preview 产物（保留 7 天）
        ↓  评审合并
Cloudflare Pages 监听 main → 自动构建 → 生产切换（保留历史部署，可一键回滚）
```

## 7. 回滚与排错

| 现象 | 处理 |
|---|---|
| 页面空白、控制台 CSP 报错 | `index.html` 的 meta CSP 与 `public/_headers` 的 CSP 必须一致（两层同时存在时取交集，任何一边更严都会拦自己） |
| 静态资源 404 | `vite.config.js` 的 `base` 必须是 `'/'`；挂子目录才用 `'./'` |
| 改了 `_headers`/`_redirects` 没效果 | 这两个文件必须在构建输出根目录（本仓库放了 `public/`，Vite 会拷到 `dist/`），且需要重新部署 |
| 自定义域一直 Pending | DNS 里 `amw` 必须是 CNAME 指向 `am-wiki.pages.dev`、不能有冲突 A/AAAA 记录；代理开橙云 |
| 构建报 pnpm 版本错 | 环境变量加 `NODE_VERSION=20`；必要时再设 `PNPM_VERSION=10` |
| 构建报 lockfile 不一致 | 本地 `pnpm install` 后提交新的 `pnpm-lock.yaml`；CF 侧默认用 frozen lockfile |
| CMS 提交后 404 / 指向别人仓库 | 环境变量 `VITE_REPO_OWNER`/`VITE_REPO_NAME` 没设或写错，且改完没重新部署 |
| 要回退版本 | Pages → Deployments → 选中历史部署 → **Rollback**；或 `npx wrangler pages deployment list --project-name am-wiki` |

## 8. 与 GitHub Pages 的关系

原 `deploy.yml`（GitHub Pages）已被替换为 Cloudflare Pages 手动通道，避免两条流水线互相覆盖生产域名。若仍想保留 GitHub Pages 预览，在仓库 Settings → Pages 里关掉即可，`vite.config.js` 需把 `base` 改回 `'./'`。

## 9. 参考

- Cloudflare Pages 构建设置：https://developers.cloudflare.com/pages/configuration/build-configuration/
- 响应头与重定向：https://developers.cloudflare.com/pages/configuration/headers/ ・ https://developers.cloudflare.com/pages/configuration/redirects/
- 自定义域：https://developers.cloudflare.com/pages/configuration/custom-domains/
- wrangler pages deploy：https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
