---
title: 站内 CMS 使用教程
date: 2026-11-13
tags: [CMS, 贡献, 教程]
summary: 从申请 GitHub Token 到提交 PR 的完整流程，含三条免代码通道与常见报错。
---

## 这个 CMS 是什么

站点是纯静态的，没有后台服务器。所谓「CMS」只是 `#/cms` 页面里的一段前端代码：内容在浏览器本地拼成 Markdown，提交时直接调用 GitHub REST API，**建分支 → 写文件 → 开 Pull Request**。合并后 Cloudflare 自动重新构建，一分钟内上线。

代价是要有 GitHub 账号；好处是每次修改都是一条可审阅、可回滚的 PR，没人能绕过审稿直接改线上。

## 01 · 准备 Token（只需一次）

用 fine-grained PAT，不要用账号密码，也不要用「classic」的无限权限 token。

| 权限 | 级别 | 用途 |
| --- | --- | --- |
| Contents | Read and write | 建分支、写 `content/**.md` |
| Pull requests | Read and write | 开 PR |
| Metadata | Read | 校验 token 时读仓库信息（必选） |

申请步骤：

1. GitHub → 头像 → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token。
2. Repository access 选 **Only select repositories**，只勾本站仓库（`AlbertKilonova/am-wiki`）。
3. Permissions 按上表勾三项，Expiration 建议 30–90 天。
4. 复制 `github_pat_…`，回到 `#/cms` 的「01 · GitHub Token」粘贴。

Token 只存在**你自己的浏览器**（sessionStorage 或 localStorage），不经过任何服务器。四个按钮：

- **校验**：调一次仓库信息接口，成功显示 `owner/repo · 公开 · 默认分支 main`
- **本次会话**：只存 sessionStorage，关标签页即失效（公用电脑选这个）
- **记住设备**：存 localStorage，下次打开免粘（私人设备才用）
- **清除**：两处都删掉

## 02 · 打开编辑器

地址栏加 `#/cms`，或点顶部导航的「CMS」。页面三块：

1. **01 · GitHub Token**：见上
2. **02 · 已有文章**：按时间倒序列出全部文章（分类标签 + 标题 + 日期），点一条即载入；下方「＋ 新建文章」清空表单
3. **03 · 编辑 / 新建**：表单 + 编辑器

## 03 · 填写字段

| 字段 | 说明 |
| --- | --- |
| TITLE | 标题，写进 frontmatter 的 `title`，也用于 PR 标题 |
| FILENAME | 文件名（不含 `.md`）。留空由标题生成；**中文标题也能生成合法文件名**，slug 保留中文与字母数字 |
| CATEGORY | 决定落哪个目录：教程 → `content/01-tutorial/`，贡献 → `content/03-contributions/` |
| DATE | `YYYY-MM-DD`，列表按它倒序 |
| TAGS | 逗号分隔（中英文逗号都行），写成 `tags: [a, b]` |
| SUMMARY | 列表里的一句话摘要，留空则列表该项为空 |
| 标记为「待补充」 | 勾选后写入 `placeholder: true`，列表显示「待补充」角标 |

表单下方「将要写入的路径」是只读实时预览，提交前核对一眼——路径写错就得再开一条 PR 修。

## 04 · 写正文与预览

`WRITE` 只写正文，frontmatter 由表单拼装，不要自己写 `---` 块。`PREVIEW` 用 marked 实时渲染，表格、列表、代码块、引用都支持。

站内约定：

- 一级标题 `#` 留给页面，正文从 `##` 开始
- 表格前留一个空行，否则部分渲染器不识别
- 引用块 `>` 适合放「来源」「注意」这类旁注

## 05 · 三条提交路径

**A. 提交 PR（推荐，需要 Token）**

点「提交 PR（需要 Token）」后，前端依次：读默认分支 head → 建分支 `cms/<英文短名>-<时间戳>` → 写文件（已存在则带原 `sha` 覆盖）→ 开 PR。成功后页面显示 PR 链接。

PR 标题形如 `docs(content): 新增《站内 CMS 使用教程》`，正文自动列出分类、文件路径、日期与「待补充」标记，审阅者一眼看清改动面。

**B. GitHub 网页新建（免 Token）**

会打开 GitHub 的 `/new/<branch>` 页面，文件名与内容已预填。没有写权限的人看到 fork 提示，走 fork → 提 PR 一样能进。注意：**已存在的文件不支持预填**，GitHub 会直接报文件已存在。

**C. 手工兜底**

「GitHub 网页编辑」直接打开该文件的线上编辑页；「复制 Markdown」「下载 .md」把拼好的全文拿出来，自己贴到任何地方。

## 提交之后

1. PR 上跑 CI：`pnpm run validate`（frontmatter、日期格式、分类目录、id 冲突）+ `pnpm run build`。
2. 审阅通过合并进 `main`。
3. Cloudflare Workers Builds 检测到推送，自动 `pnpm run build` + `wrangler deploy`，约一分钟生效。
4. `sitemap.xml` 需手动补新链接（hash 路由爬虫发现不了）。

## 常见报错

| 现象 | 原因与处理 |
| --- | --- |
| 顶部红色 `REPO_NOT_SET` | 站点没配 `VITE_REPO_OWNER` / `VITE_REPO_NAME`，或填成了「运行时变量」而非「构建变量」。此时仍可编辑/预览/复制/下载，只是提交会指向错误地址 |
| 校验失败 401 | Token 过期或复制不全 |
| 校验失败 403 / 404 | Token 没勾该仓库，或权限缺 `Contents` |
| 提交报「文件已存在」 | 用了「网页新建」通道改旧文；改用「提交 PR」或手工编辑 |
| 提交成功但页面没变 | PR 还没合并；合并后还要等自动构建 |
| 正文中文乱码 | 只可能发生在手工提交；CMS 内部按 UTF-8 → base64 分块编码，中文安全 |

## 安全提醒

- Token 存在浏览器里，站点若有 XSS 就能读走。本站无用户输入回显、无第三方脚本、CSP 限定 `connect-src 'self' https://api.github.com`，风险面很小，但仍不要勾多余权限。
- 公共电脑只用「本次会话」，用完点「清除」。
- Token 泄漏就立刻在 GitHub 撤销重新生成，历史 PR 不受影响。
