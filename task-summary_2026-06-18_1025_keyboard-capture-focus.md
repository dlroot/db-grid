# Task Summary: Keyboard/Scrollbar Conflict (Round 3)

## Objective
User reported persistent conflict between keyboard arrow navigation and the scrollbar's native scroll behavior, causing up/down movement to scroll but not highlight the focused cell.

## Fixes Applied (commit b339068)

### 1. Capture-phase keydown handler
Changed the gridContainer keydown binding from:
```html
(keydown)="onKeyDown($event)"
```
to:
```html
(keydown.capture)="onKeyDown($event)"
```
This ensures the grid receives the keydown event **before** the bodyContainer/scrollbar's native arrow-key scroll behavior is applied, so `event.preventDefault()` can reliably stop it.

### 2. Focus grid on click
Added a `(click)` handler on `gridContainer` that calls:
```typescript
this.gridContainer.nativeElement.focus({ preventScroll: true });
```
This ensures the gridContainer is always the active element after the user clicks inside the grid, so the scrollbar cannot steal focus and receive arrow-key events.

### 3. tabindex="-1" on scroll containers
Previously added `tabindex="-1"` to `bodyContainer` and `virtualScroll` so they never become implicit keyboard-focus targets for scroll events.

## Files Changed
- `db-grid.component.ts` (template + keydown handler + click focus handler)

## Commit: b339068 pushed to origin/master
