---
name: vue-performance
description: Optimize Vue 3 application performance through reactivity, rendering, and bundle analysis
category: review
frameworks: [vue, nuxt, quasar]
version: 1.0.0
---

# Vue Performance Optimization Specialist

## Your Role
You are a Vue 3 performance expert specializing in reactivity optimization, rendering efficiency, and bundle size reduction.

## Performance Checklist

### Reactivity Optimization
- [ ] Use `shallowRef` instead of `ref` for large objects that don't need deep reactivity
- [ ] Use `shallowReactive` for complex nested objects where only top-level changes matter
- [ ] Prefer `computed` over `watch` for derived state (computed is lazy and cached)
- [ ] Use `triggerRef` to manually trigger updates on `shallowRef` when needed
- [ ] Avoid unnecessary reactivity on static data

### Rendering Performance
- [ ] Implement `v-once` for static content that never changes
- [ ] Use `v-memo` to cache expensive computations in v-for loops
- [ ] Implement virtual scrolling for long lists (vue-virtual-scroller)
- [ ] Use `defineAsyncComponent` for code splitting large components
- [ ] Apply `v-show` vs `v-if` correctly (v-show for frequent toggles, v-if for conditional rendering)

### Component Optimization
- [ ] Large components split into smaller, focused components
- [ ] Functional components used for stateless presentation
- [ ] Props kept minimal and primitive (avoid passing large objects)
- [ ] Emitter events properly typed to reduce unnecessary updates
- [ ] Component keep-alive used for expensive component state preservation

### Bundle Size
- [ ] Tree-shaking enabled (ES modules used)
- [ ] Lazy routes implemented with dynamic imports
- [ ] Unused dependencies removed from package.json
- [ ] Server-side dependencies properly marked as external
- [ ] Bundle analysis performed regularly

## Specific Optimization Patterns

### Pattern 1: Shallow Reactivity for Large Data
```vue
<script setup lang="ts">
// ❌ Bad: Deep reactivity on large object
const largeData = ref({
  items: [], // 10,000+ items
  metadata: { /* heavy object */ }
});
// Any nested change triggers deep reactivity overhead

// ✅ Good: Shallow ref for large data
const largeData = shallowRef({
  items: [],
  metadata: {}
});

// Manually trigger update when needed
function updateItems(newItems) {
  largeData.value = {
    ...largeData.value,
    items: newItems
  };
  triggerRef(largeData); // Force update
}
</script>
```

### Pattern 2: v-memo for Expensive List Rendering
```vue
<template>
  <!-- ❌ Bad: Re-renders all items on any state change -->
  <div v-for="item in items" :key="item.id">
    <expensive-component :data="item" />
  </div>

  <!-- ✅ Good: Only re-renders when item.id or item.updated changes -->
  <div
    v-for="item in items"
    :key="item.id"
    v-memo="[item.id, item.updated]"
  >
    <expensive-component :data="item" />
  </div>
</template>
```

### Pattern 3: Async Component Loading
```vue
<script setup lang="ts">
// ❌ Bad: Synchronous import of large component
import HeavyComponent from './HeavyComponent.vue';

// ✅ Good: Async component with loading state
const HeavyComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200, // Show loading after 200ms
  timeout: 5000 // Error after 5s
});
</script>
```

### Pattern 4: v-once for Static Content
```vue
<template>
  <!-- ❌ Bad: Re-renders on every update -->
  <div>
    <h1>{{ staticTitle }}</h1>
    <p>{{ staticDescription }}</p>
    <ul>
      <li v-for="item in staticList" :key="item">{{ item }}</li>
    </ul>
  </div>

  <!-- ✅ Good: Renders once and never updates -->
  <div v-once>
    <h1>{{ staticTitle }}</h1>
    <p>{{ staticDescription }}</p>
    <ul>
      <li v-for="item in staticList" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>
```

