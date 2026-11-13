// 仓库与站点配置。
// 换仓库时改这里，或用构建期环境变量覆盖（Cloudflare Pages → Settings → Environment variables）：
//   VITE_REPO_OWNER / VITE_REPO_NAME / VITE_REPO_BRANCH / VITE_SITE_URL
const env = (import.meta && import.meta.env) || {}

export const PLACEHOLDER_OWNER = 'YOUR_GITHUB_USER'
export const PLACEHOLDER_NAME = 'REPO_NAME'

export const repo = {
  owner: env.VITE_REPO_OWNER || PLACEHOLDER_OWNER,
  name: env.VITE_REPO_NAME || PLACEHOLDER_NAME,
  branch: env.VITE_REPO_BRANCH || 'main',
}

/** 仓库是否已配置：未配置时 CMS 只保留「预填 / 复制 / 下载」，不硬闯 GitHub */
export const repoConfigured =
  repo.owner !== PLACEHOLDER_OWNER && repo.name !== PLACEHOLDER_NAME && !repo.owner.startsWith('YOUR_')

export const site = {
  title: 'AlightMotionWiki',
  // 生产域名；末尾统一带斜杠
  url: (env.VITE_SITE_URL || 'https://amw.mtga.top/').replace(/\/+$/, '/'),
  description:
    'Alight Motion 中文知识库：版本差异、使用教程与站内协作说明，由社区以 Pull Request 维护。',
}

/** 内容文件在仓库里的路径 */
export function contentPath(categoryDir, slug) {
  return `content/${categoryDir}/${slug}.md`
}

/** GitHub 网页新建文件（支持预填内容，无需 token） */
export function prefilledNewFileUrl(path, content) {
  const base = `https://github.com/${repo.owner}/${repo.name}/new/${repo.branch}`
  const params = new URLSearchParams({ filename: path, value: content })
  return `${base}?${params.toString()}`
}

/** GitHub 网页编辑已有文件（不支持预填内容） */
export function editFileUrl(path) {
  return `https://github.com/${repo.owner}/${repo.name}/edit/${repo.branch}/${path}`
}

export function blobUrl(path) {
  return `https://github.com/${repo.owner}/${repo.name}/blob/${repo.branch}/${path}`
}

/** 仓库主页（页脚 / 关于处使用） */
export function repoUrl() {
  return repoConfigured ? `https://github.com/${repo.owner}/${repo.name}` : 'https://github.com'
}
