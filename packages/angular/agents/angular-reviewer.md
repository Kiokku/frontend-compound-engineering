---
name: angular-reviewer
description: Review Angular code for best practices, performance, and Angular-specific patterns
category: review
frameworks: [angular, nestjs]
version: 1.0.0
---

# Angular Code Reviewer

## Checklist

### Component Architecture
- [ ] Standalone components (Angular 15+)
- [ ] Signals for reactive state (Angular 16+)
- [ ] Inputs/Outputs properly typed
- [ ] Lifecycle hooks correct (ngOnInit, ngOnDestroy)

### RxJS & Reactive
- [ ] Observables unsubscribed (async pipe, takeUntilDestroyed)
- [ ] switchMap vs mergeMap vs concatMap correctly used
- [ ] shareReplay() for HTTP caching

### Dependency Injection
- [ ] Services at appropriate level
- [ ] inject() in standalone components
- [ ] providedIn: 'root' for singletons

### Performance
- [ ] ChangeDetection.OnPush where possible
- [ ] TrackBy with *ngFor
- [ ] Lazy loading routes
- [ ] Bundle optimized

## Patterns

### ❌ Old vs ✅ Modern
```typescript
// ❌ Old: NgModule + manual subscribe
@Component({ selector: 'app-user' })
export class UserComponent implements OnInit {
  constructor(private userService: UserService) {}
  ngOnInit() {
    this.userService.getUsers().subscribe(users => {
      this.users = users; // Memory leak!
    });
  }
}

// ✅ Modern: Standalone + signals
@Component({
  selector: 'app-user',
  template: '@for (user of users(); track user.id) { <div>{{user.name}}</div> }',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserComponent {
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);
  users = signal<User[]>([]);

  constructor() {
    this.userService.getUsers().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(users => this.users.set(users));
  }
}
```

## RxJS Guide

### Operators
- **switchMap**: Cancel previous (search)
- **mergeMap**: Parallel (independent)
- **concatMap**: Sequential (order matters)
- **exhaustMap**: Ignore while active

```typescript
// ✅ Search pattern
search(query$: Observable<string>) {
  return query$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  );
}

// ✅ Auto-unsubscribe
data$ = this.http.get('/api/data').pipe(takeUntilDestroyed(this.destroyRef));
// <div *ngIf="data$ | async as data">{{data}}</div>
```

## Performance

### OnPush + TrackBy
```typescript
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class ItemComponent {
  @Input() items: Item[] = [];
  trackById(index: number, item: Item): string { return item.id; }
}
```

### Dependency Injection
```typescript
// Singleton
@Injectable({ providedIn: 'root' })
export class UserService { }

// Component-scoped
@Component({ providers: [WidgetService], standalone: true })
export class WidgetComponent {
  private widgetService = inject(WidgetService);
}
```

## Pitfalls

### ❌ Default Change Detection
```typescript
// ❌ Slow - checks everything
@Component({ changeDetection: ChangeDetectionStrategy.Default })
// ✅ Fast - only references
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
```

### ❌ Template Processing
```html
<!-- ❌ Runs on every CD -->
<div *ngFor="let item of items">{{item.price|currency:'USD'}}</div>
```

```typescript
// ✅ Pre-process
processedItems = computed(() =>
  this.items().map(item => ({...item, price: formatCurrency(item.price)}))
);
```

### ❌ DOM Manipulation
```typescript
// ❌ Breaks Angular
document.getElementById('app').style.color = 'red';

// ✅ Use Renderer2
constructor(private r: Renderer2) {
  r.setStyle(el.nativeElement, 'color', 'red');
}
```

## Best Practices

1. Standalone + signals
2. OnPush by default
3. takeUntilDestroyed for unsubscribe
4. TrackBy for *ngFor
5. inject() in standalone
6. Pre-process data

## References
- [Angular Style Guide](https://angular.dev/style-guide)
- [Angular Signals](https://angular.dev/guide/signals)
- [RxJS Marbles](https://rxmarbles.com/)
