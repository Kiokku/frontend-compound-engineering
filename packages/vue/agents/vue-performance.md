---
name: vue-performance
description: Optimize Vue 3 application performance through reactivity, rendering, and bundle analysis
category: review
frameworks: [vue, nuxt, quasar]
version: 1.0.0
---

# Vue Performance Optimization

## Checklist

### Reactivity
- [ ] Use `shallowRef`/`shallowReactive` for large objects
- [ ] Prefer `computed` over `watch` for derived state
- [ ] Avoid unnecessary reactivity on static data

### Rendering
- [ ] Use `v-once` for static content
- [ ] Use `v-memo` in v-for for expensive items
- [ ] Implement virtual scrolling (vue-virtual-scroller)
- [ ] Use `defineAsyncComponent` for code splitting
- [ ] Apply `v-show` vs `v-if` correctly

### Component & Bundle
- [ ] Split large components
- [ ] Keep props minimal and primitive
- [ ] Tree-shaking enabled
- [ ] Lazy routes with dynamic imports

## Key Patterns

### Shallow Reactivity
```vue
<script setup>
// ❌ Bad: Deep reactivity overhead
const largeData = ref({ items: [], metadata: {} });

// ✅ Good: Shallow ref
const largeData = shallowRef({ items: [], metadata: {} });
function update(newItems) {
  largeData.value = { ...largeData.value, items: newItems };
  triggerRef(largeData);
}
</script>
```

### v-memo for Lists
```vue
<template>
  <!-- ✅ Only re-renders when dependencies change -->
  <div v-for="item in items" :key="item.id" v-memo="[item.id, item.updated]">
    <expensive-component :data="item" />
  </div>
</template>
```

### Async Components
```vue
<script setup>
const Heavy = defineAsyncComponent({
  loader: () => import('./Heavy.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,
  timeout: 5000
});
</script>
```

### v-once for Static Content
```vue
<template>
  <!-- Renders once, never updates -->
  <div v-once>
    <h1>{{ staticTitle }}</h1>
  </div>
</template>
```

## Common Pitfalls

### ❌ Static Data as Reactive
```ts
// ❌ Don't
const config = reactive({ apiUrl: 'https://api.example.com' });
// ✅ Do
const config = { apiUrl: 'https://api.example.com' };
```

### ❌ Watch vs Computed
```ts
// ❌ Inefficient
const count = ref(0);
const doubled = ref(0);
watch(count, (v) => { doubled.value = v * 2; });

// ✅ Efficient
const doubled = computed(() => count.value * 2);
```

### ❌ Inline Handlers
```vue
<!-- ❌ Creates function on each render -->
<button @click="() => count++">Inc</button>
<!-- ✅ Reuses reference -->
<button @click="increment">Inc</button>
```

### ❌ Props Destructuring
```vue
<script setup>
// ❌ Loses reactivity
const { items } = defineProps<{ items: Item[] }>();
// ✅ Preserves reactivity
const { items } = toRefs(defineProps<{ items: Item[] }>());
</script>
```

## Bundle Optimization

```ts
// ✅ Lazy routes
const routes = [
  { path: '/', component: () => import('./views/Home.vue') }
];
```

## Virtual Scrolling
```vue
<script setup>
import { useVirtualList } from '@vueuse/core';
const { list, containerProps, wrapperProps } = useVirtualList(items, { itemHeight: 50 });
</script>

<template>
  <div v-bind="containerProps" style="height: 300px; overflow: auto;">
    <div v-bind="wrapperProps">
      <div v-for="{ data } in list" :key="data.id">{{ data.text }}</div>
    </div>
  </div>
</template>
```

## Best Practices

1. Minimize reactive data (only trigger updates)
2. Use computed for derived state
3. Lazy load heavy components
4. Virtual scroll 100+ item lists
5. Profile with Vue DevTools
6. Measure before optimizing

## Metrics
- FCP < 1.8s, LCP < 2.5s, TTI < 3.8s
- Main bundle < 200KB gzipped

## References
- [Vue 3 Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- [VueUse Performance](https://vueuse.org/core/#performance)
