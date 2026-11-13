<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categories, posts, postsByCategory } from '../data/posts'
import { downloads } from '../data/downloads'

const route = useRoute()
const router = useRouter()

// 下载是独立页面，首页不再有它的文章流
const tabs = categories.filter((c) => c.id !== 'downloads')

const active = computed(() => {
  const t = route.query.tab
  return tabs.some((c) => c.id === t) ? t : 'tutorial'
})

onMounted(() => {
  if (route.query.tab === 'downloads') router.replace({ name: 'downloads' })
})

const current = computed(() => tabs.find((c) => c.id === active.value))
const index = computed(() => tabs.findIndex((c) => c.id === active.value) + 1)
const list = computed(() => postsByCategory(active.value))
const countOf = (id) => posts.filter((p) => p.category === id).length
const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
  <main>
    <section class="hero">
      <div>
        <h1 class="hero-title">
          <span class="line"><span class="line-inner">Alight</span></span>
          <span class="line"><span class="line-inner accent">Motion Wiki</span></span>
        </h1>
        <p class="hero-lead">社区维护的 Alight Motion 知识库：版本差异、使用教程与站内协作说明。原始判断保留，不替作者改口。</p>
      </div>
      <div class="hero-meta" v-reveal="260">
        <div class="meta-row" v-for="c in tabs" :key="c.id">
          <span>{{ c.label }}</span>
          <b>{{ pad(countOf(c.id)) }}</b>
        </div>
        <router-link class="meta-row meta-row-link" :to="{ name: 'downloads' }">
          <span>下载</span>
          <b>{{ pad(downloads.length) }}</b>
        </router-link>
        <div class="meta-row">
          <span>Total</span>
          <b>{{ pad(posts.length + downloads.length) }}</b>
        </div>
      </div>
    </section>

    <div class="section-head" v-reveal="120">
      <span class="no">{{ pad(index) }}</span>
      <h2>{{ current.label }}</h2>
      <span class="count">{{ pad(list.length) }} ENTRIES</span>
    </div>
    <p class="section-desc" v-reveal="160">{{ current.desc }}</p>

    <div class="rows">
      <router-link
        v-for="(p, i) in list"
        :key="p.id"
        class="row"
        v-reveal="220 + i * 90"
        :to="{ name: 'post', params: { id: p.id } }"
      >
        <div class="row-index">{{ pad(i + 1) }}</div>
        <div>
          <h3 class="row-title">{{ p.title }}</h3>
          <p class="row-desc">{{ p.summary }}</p>
          <div class="row-tags">
            <span class="tag" v-for="t in p.tags" :key="t">{{ t }}</span>
            <span v-if="p.placeholder" class="tag flag">待补充</span>
          </div>
        </div>
        <div class="row-date">{{ p.date }}</div>
      </router-link>
    </div>

    <div v-if="!list.length" class="empty">NO ENTRIES</div>
  </main>
</template>
