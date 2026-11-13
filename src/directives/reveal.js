// 滚动进入视口的遮罩揭示指令 + 给 v-html 内容批量加动效的辅助函数
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const observer =
  typeof window !== 'undefined' && 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      )
    : null

export const vReveal = {
  mounted(el, binding) {
    el.classList.add('reveal')
    const delay = Number(binding.value || 0)
    if (delay > 0) el.style.transitionDelay = `${delay}ms`

    if (reduceMotion || !observer) {
      el.classList.add('is-visible')
      return
    }
    observer.observe(el)
  },
  unmounted(el) {
    if (observer) observer.unobserve(el)
  },
}

/**
 * v-html 渲染出的内容没法挂指令，这里直接对子节点做 stagger 揭示。
 * 返回清理函数。
 */
export function revealChildren(root, { step = 45, max = 14 } = {}) {
  if (!root) return () => {}
  if (reduceMotion || !observer) return () => {}

  const nodes = Array.from(
    root.querySelectorAll(
      'h1, h2, h3, p, ul, ol, table, blockquote, pre, figure, hr',
    ),
  ).slice(0, max * 6)

  nodes.forEach((node, i) => {
    node.classList.add('reveal')
    node.style.transitionDelay = `${Math.min(i, max) * step}ms`
    observer.observe(node)
  })

  return () => nodes.forEach((n) => observer.unobserve(n))
}
