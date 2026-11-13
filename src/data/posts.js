// 文章内容在构建时从 content/ 下的 Markdown 文件读入（Vite import.meta.glob + ?raw）。
// 新增文章 = 在对应分类目录放一个 .md，不需要改代码。

import { categories } from './categories'

export { categories }

const files = import.meta.glob('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** 解析极简 frontmatter（--- ... ---），支持字符串 / 布尔 / 方括号数组 */
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw.trim() }

  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    const key = line.slice(0, i).trim()
    let value = line.slice(i + 1).trim()
    if (!key) continue

    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
      continue
    }
    if (value === 'true' || value === 'false') {
      data[key] = value === 'true'
      continue
    }
    data[key] = value.replace(/^["']|["']$/g, '')
  }

  return { data, body: match[2].trim() }
}

const byDir = new Map(categories.map((c) => [c.dir, c.id]))

function fileMeta(path) {
  const m = /\/content\/([^/]+)\/(.+)\.md$/.exec(path)
  return m ? { dir: m[1], slug: m[2] } : { dir: '', slug: path }
}

export const posts = Object.entries(files)
  .map(([path, raw]) => {
    const { dir, slug } = fileMeta(path)
    const { data, body } = parseFrontmatter(raw)
    const category = byDir.get(dir) || categories[0].id
    return {
      id: data.id || slug,
      category,
      title: data.title || slug,
      summary: data.summary || '',
      date: data.date || '',
      tags: data.tags || [],
      placeholder: data.placeholder === true,
      body,
    }
  })
  .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1))

export function getPost(id) {
  return posts.find((p) => p.id === id)
}

export function postsByCategory(category) {
  return posts.filter((p) => p.category === category)
}

export function searchPosts(keyword) {
  const q = keyword.trim().toLowerCase()
  if (!q) return []
  return posts.filter((p) => {
    const hay = [p.title, p.summary, p.body, (p.tags || []).join(' ')].join(' ').toLowerCase()
    return hay.includes(q)
  })
}
