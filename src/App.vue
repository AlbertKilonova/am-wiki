<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categories, getPost, searchPosts } from './data/posts'

const router = useRouter()
const route = useRoute()
const theme = ref('light')
const keyword = ref('')

const results = computed(() => searchPosts(keyword.value))

const activeTab = computed(() => {
  if (route.name === 'downloads' || route.name === 'cms-downloads') return 'downloads'
  if (route.name === 'post') return getPost(route.params.id)?.category || null
  if (route.name === 'cms') return 'contributions'
  if (route.name !== 'home') return null
  const t = route.query.tab
  return categories.some((c) => c.id === t) ? t : 'tutorial'
})

function navTarget(id) {
  return id === 'downloads'
    ? { name: 'downloads' }
    : { name: 'home', query: id === 'tutorial' ? {} : { tab: id } }
}

watch(() => route.fullPath, () => { keyword.value = '' })

onMounted(() => {
  // 瑞士风格默认走纸白，除非用户自己切过
  theme.value = localStorage.getItem('amw-theme') || 'light'
  applyTheme()
})

watch(theme, () => {
  localStorage.setItem('amw-theme', theme.value)
  applyTheme()
})

function applyTheme() {
  document.documentElement.dataset.theme = theme.value
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

function openPost(id) {
  keyword.value = ''
  router.push({ name: 'post', params: { id } })
}
</script>

<template>
  <header class="masthead">
    <div class="masthead-inner">
      <router-link to="/" class="brand">
        Alight Motion<span class="amex">®</span>
        <span class="wiki">WIKI</span>
      </router-link>

      <nav class="nav">
        <router-link
          v-for="(c, i) in categories"
          :key="c.id"
          class="nav-item"
          :class="{ active: c.id === activeTab }"
          :aria-current="c.id === activeTab ? 'page' : undefined"
          :to="navTarget(c.id)"
          @click="keyword = ''"
        >
          <i>0{{ i + 1 }}</i>{{ c.label }}
        </router-link>
      </nav>

      <div class="masthead-tools">
        <input
          v-model="keyword"
          class="search-input"
          type="search"
          placeholder="SEARCH"
          aria-label="搜索"
        />
        <button class="theme-btn" @click="toggleTheme" :aria-label="theme === 'dark' ? '浅色' : '深色'">
          {{ theme === 'dark' ? '◐' : '◑' }}
        </button>
      </div>
    </div>
  </header>

  <transition name="drop">
    <div v-if="keyword.trim()" class="search-panel">
    <h4>SEARCH / 「{{ keyword.trim() }}」 / {{ results.length }} HITS</h4>
    <a
      v-for="p in results"
      :key="p.id"
      class="search-item"
      href="#"
      @click.prevent="openPost(p.id)"
    >
      <div class="t">{{ p.title }}</div>
      <div class="s">{{ p.summary }}</div>
    </a>
      <div v-if="!results.length" class="empty">NO MATCH</div>
    </div>
  </transition>

  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <footer>
    <div class="footer-inner">
      <span>AlightMotionWiki <span class="accent">/</span> Community Maintained</span>
      <span>
        <router-link :to="{ name: 'cms' }" class="footer-link">CMS</router-link>
        <span class="accent"> / </span>Swiss&nbsp;International&nbsp;Type
        <span class="accent"> / </span>Static · Vue 3
      </span>
    </div>
  </footer>
</template>
