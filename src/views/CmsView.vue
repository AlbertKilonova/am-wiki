<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import { categories } from '../data/categories'
import { posts, getPost } from '../data/posts'
import { contentPath, editFileUrl, prefilledNewFileUrl, repo, repoConfigured } from '../config'
import { checkAccess, slug, submitPullRequest } from '../lib/github'

const route = useRoute()

const TOKEN_SESSION = 'amw-gh-token'
const TOKEN_PERSIST = 'amw-gh-token-persist'

const token = ref('')
const remember = ref(false)
const tokenState = ref('idle') // idle | checking | ok | error
const tokenMessage = ref('')

const form = ref(blankForm())
const tab = ref('write')
const busy = ref(false)
const message = ref('')
const error = ref('')
const lastPr = ref(null)
const editingId = ref('')

const category = computed(() => categories.find((c) => c.id === form.value.category))
const path = computed(() =>
  contentPath(category.value?.dir || categories[0].dir, slug(form.value.slug || form.value.title)),
)
const markdown = computed(() => compose(form.value))
const preview = computed(() => marked.parse(form.value.body || '_还没有内容_'))
const canApi = computed(() => tokenState.value === 'ok')

function blankForm() {
  return {
    title: '',
    slug: '',
    category: categories[0].id,
    date: new Date().toISOString().slice(0, 10),
    tags: '',
    summary: '',
    placeholder: false,
    body: '',
  }
}

function compose(f) {
  const lines = ['---', `title: ${f.title.trim() || '未命名'}`, `date: ${f.date || ''}`]
  const tags = f.tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (tags.length) lines.push(`tags: [${tags.join(', ')}]`)
  if (f.summary.trim()) lines.push(`summary: ${f.summary.trim()}`)
  if (f.placeholder) lines.push('placeholder: true')
  lines.push('---', '', f.body.trim(), '')
  return lines.join('\n')
}

function loadPost(id) {
  const post = getPost(id)
  if (!post) return
  editingId.value = id
  form.value = {
    title: post.title,
    slug: post.id,
    category: post.category,
    date: post.date,
    tags: (post.tags || []).join(', '),
    summary: post.summary,
    placeholder: post.placeholder,
    body: post.body,
  }
  message.value = ''
  error.value = ''
  lastPr.value = null
}

function startNew() {
  editingId.value = ''
  form.value = blankForm()
  message.value = ''
  error.value = ''
  lastPr.value = null
  tab.value = 'write'
}

/* ---------- token ---------- */

async function loadToken() {
  const persisted = localStorage.getItem(TOKEN_PERSIST)
  const session = sessionStorage.getItem(TOKEN_SESSION)
  const saved = session || persisted
  if (!saved) return
  token.value = saved
  remember.value = !!persisted
  await validateToken()
}

async function validateToken() {
  if (!token.value.trim()) {
    tokenState.value = 'idle'
    tokenMessage.value = ''
    return
  }
  tokenState.value = 'checking'
  tokenMessage.value = '正在校验…'
  try {
    const info = await checkAccess(token.value.trim())
    tokenState.value = 'ok'
    tokenMessage.value = `${info.fullName} · ${info.private ? '私有' : '公开'} · 默认分支 ${info.defaultBranch}`
  } catch (e) {
    tokenState.value = 'error'
    tokenMessage.value = e.message
  }
}

function saveToken(mode) {
  const value = token.value.trim()
  if (!value) return
  if (mode === 'remember') {
    sessionStorage.removeItem(TOKEN_SESSION)
    localStorage.setItem(TOKEN_PERSIST, value)
    remember.value = true
  } else {
    localStorage.removeItem(TOKEN_PERSIST)
    sessionStorage.setItem(TOKEN_SESSION, value)
    remember.value = false
  }
}

function clearToken() {
  token.value = ''
  sessionStorage.removeItem(TOKEN_SESSION)
  localStorage.removeItem(TOKEN_PERSIST)
  remember.value = false
  tokenState.value = 'idle'
  tokenMessage.value = ''
}

/* ---------- 提交 ---------- */

