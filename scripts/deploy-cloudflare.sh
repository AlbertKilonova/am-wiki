#!/usr/bin/env bash
# 手动直传发布到 Cloudflare（Workers + Static Assets 方式）
# 依赖：CLOUDFLARE_API_TOKEN（Workers Scripts: Edit）+ CLOUDFLARE_ACCOUNT_ID，或先执行 npx wrangler login
set -euo pipefail
cd "$(dirname "$0")/.."

command -v node >/dev/null || { echo "需要 node >= 20"; exit 1; }
command -v pnpm >/dev/null || { echo "需要 pnpm（npm i -g pnpm@10）"; exit 1; }
node -e 'const m=+process.versions.node.split(".")[0]; if(m<20){console.error("node 版本需 >= 20，当前 "+process.version);process.exit(1)}'

echo "== 1/3 安装依赖 =="
pnpm install --frozen-lockfile || pnpm install

echo "== 2/3 校验 + 构建 =="
node scripts/validate-content.mjs
pnpm run build

echo "== 3/3 上传 dist -> Worker am-wiki =="
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "未检测到 CLOUDFLARE_API_TOKEN，将走 wrangler 交互登录"
fi
npx --yes wrangler@latest deploy

echo "完成。生产域名：https://amw.mtga.top/（自定义域绑定后生效）"
