---
name: vue-composition-api
description: Expert review of Vue 3 Composition API patterns and reactivity system
category: review
frameworks: [vue, nuxt, quasar]
version: 1.0.0
---

# Vue Composition API Specialist

## Checklist

### Reactivity
- [ ] Correct choice: ref() vs reactive()
- [ ] shallowRef vs ref understood
- [ ] toRefs() to preserve reactivity
- [ ] readonly() for immutability
- [ ] customRef() for advanced control

### Composables
- [ ] Composable and reusable
- [ ] Return values typed
- [ ] Side effects cleaned up
- [ ] Accept injection keys
- [ ] Lazy evaluation

### Lifecycle
- [ ] Hooks registered synchronously
- [ ] onMounted/onUnmounted paired
- [ ] onScopeDispose for cleanup
- [ ] No hooks in conditionals

### Watch vs Computed
- [ ] Computed for derived state
- [ ] Watch only for side effects
- [ ] watchEffect for auto-tracking
- [ ] Proper cleanup in watch

## Advanced Patterns

### Composable Factory
```ts
function useCounter(initial = 0) {
  const count = ref(initial);
  return {
    count,
    increment: () => count.value++,
    decrement: () => count.value--,
    reset: () => count.value = initial
  };
}

const counter1 = useCounter(0);
const counter2 = useCounter(100);
```

### Provide/Inject
```ts
const StateKey: InjectionKey<Ref<number>> = Symbol('state');

export function provideState() {
  const state = ref(0);
  provide(StateKey, state);
  return state;
}

export function useState() {
  const state = inject(StateKey);
  if (!state) throw new Error('Not provided');
  return state;
}
```

### Async Composable
```ts
export function useAsyncData<T>(url: string) {
  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);

  const fetch = async () => {
    loading.value = true;
    try {
      data.value = await fetchData(url);
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetch);
  return { data, error, loading, refetch: fetch };
}
```

## Pitfalls

### ❌ Destructuring reactive
```ts
const state = reactive({ count: 0, name: 'test' });
const { count, name } = state; // ❌ Loses reactivity

// ✅ Use toRefs
const { count, name } = toRefs(state);
```

### ❌ Reactive with ref
```ts
// ❌ Wrapped in unnecessary ref
const state = ref reactive({ count: 0 });

// ✅ Just use reactive
const state = reactive({ count: 0 });
```

### ❌ Watch infinite loop
```ts
const count = ref(0);

// ❌ Modifies watched value
watch(count, () => { count.value++; });

// ✅ Use computed
const doubled = computed(() => count.value * 2);
```

### ❌ Async state updates
```ts
const data = ref(null);

// ❌ Race condition
onMounted(async () => {
  data.value = await fetchData();
});

// ✅ Track mounted state
onMounted(async () => {
  const result = await fetchData();
  if (isMounted.value) data.value = result;
});
```

## Watch Strategies

### watch vs watchEffect
```ts
// watch: Explicit dependencies
const count = ref(0);
watch(count, (new, old) => console.log(`${old} → ${new}`));

// watchEffect: Auto-tracking
watchEffect(() => console.log(`Count: ${count.value}`));

// watchPostEffect: After DOM update
watchPostEffect(() => {
  // Access DOM elements
});
```

### Deep vs Shallow
```ts
const user = ref({ profile: { name: 'test' } });

// Deep watch (expensive)
watch(user, () => {}, { deep: true });

// Shallow watch (top-level only)
watch(user, () => {}, { deep: false });
```

## Performance Tips

1. Use computed for derived state (cached)
2. Avoid watch when computed works
3. Use shallowRef/shallowReactive for large objects
4. Lazy load composables
5. Clean up subscriptions

## Composable Guidelines

```ts
// ✅ Good composable
export function useMouse() {
  const x = ref(0);
  const y = ref(0);

  const update = (e: MouseEvent) => {
    x.value = e.clientX;
    y.value = e.clientY;
  };

  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update));

  return { x, y };
}
```

- Single purpose
- Returns reactive refs
- Proper cleanup
- Accepts parameters
- Composable with others

## Best Practices

1. Use ref for primitives, reactive for objects
2. toRefs when destructuring reactive
3. Computed > watch for derived state
4. watchEffect for auto-tracking
5. Clean up side effects
6. Type all returns

## References
- [Vue 3 Reactivity](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Composables](https://vuejs.org/guide/reusability/composables.html)
- [VueUse](https://vueuse.org/)
