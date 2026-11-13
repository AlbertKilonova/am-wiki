#!/bin/sh
# 在手机上构建：/sdcard 是 FUSE，不支持 pnpm 需要的符号链接，
# 所以把源码同步到 /root/build 再装依赖 / 构建，最后把 dist 拷回来。
set -e
SRC=$(cd "$(dirname "$0")" && pwd)
WORK=/root/build/am-wiki

mkdir -p /root/build
rm -rf "$WORK"
mkdir -p "$WORK"
cp -r "$SRC"/package.json "$SRC"/vite.config.js "$SRC"/index.html "$SRC"/src "$SRC"/content "$WORK"/

cd "$WORK"
pnpm install --reporter=silent || echo "[warn] install 有告警，继续构建"
pnpm run build

rm -rf "$SRC/dist"
cp -r "$WORK/dist" "$SRC/dist"
echo "构建完成：$SRC/dist"
echo "本地预览：python3 -m http.server 8899 --bind 127.0.0.1 --directory $SRC/dist"
