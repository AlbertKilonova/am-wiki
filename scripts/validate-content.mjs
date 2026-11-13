#!/usr/bin/env node
// 校验 content/ 下的 Markdown：frontmatter 必填项、日期格式、分类目录、id 冲突。
// CI 里跑：node scripts/validate-content.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { categories } from '../src/data/categories.js'

// Windows 上 URL.pathname 会得到 /D:/...，必须走 fileURLToPath 才是可用的本地路径
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONTENT = join(ROOT, 'content')
const errors = []
const warnings = []

const dirs = new Set(categories.map((c) => c.dir))

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.md')) out.push(p)
  }
  return out
}

function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) return { data: {}, body: raw, hasFrontmatter: false }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
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
  return { data, body: m[2].trim(), hasFrontmatter: true }
}

const files = walk(CONTENT)
const seen = new Map()

for (const file of files) {
  // 统一成 POSIX 分隔符，否则 Windows 上 relative() 会返回反斜杠路径
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const raw = readFileSync(file, 'utf8')
  const { data, body, hasFrontmatter } = parseFrontmatter(raw)
  const parts = rel.split('/')
  const dir = parts[1]
  const slug = parts[parts.length - 1].replace(/\.md$/, '')

  if (!hasFrontmatter) {
    errors.push(`${rel}: 缺少 frontmatter（文件要以 --- 开头）`)
    continue
  }
  if (!dirs.has(dir)) {
    errors.push(`${rel}: 目录 "${dir}" 不在 categories.js 里（现有：${[...dirs].join(', ')}）`)
  }
  if (!data.title) errors.push(`${rel}: 缺少 title`)
  if (!data.date) errors.push(`${rel}: 缺少 date`)
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push(`${rel}: date 必须是 YYYY-MM-DD，当前 "${data.date}"`)
  } else if (Number.isNaN(Date.parse(data.date))) {
    errors.push(`${rel}: date 不是合法日期 "${data.date}"`)
  }
  if (!data.summary) warnings.push(`${rel}: 没有 summary（列表里会显示为空）`)
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    errors.push(`${rel}: tags 要写成 [a, b] 数组`)
  }
  if (!body) warnings.push(`${rel}: 正文为空`)
  if (data.placeholder !== undefined && typeof data.placeholder !== 'boolean') {
    errors.push(`${rel}: placeholder 只能是 true/false`)
  }

  const id = data.id || slug
  if (seen.has(id)) errors.push(`${rel}: id "${id}" 与 ${seen.get(id)} 重复`)
  else seen.set(id, rel)
}

// 分类是否为空（提示，不报错）
for (const c of categories) {
  const n = files.filter((f) =>
    relative(CONTENT, f).replace(/\\/g, '/').startsWith(c.dir + '/'),
  ).length
  if (n === 0) warnings.push(`分类「${c.label}」(${c.dir}) 下没有文章`)
}

console.log(`检查 ${files.length} 个 Markdown 文件`)
for (const w of warnings) console.log('  warn  ' + w)

if (errors.length) {
  for (const e of errors) console.error('  ERROR ' + e)
  console.error(`\n校验失败：${errors.length} 个错误`)
  process.exit(1)
}

console.log('校验通过 ✅')
