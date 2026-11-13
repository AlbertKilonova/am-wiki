<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import { categories, getPost, postsByCategory } from '../data/posts'
import { contentPath, editFileUrl } from '../config'
import { revealChildren } from '../directives/reveal'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()

const post = computed(() => getPost(props.id))
const cat = computed(() => categories.find((c) => c.id === post.value?.category))
const catNo = computed(() =>
  String(categories.findIndex((c) => c.id === post.value?.category) + 1).padStart(2, '0'),
)
const html = computed(() => (post.value ? marked.parse(post.value.body) : ''))
const ghPath = computed(() =>
  post.value ? contentPath(cat.value?.dir || '01-tutorial', post.value.id) : '',
)

const siblings = computed(() => (post.value ? postsByCategory(post.value.category) : []))
const index = computed(() => siblings.value.findIndex((p) => p.id === props.id))
const prev = computed(() => (index.value > 0 ? siblings.value[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < siblings.value.length - 1 ? siblings.value[index.value + 1] : null,
)

function back() {
  const tab = post.value?.category
  router.push({ name: 'home', query: tab && tab !== 'tutorial' ? { tab } : {} })
}

/* 正文由 v-html 生成，挂不上指令，这里手动做 stagger 揭示 */
const bodyRef = ref(null)
let cleanup = () => {}

function animateBody() {
  cleanup()
  cleanup = revealChildren(bodyRef.value, { step: 55, max: 16 })
}

onMounted(async () => {
  await nextTick()
  animateBody()
})
watch(() => props.id, async () => {
  await nextTick()
  animateBody()
})
onBeforeUnmount(() => cleanup())
</script>

<template>
  <main>
    <div class="crumbs">
      <a href="#" @click.prevent="back">INDEX</a>
      <span class="sep">/</span>
      <a href="#" @click.prevent="back">{{ catNo }} {{ cat ? cat.label : '—' }}</a>
      <span class="sep">/</span>
      <span>{{ post ? post.id.toUpperCase() : 'NOT FOUND' }}</span>
    </div>

    <article v-if="post">
      <h1 class="post-title">
        <span class="line"><span class="line-inner">{{ post.title }}</span></span>
      </h1>
      <div class="art-meta">
        <span>{{ post.date }}</span>
        <span class="tag" v-for="t in post.tags" :key="t">{{ t }}</span>
        <span v-if="post.placeholder" class="tag flag">待补充</span>
        <a class="art-edit" :href="editFileUrl(ghPath)" target="_blank" rel="noopener">GITHUB ↗</a>
      </div>
      <div class="post-body" ref="bodyRef" v-html="html"></div>

      <div class="pager" v-reveal="120">
        <router-link v-if="prev" :to="{ name: 'post', params: { id: prev.id } }">
          <span>← PREVIOUS</span>
          <span>{{ prev.title }}</span>
        </router-link>
        <span v-else></span>
        <router-link v-if="next" class="next" :to="{ name: 'post', params: { id: next.id } }">
          <span>NEXT →</span>
          <span>{{ next.title }}</span>
        </router-link>
      </div>
    </article>

    <div v-else class="empty">
      NOT FOUND —
      <a href="#" @click.prevent="back" style="color: var(--accent)">BACK TO INDEX</a>
    </div>
  </main>
</template>
