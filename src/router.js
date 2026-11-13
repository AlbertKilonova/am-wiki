import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import PostView from './views/PostView.vue'

// hash 模式：dist 可直接静态托管（GitHub Pages / 局域网 / 本地）
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/post/:id', name: 'post', component: PostView, props: true },
    {
      path: '/downloads',
      name: 'downloads',
      component: () => import('./views/DownloadsView.vue'),
    },
    {
      path: '/cms',
      name: 'cms',
      component: () => import('./views/CmsView.vue'),
    },
    {
      path: '/cms/downloads',
      name: 'cms-downloads',
      component: () => import('./views/DownloadCmsView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
