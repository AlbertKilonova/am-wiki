// 复用的 GitHub Token 状态机（文章 CMS 与下载 CMS 共用同一存储键）
import { computed, ref } from 'vue'
import { checkAccess } from './github'

const TOKEN_SESSION = 'amw-gh-token'
const TOKEN_PERSIST = 'amw-gh-token-persist'

export function useGithubToken() {
  const token = ref('')
  const remember = ref(false)
  const state = ref('idle') // idle | checking | ok | error
  const message = ref('')

  const canApi = computed(() => state.value === 'ok')

  async function validate() {
    if (!token.value.trim()) {
      state.value = 'idle'
      message.value = ''
      return
    }
    state.value = 'checking'
    message.value = '正在校验…'
    try {
      const info = await checkAccess(token.value.trim())
      state.value = 'ok'
      message.value = info.fullName + ' · ' + (info.private ? '私有' : '公开') + ' · 默认分支 ' + info.defaultBranch
    } catch (e) {
      state.value = 'error'
      message.value = e.message
    }
  }

  async function load() {
    const persisted = localStorage.getItem(TOKEN_PERSIST)
    const session = sessionStorage.getItem(TOKEN_SESSION)
    const saved = session || persisted
    if (!saved) return
    token.value = saved
    remember.value = !!persisted
    await validate()
  }

  function save(mode) {
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

  function clear() {
    token.value = ''
    sessionStorage.removeItem(TOKEN_SESSION)
    localStorage.removeItem(TOKEN_PERSIST)
    remember.value = false
    state.value = 'idle'
    message.value = ''
  }

  return { token, remember, state, message, canApi, validate, load, save, clear }
}