async function submitPr() {
  error.value = ''
  message.value = ''
  lastPr.value = null
  if (!form.value.title.trim()) {
    error.value = '标题不能为空'
    return
  }
  if (tokenState.value !== 'ok') {
    error.value = '请先填入并校验 GitHub Token'
    return
  }
  busy.value = true
  try {
    saveToken(remember.value ? 'remember' : 'session')
    const isNew = !editingId.value
    const result = await submitPullRequest({
      token: token.value.trim(),
      path: path.value,
      content: markdown.value,
      title: `docs(content): ${isNew ? '新增' : '更新'}《${form.value.title.trim()}》`,
      description: [
        `${isNew ? '新增' : '更新'}文章：**${form.value.title.trim()}**`,
        '',
        `- 分类：${category.value.label}`,
        `- 文件：\`${path.value}\``,
        `- 日期：${form.value.date}`,
        form.value.placeholder ? '- 标记：待补充' : '',
        '',
        '由站内 CMS 生成，请审阅内容与 frontmatter。',
      ]
        .filter((l) => l !== '')
        .join('\n'),
    })
    lastPr.value = result
    message.value = `已创建 PR #${result.number}`
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function openPrefill() {
  const url = prefilledNewFileUrl(path.value, markdown.value)
  window.open(url, '_blank', 'noopener')
  message.value = editingId.value
    ? '注意：已有文件不能预填内容，GitHub 会提示文件已存在。请改用「提交 PR」，或复制内容后手动粘贴。'
    : '已打开 GitHub 新建文件页，内容已预填；点「Create a new branch」再提 PR。'
}

function openEditOnGitHub() {
  window.open(editFileUrl(path.value), '_blank', 'noopener')
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(markdown.value)
    message.value = 'Markdown 已复制到剪贴板'
  } catch {
    error.value = '复制失败，浏览器可能拒绝了剪贴板权限'
  }
}

function downloadMarkdown() {
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${slug(form.value.slug || form.value.title)}.md`
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(async () => {
  await loadToken()
  const id = route.query.post
  if (id) loadPost(String(id))
})
</script>

<template>
  <main>
    <div class="crumbs">
      <router-link :to="{ name: 'home' }">INDEX</router-link>
      <span class="sep">/</span>
      <span>CMS</span>
    </div>

    <div class="section-head">
      <span class="no">CMS</span>
      <h2>内容编辑</h2>
      <span class="count">{{ repo.owner }}/{{ repo.name }}</span>
    </div>
    <p class="section-desc">
      纯前端 CMS：内容在本地编辑，提交时生成分支与 Pull Request，由 GitHub 审阅后自动构建。
    </p>

    <p v-if="!repoConfigured" class="banner banner-error">
      REPO_NOT_SET — 站点还没绑定你自己的仓库。到 Cloudflare Pages 的环境变量里设
      <code>VITE_REPO_OWNER</code> / <code>VITE_REPO_NAME</code> 后重新部署；在此之前可以照常编辑、预览、
      复制 Markdown 或下载 .md，只是「预填到 GitHub / 提交 PR」会指向错误地址。
    </p>
    <p v-if="message" class="banner">{{ message }}</p>
    <p v-if="error" class="banner banner-error">ERROR — {{ error }}</p>
    <p v-if="lastPr" class="banner">
      PR 已创建：<a :href="lastPr.prUrl" target="_blank" rel="noopener">{{ lastPr.prUrl }}</a>
    </p>

    <!-- 1. 访问令牌 -->
    <section class="cms-block">
      <h3 class="cms-h">01 · GitHub Token</h3>
      <p class="cms-note">
        需要 fine-grained PAT：<code>Contents: Read and write</code> +
        <code>Pull requests: Read and write</code> + <code>Metadata: Read</code>，只授权本仓库。
        Token 只存在你这台设备上，不经过任何服务器。
      </p>
      <div class="grid-2">
        <label class="field">
          <span>TOKEN</span>
          <input v-model="token" type="password" placeholder="github_pat_…" autocomplete="off" />
        </label>
        <div class="field">
          <span>操作</span>
          <div class="row-actions">
            <button class="btn" type="button" @click="validateToken">校验</button>
            <button class="btn" type="button" @click="saveToken('session')">本次会话</button>
            <button class="btn" type="button" @click="saveToken('remember')">记住设备</button>
            <button class="btn btn-danger" type="button" @click="clearToken">清除</button>
          </div>
        </div>
      </div>
      <p class="cms-state" :data-state="tokenState">
        状态：{{ tokenState === 'ok' ? '可用' : tokenState === 'checking' ? '校验中' : tokenState === 'error' ? '失败' : '未填写' }}
        <span v-if="tokenMessage"> · {{ tokenMessage }}</span>
      </p>
    </section>

    <!-- 2. 已有文章 -->
    <section class="cms-block">
      <h3 class="cms-h">02 · 已有文章</h3>
      <div class="cms-list">
        <button
          v-for="p in posts"
          :key="p.id"
          class="cms-item"
          :class="{ active: editingId === p.id }"
          type="button"
          @click="loadPost(p.id)"
        >
          <span class="cms-item-cat">{{ categories.find((c) => c.id === p.category)?.label }}</span>
          <span class="cms-item-title">{{ p.title }}</span>
          <span class="cms-item-date">{{ p.date }}</span>
        </button>
      </div>
      <button class="btn" type="button" @click="startNew">＋ 新建文章</button>
    </section>

    <!-- 3. 编辑 -->
    <section class="cms-block">
      <h3 class="cms-h">03 · {{ editingId ? '编辑' : '新建' }}</h3>

      <form class="form" @submit.prevent="submitPr">
        <div class="grid-2">
          <label class="field">
            <span>TITLE</span>
            <input v-model="form.title" type="text" placeholder="文章标题" />
          </label>
          <label class="field">
            <span>FILENAME（留空按标题生成）</span>
            <input v-model="form.slug" type="text" placeholder="versions" />
          </label>
        </div>

        <div class="grid-2">
          <label class="field">
            <span>CATEGORY</span>
            <select v-model="form.category">
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ c.label }}（content/{{ c.dir }}）
              </option>
            </select>
          </label>
          <label class="field">
            <span>DATE</span>
            <input v-model="form.date" type="date" />
          </label>
        </div>

        <div class="grid-2">
          <label class="field">
            <span>TAGS（逗号分隔）</span>
            <input v-model="form.tags" type="text" placeholder="Alight Motion, 教程" />
          </label>
          <label class="field">
            <span>SUMMARY</span>
            <input v-model="form.summary" type="text" placeholder="列表里的一句话摘要" />
          </label>
        </div>

        <label class="check">
          <input v-model="form.placeholder" type="checkbox" />
          <span>标记为「待补充」</span>
        </label>

        <div class="editor-tabs">
          <button type="button" class="tab-btn" :class="{ active: tab === 'write' }" @click="tab = 'write'">WRITE</button>
          <button type="button" class="tab-btn" :class="{ active: tab === 'preview' }" @click="tab = 'preview'">PREVIEW</button>
        </div>

        <textarea v-if="tab === 'write'" v-model="form.body" class="editor-body" spellcheck="false"
          placeholder="## 小标题&#10;&#10;- 列表&#10;- **粗体**&#10;&#10;| 表 | 格 |"></textarea>
        <div v-else class="preview markdown" v-html="preview"></div>

        <div class="field">
          <span>将要写入的路径</span>
          <input :value="path" readonly />
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit" :disabled="busy || !canApi">
            {{ busy ? '提交中…' : '提交 PR（需要 Token）' }}
          </button>
          <button class="btn" type="button" @click="openPrefill">GitHub 网页新建（免 Token）</button>
          <button class="btn" type="button" @click="openEditOnGitHub">GitHub 网页编辑</button>
          <button class="btn" type="button" @click="copyMarkdown">复制 Markdown</button>
          <button class="btn" type="button" @click="downloadMarkdown">下载 .md</button>
        </div>
        <p class="cms-note">
          「免 Token」通道会打开 GitHub 的新建文件页并预填内容；没有仓库写权限的人会被引导 fork 后提 PR。
          已有文件不支持预填，请用「提交 PR」或复制内容后手动粘贴。
        </p>
      </form>
    </section>
  </main>
</template>
