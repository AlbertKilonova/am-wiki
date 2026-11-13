import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 独立域名部署（Cloudflare Pages / amw.mtga.top）：base 用根路径。
// 若需挂到子目录（如 GitHub Pages 项目站），改回 base: './'。
export default defineConfig({
  base: '/',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 8192,
    sourcemap: false,
    target: 'es2020',
  },
})
