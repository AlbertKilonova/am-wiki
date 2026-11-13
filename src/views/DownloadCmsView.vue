<script setup>
import { computed, ref } from 'vue'
import { contentPath, editFileUrl, prefilledNewFileUrl, repoConfigured } from '../config'
import { slug, submitPullRequest } from '../lib/github'
import { useGithubToken } from '../lib/useToken'
import { downloads } from '../data/downloads'

const today = () => new Date().toISOString().slice(0, 10)
const empty = () => ({
  name: '',
  filename: '',
  version: '',
  date: today(),
  url: '',
  image: '',
  summary: '',
})

const form = ref(empty())
const busy = ref(false)
const error = ref('')
const result = ref(null)
const copied = ref(false)

const { token, remember, state, message, canApi, validate, load, save, clear } = useGithubToken()

const fileSlug = computed(() => {
  const typed = form.value.filename.trim()
  return typed ? slug(typed) : slug(form.value.name)
})
const path = computed(() => contentPath('02-downloads', fileSlug.value))
const existing = computed(() => downloads.some((d) => d.slug === fileSlug.value))

/** YAML 标量：带特殊字符时加双引号，避免冒号 / # 被当成结构 */
function yaml(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  // 解析器按第一个冒号切分并剥掉一层首尾引号：只有真会破坏结构的内容才加引号
  if (/[:#\[\]{}&*!|>%@`]|^\s|\s$/.test(text)) return '"' + text.replace(/"/g, "'") + '"'
  return text
}

const markdown = computed(() => {
  const body = form.value.summary.trim() || '（下载条目：名称、版本、链接、图片与简介都在 frontmatter 里。）'
  const lines = [
    '---',
    'title: ' + yaml(form.value.name),
    form.value.version.trim() ? 'version: ' + yaml(form.value.version) : null,
    'date: ' + form.value.date,
    form.value.url.trim() ? 'url: ' + yaml(form.value.url) : null,
    form.value.image.trim() ? 'image: ' + yaml(form.value.image) : null,
    'summary: ' + yaml(form.value.summary),
    '---',
    '',
    body,
    '',
  ].filter((line) => line !== null)
  return lines.join('\n')
})

const previewName = computed(() => form.value.name.trim() || '名称')
const previewInitial = computed(() => previewName.value.slice(0, 1).toUpperCase())

function fill(d) {
  form.value = {
    name: d.name,
    filename: d.slug,
    version: d.version,
    date: d.date || today(),
    url: d.url,
    image: d.image,
    summary: d.summary,
  }
  error.value = ''
  result.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function reset() {
  form.value = empty()
  error.value = ''
  result.value = null
}

async function submit() {
  error.value = ''
  result.value = null
  if (!form.value.name.trim()) { error.value = '名称必填。'; return }
  busy.value = true
  try {
    const title = '下载条目：' + form.value.name.trim() + (form.value.version.trim() ? ' ' + form.value.version.trim() : '')
    result.value = await submitPullRequest({
      token: token.value,
      path: path.value,
      content: markdown.value,
      title,
      description: '由站内下载 CMS 提交。\n\n文件：`' + path.value + '`\n名称：' + form.value.name.trim() + (form.value.version.trim() ? '\n版本：' + form.value.version.trim() : '') + (form.value.url.trim() ? '\n链接：' + form.value.url.trim() : ''),
    })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(markdown.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch (e) {
    error.value = e.message
  }
}

function download() {
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileSlug.value + '.md'
  a.click()
  URL.revokeObjectURL(url)
}

load()
</script>

<template>
  <main>
    <div class="crumbs">
      <router-link :to="{ name: 'home' }">INDEX</router-link>
      <span class="sep">/</span>
      <router-link :to="{ name: 'downloads' }">DOWNLOAD</router-link>
      <span class="sep">/</span>
      <span>CMS</span>
    </div>

    <div class="section-head">
      <span class="no">CMS</span>
      <h2>下载维护</h2>
      <span class="count">{{ downloads.length }} ITEMS</span>
    </div>
    <p class="section-desc">
      一个改版一个文件，写在 <code>content/02-downloads/&lt;slug&gt;.md</code>。只维护五个字段：名称、版本、下载链接、图片、简介。
      <router-link :to="{ name: 'downloads' }" class="inline-link">← 看下载页</router-link>
    </p>

    <p v-if="!repoConfigured" class="banner banner-error">
      REPO_NOT_SET — 构建时没有注入 VITE_REPO_OWNER / VITE_REPO_NAME。仍可填写字段、复制或下载文件，再手动提交。
    </p>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <p v-if="result" class="banner banner-ok">
      已提交 PR #{{ result.number }} ·
      <a :href="result.prUrl" target="_blank" rel="noopener noreferrer">去 GitHub 查看</a>
    </p>

    <section class="cms-block">
      <h3 class="cms-h">01 · TOKEN</h3>
      <div class="dlc-token">
        <input
          v-model="token"
          class="input"
          type="password"
          placeholder="github_pat_..."
          autocomplete="off"
          @change="validate"
        />
        <button class="btn" @click="validate">校验</button>
        <button class="btn" @click="save('session')">仅本次</button>
        <button class="btn" @click="save('remember')">记住</button>
        <button class="btn" @click="clear">清除</button>
      </div>
      <p class="dlc-hint" :class="{ 'is-ok': state === 'ok', 'is-error': state === 'error' }">
        {{ message || 'fine-grained PAT：Contents 读/写 · Pull requests 读/写 · Metadata 读。只存在这台设备的浏览器里。' }}
      </p>
    </section>

    <section class="cms-block">
      <h3 class="cms-h">02 · 条目字段</h3>
      <div class="dlc-grid">
        <label class="field">
          <span>名称 NAME *</span>
          <input v-model="form.name" class="input" placeholder="Alight Motion 4.2 稳定版" />
        </label>
        <label class="field">
          <span>文件名 FILENAME</span>
          <input v-model="form.filename" class="input" placeholder="留空按名称生成" />
        </label>
        <label class="field">
          <span>版本 VERSION</span>
          <input v-model="form.version" class="input" placeholder="4.2.3" />
        </label>
        <label class="field">
          <span>日期 DATE</span>
          <input v-model="form.date" class="input" type="date" />
        </label>
        <label class="field dlc-wide">
          <span>下载链接 URL</span>
          <input v-model="form.url" class="input" placeholder="https://..." />
        </label>
        <label class="field dlc-wide">
          <span>图片 IMAGE</span>
          <input v-model="form.image" class="input" placeholder="https://...（留空显示首字母）" />
        </label>
        <label class="field dlc-wide">
          <span>简介 SUMMARY</span>
          <textarea v-model="form.summary" class="input" rows="3" placeholder="一两句话说清这个改版是什么、适合谁。"></textarea>
        </label>
      </div>
      <p class="dlc-path">
        将写入 <code>{{ path }}</code>
        <span v-if="existing" class="tag">已存在 · 提交会更新</span>
      </p>
    </section>

    <section class="cms-block">
      <h3 class="cms-h">03 · 预览与提交</h3>
      <div class="dl-grid dlc-preview">
        <article class="dl-card">
          <div class="dl-thumb">
            <img v-if="form.image.trim()" :src="form.image" :alt="previewName" />
            <span v-else class="dl-thumb-fallback">{{ previewInitial }}</span>
          </div>
          <div class="dl-body">
            <div class="dl-head">
              <h3 class="dl-name">{{ previewName }}</h3>
              <span v-if="form.version.trim()" class="tag">{{ form.version }}</span>
            </div>
            <p class="dl-summary">{{ form.summary || '还没有简介。' }}</p>
            <div class="dl-foot">
              <span v-if="form.url.trim()" class="btn btn-primary dl-get">下载 ↗</span>
              <span v-else class="dl-pending">链接待补充</span>
              <span class="dl-date">{{ form.date }}</span>
            </div>
          </div>
        </article>
      </div>

      <div class="dlc-actions">
        <button class="btn btn-primary" :disabled="!canApi || busy" @click="submit">
          {{ busy ? '提交中…' : '提交 PR' }}
        </button>
        <a class="btn" :href="prefilledNewFileUrl(path, markdown)" target="_blank" rel="noopener noreferrer">GitHub 网页新建</a>
        <a class="btn" :href="editFileUrl(path)" target="_blank" rel="noopener noreferrer">编辑已有文件</a>
        <button class="btn" @click="copy">{{ copied ? '已复制' : '复制 Markdown' }}</button>
        <button class="btn" @click="download">下载 .md</button>
        <button class="btn" @click="reset">清空</button>
      </div>
      <p class="dlc-hint">{{ canApi ? 'Token 已就绪，可直接提交 PR。' : '提交 PR 需要先校验 Token；没有 Token 也能走网页新建或复制。' }}</p>
    </section>

    <section class="cms-block">
      <h3 class="cms-h">04 · 已有条目</h3>
      <ul class="dlc-list">
        <li v-for="d in downloads" :key="d.id">
          <button class="dlc-item" @click="fill(d)">
            <b>{{ d.name }}</b>
            <span>{{ d.version || '—' }}</span>
            <span class="dlc-date">{{ d.date }}</span>
          </button>
        </li>
        <li v-if="!downloads.length" class="dlc-empty">还没有条目，先在上面填第一条。</li>
      </ul>
    </section>
  </main>
</template>
