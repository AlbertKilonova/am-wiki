---
title: 站点重建：从静态页到 Vue
date: 2026-11-13
tags: [贡献, 重构]
summary: 旧版 3 个 HTML + 一份 json 的数据流，改成了 Vue 3 单页 + 构建时读取 Markdown。
---

## 发生了什么

旧版 AlightMotionWiki 是纯手写 HTML：首页一个大页面用 JS 从 `index.json` 里读文章，再用 DOM 拼出来；每篇文章是独立 HTML 文件，样式靠 `styles.css`，交互靠 `script.js`。

重建时发现 **css / js 文件已经丢失**，只剩 HTML 骨架，页面打开没有样式。

## 现在

- Vue 3 + Vite，单页应用，hash 路由
- 文章改成 `content/` 下的 **Markdown 文件**，构建时由 Vite 打包进产物
- 保留原设计：logo、三栏分类、搜索、明暗切换
- 旧站的 9 个 AM 改版介绍原样搬了过来
- 原来的「公告」栏目改为「贡献」，用来放投稿与协作说明

## 还没做

- 下载链接（见「下载渠道」）
- 贡献页内容（见「如何贡献」）
- 文章时间线 / 分页
- 图片上传（正文用外链图床）
