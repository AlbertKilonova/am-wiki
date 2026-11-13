<script setup>
import { downloads } from '../data/downloads'

const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
  <main>
    <div class="crumbs">
      <router-link :to="{ name: 'home' }">INDEX</router-link>
      <span class="sep">/</span>
      <span>DOWNLOAD</span>
    </div>

    <div class="section-head">
      <span class="no">02</span>
      <h2>下载</h2>
      <span class="count">{{ pad(downloads.length) }} ENTRIES</span>
    </div>
    <p class="section-desc">
      各改版的版本、下载地址与简介。条目由站内 CMS 录入，每次改动都是一条 PR。
      <router-link :to="{ name: 'cms-downloads' }" class="inline-link">去维护 →</router-link>
    </p>

    <div v-if="downloads.length" class="dl-grid">
      <article v-for="(d, i) in downloads" :key="d.id" class="dl-card">
        <div class="dl-thumb">
          <img v-if="d.image" :src="d.image" :alt="d.name" loading="lazy" />
          <span v-else class="dl-thumb-fallback">{{ pad(i + 1) }}</span>
        </div>
        <div class="dl-body">
          <div class="dl-head">
            <h3 class="dl-name">{{ d.name }}</h3>
            <span v-if="d.version" class="tag">{{ d.version }}</span>
          </div>
          <p class="dl-summary">{{ d.summary || '还没有简介。' }}</p>
          <div class="dl-foot">
            <a
              v-if="d.url"
              class="btn btn-primary dl-get"
              :href="d.url"
              target="_blank"
              rel="noopener noreferrer"
            >下载 ↗</a>
            <span v-else class="dl-pending">链接待补充</span>
            <span class="dl-date">{{ d.date }}</span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty">
      NO ENTRIES — 去 <router-link :to="{ name: 'cms-downloads' }" class="inline-link">下载 CMS</router-link> 添加第一条。
    </div>

    <p class="dl-note">
      改版均非官方发布，安装前请自行确认来源与风险。
    </p>
  </main>
</template>
