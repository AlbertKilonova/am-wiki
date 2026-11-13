// 下载条目：一个改版一个文件，frontmatter 就是数据结构。
// title = 名称，version = 版本，url = 下载链接，image = 图片，summary = 简介，date = 更新时间。
import { parseFrontmatter } from './posts'

const files = import.meta.glob('/content/02-downloads/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function slugOf(path) {
  const m = /\/content\/02-downloads\/(.+)\.md$/.exec(path)
  return m ? m[1] : path
}

export const downloads = Object.entries(files)
  .map(([path, raw]) => {
    const { data } = parseFrontmatter(raw)
    const slug = slugOf(path)
    return {
      id: data.id || slug,
      slug,
      name: data.title || slug,
      version: data.version || '',
      url: data.url || '',
      image: data.image || '',
      summary: data.summary || '',
      date: data.date || '',
    }
  })
  .sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? 1 : -1))

export function getDownload(id) {
  return downloads.find((d) => d.id === id)
}
