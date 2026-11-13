// 纯浏览器直连 GitHub REST API（无后端）。
// 需要 fine-grained PAT：Contents: Read/Write + Pull requests: Read/Write + Metadata: Read
import { repo } from '../config'

const API = 'https://api.github.com'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...authHeaders(token), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const err = new Error(
      (data && (data.message || (data.errors && data.errors[0] && data.errors[0].message))) ||
        `GitHub ${res.status}`,
    )
    err.status = res.status
    throw err
  }
  return data
}

/** UTF-8 → base64（btoa 不能直接处理中文） */
export function toBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** 检查 token 与仓库可写权限 */
export async function checkAccess(token) {
  const info = await api(`/repos/${repo.owner}/${repo.name}`, { token })
  return {
    fullName: info.full_name,
    defaultBranch: info.default_branch,
    private: info.private,
    permissions: info.permissions || null,
  }
}

async function getBaseSha(token, branch) {
  const ref = await api(`/repos/${repo.owner}/${repo.name}/git/ref/heads/${branch}`, { token })
  return ref.object.sha
}

async function getFileSha(token, path, branch) {
  try {
    const file = await api(
      `/repos/${repo.owner}/${repo.name}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
      { token },
    )
    return file && file.sha ? file.sha : null
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

/**
 * 一次提交 = 建分支 → 写文件 → 开 PR
 * 全部在前端完成，不经过任何服务器。
 */
export async function submitPullRequest({
  token,
  path,
  content,
  title,
  description,
  baseBranch = repo.branch,
}) {
  const baseSha = await getBaseSha(token, baseBranch)
  const branch = `cms/${asciiSlug(title)}-${Date.now().toString(36)}`

  // 1) 建分支
  await api(`/repos/${repo.owner}/${repo.name}/git/refs`, {
    token,
    method: 'POST',
    body: { ref: `refs/heads/${branch}`, sha: baseSha },
  })

  // 2) 写文件（已存在则带 sha 更新）
  const sha = await getFileSha(token, path, branch)
  await api(`/repos/${repo.owner}/${repo.name}/contents/${encodeURI(path)}`, {
    token,
    method: 'PUT',
    body: {
      message: `docs(content): ${title}`,
      content: toBase64(content),
      branch,
      ...(sha ? { sha } : {}),
    },
  })

  // 3) 开 PR
  const pr = await api(`/repos/${repo.owner}/${repo.name}/pulls`, {
    token,
    method: 'POST',
    body: {
      title,
      head: branch,
      base: baseBranch,
      body:
        description ||
        `由站内 CMS 提交。\n\n文件：\`${path}\`\n分支：\`${branch}\``,
    },
  })

  return { branch, prUrl: pr.html_url, number: pr.number }
}

/** 分支名只用 ASCII，避免中文 ref 在各类工具里出问题 */
export function asciiSlug(text) {
  const ascii = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return ascii || 'post'
}

export function slug(text) {
  return String(text || 'post')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'post'
}
