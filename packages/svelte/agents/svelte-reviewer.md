---
name: svelte-reviewer
description: Review Svelte and SvelteKit code for best practices and reactivity patterns
category: review
frameworks: [svelte, sveltekit]
version: 1.0.0
---

# Svelte Code Reviewer

## Checklist

### Component Design
- [ ] Single Responsibility Principle
- [ ] Props typed with TypeScript
- [ ] Events with createEventDispatcher
- [ ] Slots for composition
- [ ] Stores for shared state

### Reactivity (Svelte 5 Runes)
- [ ] Using runes: $state, $derived, $effect
- [ ] $state for local reactive state
- [ ] $derived for computed (preferred)
- [ ] $effect for side effects only
- [ ] Fine-grained reactivity understood

### SvelteKit Patterns
- [ ] Load functions for data fetching
- [ ] Server vs client code separated
- [ ] Form actions for mutations
- [ ] Error handling with +error.svelte

### Performance
- [ ] Virtual lists for long lists
- [ ] Images optimized
- [ ] Lazy-loaded components
- [ ] No unnecessary reactivity

## Svelte 5 Runes

### State vs Derived
```svelte
<script lang="ts">
let count = $state(0);
let doubled = $derived(count * 2); // Computed, cached

function increment() {
  count++;
}
</script>

<p>{count} / {doubled}</p>
```

### Effects
```svelte
<script lang="ts">
let count = $state(0);

// ✅ Side effect with cleanup
$effect(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(timer);
});

// ❌ Don't use $effect for derived state
// $effect(() => { doubled = count * 2; }); // WRONG
// ✅ Use $derived instead
let doubled = $derived(count * 2);
</script>
```

### Props & Events
```svelte
<script lang="ts">
interface Props {
  name: string;
  count?: number;
}
let { name, count = 0 }: Props = $props();

interface Events {
  click: MouseEvent;
}
const emit = createEventDispatcher<Events>();
</script>

<button on:click={(e) => emit('click', e)}>{name}: {count}</button>
```

## SvelteKit Patterns

### Load Functions
```typescript
// ✅ Server load for data
export async function load({ fetch }) {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  return { posts };
}

// ✅ Universal (server + client)
export async function load({ url, fetch }) {
  const query = url.searchParams.get('q');
  const res = await fetch(`/api/search?q=${query}`);
  return { results: await res.json() };
}
```

### Form Actions
```svelte
<script lang="ts">
import { enhance } from '$app/forms';
let { form } = $props();
</script>

<form method="POST" use:enhance>
  <input type="email" name="email" required />
  <button>Submit</button>
</form>

{#if form?.success}<p>Success!</p>{/if}
{#if form?.error}<p>{form.error}</p>{/if}
```

```typescript
// +page.server.ts
export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');
    if (!email?.includes('@')) return { error: 'Invalid email' };
    return { success: true };
  }
};
```

## Anti-patterns

### ❌ Don't Mutate Props
```svelte
<script>
export let prop = { value: 0 };
prop.value = 10; // ❌ Don't mutate props!

// ✅ Create local state
let localValue = $state(prop.value);
localValue = 10; // OK
</script>
```

### ❌ Unnecessary Reactivity
```svelte
<script>
// ❌ Never changes - doesn't need reactivity
const title = $state("My App");

// ✅ Static constant
const title = "My App";

// ✅ Reactive state
let count = $state(0);
</script>
```

### ❌ Infinite $effect Loop
```svelte
<script>
let count = $state(0);

// ❌ Infinite loop!
$effect(() => { count++; });

// ✅ Log without mutation
$effect(() => { console.log(count); });
</script>
```

## Store Pattern
```typescript
import { writable } from 'svelte/store';

function createCount() {
  const { subscribe, update } = writable(0);
  return {
    subscribe,
    increment: () => update(n => n + 1),
    decrement: () => update(n => n - 1)
  };
}

export const countStore = createCount();
```

```svelte
<script>
import { countStore } from './stores';
</script>

<button on:click={() => countStore.increment()}>
  {$countStore}
</button>
```

## Best Practices

1. Use $derived for computed
2. Avoid $effect when $derived works
3. Virtualize long lists
4. Lazy load components
5. Don't mutate props
6. Use static for constants

## References
- [Svelte 5 Runes](https://svelte.dev/docs/runes)
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Migration](https://svelte.dev/docs/svelte-5)
