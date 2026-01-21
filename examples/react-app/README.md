# React App Example - Compound Workflow

This example demonstrates using Compound Workflow with a React + TypeScript + Vite application.

## 🎯 What This Example Shows

- **Plan Workflow**: Creating a user profile card component
- **Work Workflow**: Implementing the component with best practices
- **Review Workflow**: Checking accessibility and performance
- **Compound Workflow**: Recording patterns for reuse

## 📦 Project Setup

### 1. Create React App

```bash
# Using Vite (recommended)
npm create vite@latest . -- --template react-ts

# Or using Create React App
npx create-react-app . --template typescript
```

### 2. Install Compound Workflow

```bash
npm install @compound-workflow/core @compound-workflow/react
```

### 3. Initialize

```bash
npx compound init
```

## 🚀 Example Usage

### Scenario 1: Creating a New Component

**Step 1: Plan**

```
I need to create a UserProfileCard component that displays:
- User avatar (circular, 80px)
- User name (h2, bold)
- User bio (paragraph, muted)
- Stats row (followers, following, posts)
- Action button (follow/unfollow)

Please help me plan this component.
```

**Expected Output:**
- Component structure breakdown
- Props interface
- State management strategy
- Styling approach (CSS modules, Tailwind, etc.)
- Testing strategy

**Step 2: Work**

```
Implement the UserProfileCard component based on the plan.
Use TypeScript and CSS modules.
Add unit tests with Vitest.
```

**Expected Output:**
- `UserProfileCard.tsx` - Component file
- `UserProfileCard.module.css` - Styles
- `UserProfileCard.test.tsx` - Tests
- `index.ts` - Export file

**Step 3: Review**

```
Review the UserProfileCard component for:
- WCAG 2.1 AA accessibility
- React best practices
- Performance optimization
- Security issues
```

**Expected Review:**
- ✅ Semantic HTML elements
- ✅ ARIA labels for avatar and button
- ✅ Keyboard navigation
- ✅ Alt text for images
- ✅ Color contrast checks
- ⚡ React.memo for performance
- ⚡ Lazy loading for images
- 🔒 Input validation if editable

**Step 4: Compound**

```
Record the component design pattern.
We used a compound component pattern with props-based configuration.
```

**Expected Result:**
- `.compound/docs/react/components/profile-card.md` - Documented pattern
- Reusable for similar components

---

### Scenario 2: Performance Optimization

**Context:**
App has slow initial load time (3.5s).

**Step 1: Plan**

```
My React app has slow initial load. Help me optimize it.
Current bundle size: 2.3MB
Load time: 3.5s
```

**Expected Plan:**
- Code splitting strategy
- Lazy loading routes
- Bundle analysis approach
- Image optimization
- Dependency audit

**Step 2: Work**

```
Implement the performance optimizations:
1. Route-based code splitting with React.lazy
2. Add suspense boundaries
3. Optimize images with next/image or react-image
4. Remove unused dependencies
5. Add bundle analyzer
```

**Expected Output:**
- `App.tsx` - With React.lazy and Suspense
- `routes/` - Split route components
- `vite-plugin-visualizer` config
- Updated package.json (removed unused deps)

**Step 3: Review**

```
Review the performance optimizations.
Check for:
- Proper error boundaries
- Loading states
- Bundle size reduction
- No regressions
```

**Step 4: Compound**

```
Record the code splitting pattern.
We achieved 60% bundle reduction and 1.2s load time.
```

---

### Scenario 3: Accessibility Audit

**Context:**
Existing component needs accessibility review.

**Component:**
```tsx
// Modal.tsx
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <button onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}
```

**Review Request:**

```
Review this Modal component for accessibility.
Focus on:
- Keyboard trap
- Focus management
- ARIA attributes
- Screen reader support
```

**Expected Review Feedback:**

**Issues Found:**
1. ❌ No focus trap (tab escapes modal)
2. ❌ No focus management (focus not restored)
3. ❌ Missing ARIA attributes
4. ❌ No `role="dialog"`
5. ❌ No `aria-modal="true"`
6. ❌ Close button not accessible (× is not descriptive)
7. ❌ No escape key handler

**Recommended Fixes:**
```tsx
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus modal
      modalRef.current?.focus();

      // Trap focus within modal
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleTab);

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleTab);
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';

        // Restore focus
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-content" ref={modalRef} tabIndex={-1}>
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="modal-close"
        >
          <span aria-hidden="true">×</span>
        </button>
        {children}
      </div>
    </div>
  );
}
```

---

## 📁 Project Structure

```
react-app/
├── .compound/
│   ├── workflows/          # Custom workflows
│   ├── agents/             # Custom agents
│   ├── docs/               # Knowledge base (auto-generated)
│   │   ├── react/
│   │   │   ├── components/
│   │   │   │   └── profile-card.md
│   │   │   ├── performance/
│   │   │   │   └── code-splitting.md
│   │   │   └── patterns/
│   │   └── accessibility/
│   │       └── focus-trap.md
│   └── config.json
├── src/
│   ├── components/
│   │   ├── UserProfileCard/
│   │   │   ├── UserProfileCard.tsx
│   │   │   ├── UserProfileCard.module.css
│   │   │   ├── UserProfileCard.test.tsx
│   │   │   └── index.ts
│   │   └── Modal/
│   │       ├── Modal.tsx
│   │       ├── Modal.module.css
│   │       └── Modal.test.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🎓 Key Learnings

### 1. Workflow Integration

**Plan → Work → Review → Compound**

Each workflow builds on the previous:
- **Plan**: Establishes requirements
- **Work**: Implements based on plan
- **Review**: Validates implementation
- **Compound**: Captures learnings

### 2. Agent Selection

**Universal Agents:**
- `requirements-analyzer` - Break down features
- `code-generator` - Scaffold components
- `accessibility-reviewer` - WCAG checks
- `performance-reviewer` - Optimization

**React-Specific Agents:**
- `react-reviewer` - React best practices
- `react-hooks-specialist` - Hooks expertise
- `react-performance` - React optimization

### 3. Knowledge Growth

The `.compound/docs/` directory becomes a team knowledge base:
- Reusable patterns
- Proven solutions
- Best practices
- Lessons learned

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test specific component
npm test UserProfileCard
```

---

## 🚀 Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

## 🤝 Contributing

This is an example project. Feel to:
- Fork and experiment
- Add new scenarios
- Improve documentation
- Share learnings

---

**Happy Coding with Compound Workflow!** 🎉