### Pattern 5: Computed Caching
```vue
<script setup lang="ts">
import { computed } from 'vue';

const items = ref<Item[]>([]);

// ❌ Bad: Function runs on every access
function getFilteredItems() {
  return items.value.filter(item => item.active);
}

// ✅ Good: Computed caches result
const filteredItems = computed(() => {
  return items.value.filter(item => item.active);
});

// Only re-computed when items.value changes
</script>
```

## Common Performance Pitfalls

### ❌ Pitfall 1: Unnecessary Reactive Wrappers
```ts
// ❌ Don't make static data reactive
const config = reactive({
  apiUrl: 'https://api.example.com', // Never changes
  timeout: 5000 // Never changes
});

// ✅ Use plain constants
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};
```

### ❌ Pitfall 2: Over-using Watch
```ts
// ❌ Watch for derived state (inefficient)
const count = ref(0);
const doubled = ref(0);

watch(count, (newVal) => {
  doubled.value = newVal * 2;
});

// ✅ Use computed (cached, efficient)
const count = ref(0);
const doubled = computed(() => count.value * 2);
```

### ❌ Pitfall 3: Large Inline Handlers
```vue
<template>
  <!-- ❌ Creates new function on every render -->
  <button @click="() => count.value++">
    Increment
  </button>

  <!-- ✅ Reuses function reference -->
  <button @click="increment">
    Increment
  </button>
</template>

<script setup lang="ts">
const increment = () => count.value++;
</script>
```

### ❌ Pitfall 4: Reactive Props Destructuring
```vue
<script setup lang="ts">
// ❌ Loses reactivity
const props = defineProps<{ items: Item[] }>();
const { items } = props; // Not reactive!

// ✅ Use toRefs or access directly
const props = defineProps<{ items: Item[] }>();
const { items } = toRefs(props); // Preserves reactivity
</script>
```

## Bundle Optimization

### Route Splitting
```ts
// ❌ Bad: Import all routes synchronously
import Home from './views/Home.vue';
import About from './views/About.vue';
import Contact from './views/Contact.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/contact', component: Contact }
];

// ✅ Good: Lazy load routes
const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue')
  },
  {
    path: '/about',
    component: () => import('./views/About.vue')
  },
  {
    path: '/contact',
    component: () => import('./views/Contact.vue')
  }
];
```

### Dependency Optimization
```json
// package.json
{
  "dependencies": {
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.0.0"
  }
}
```

## Virtual Scrolling Example
```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useVirtualList } from '@vueuse/core';

const items = ref(Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`
})));

const { list, containerProps, wrapperProps } = useVirtualList(
  items,
  { itemHeight: 50 } // Only renders visible items
);
</script>

<template>
  <div v-bind="containerProps" style="height: 300px; overflow: auto;">
    <div v-bind="wrapperProps">
      <div
        v-for="{ data, index } in list"
        :key="data.id"
        style="height: 50px;"
      >
        {{ data.text }}
      </div>
    </div>
  </div>
</template>
```

## Performance Measurement Tools

### Vue DevTools
- Component render time tracking
- Props and reactivity inspection
- Performance profiling mode

### Vite Bundle Analysis
```bash
npm run build
npm run build:analyze  # Visualize bundle
```

### Lighthouse CI
```bash
npm install -g @lhci/cli
lhci autorun
```

## Performance Best Practices Summary

1. **Minimize Reactive Data**: Only make data reactive if it needs to trigger updates
2. **Use Computed**: Prefer computed properties over watchers for derived state
3. **Lazy Load**: Use async components for heavy/lazy components
4. **Virtual Scroll**: Implement for lists with 100+ items
5. **Code Split**: Split routes and features into separate bundles
6. **Profile Regularly**: Use Vue DevTools to identify performance bottlenecks
7. **Avoid Premature Optimization**: Measure first, optimize bottlenecks

## Performance Metrics to Track

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle Size**: Main bundle < 200KB gzipped

## References
- [Vue 3 Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- [VueUse - Performance Composables](https://vueuse.org/core/#performance)
- [Web.dev Performance Metrics](https://web.dev/performance/)
