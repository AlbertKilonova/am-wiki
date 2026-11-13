#!/usr/bin/env bash
# 手动直传发布到 Cloudflare Pages（Git 集成方式不需要跑这个）
# 依赖：CLOUDFLARE_API_TOKEN（Pages: Edit）+ CLOUDFLARE_ACCOUNT_ID，或先执行 npx wrangler login
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${CF_PAGES_PROJECT:-am-wiki}"
BRANCH="${CF_PAGES_BRANCH:-main}"

command -v node >/dev/null || { echo "需要 node >= 20"; exit 1; }
command -v pnpm >/dev/null || { echo "需要 pnpm（npm i -g pnpm@10）"; exit 1; }
node -e 'const m=+process.versions.node.split(".")[0]; if(m<20){console.error("node 版本需 >= 20，当前 "+process.version);process.exit(1)}'

echo "== 1/3 安装依赖 =="
pnpm install --frozen-lockfile || pnpm install

echo "== 2/3 校验 + 构建 =="
node scripts/validate-content.mjs
pnpm run build

echo "== 3/3 上传 dist -> $PROJECT（分支 $BRANCH） =="
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "未检测到 CLOUDFLARE_API_TOKEN，将走 wrangler 交互登录"
fi
npx --yes wrangler@latest pages deploy dist --project-name "$PROJECT" --branch "$BRANCH"

echo "完成。生产域名：https://amw.mtga.top/  预览：见上一条输出"
