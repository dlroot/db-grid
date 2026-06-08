# Storybook Stories for db-grid

This directory contains Storybook stories that demonstrate all db-grid features.

## Running Storybook

```bash
# Install dependencies
npm install

# Run Storybook
npm run storybook
```

## Building Static Storybook

```bash
npm run build-storybook
```

The static build will be output to `storybook-static/`.

## Story Structure

### DbGrid.stories.ts - Basic Features
- Basic Grid
- Large Data (10K rows)
- Editable Grid
- Pinned Columns
- Row Selection
- Row Grouping
- Tree Data
- Themes (Alpine, Balham, Material)
- Sparklines

### DbGrid-Advanced.stories.ts - Enterprise Features
- Master-Detail
- Pivot Table
- Range Selection
- Row Drag & Drop
- Row Pinning
- Cell Spanning
- Undo/Redo
- Clipboard Operations

## Adding New Stories

1. Create a new `.stories.ts` file in `src/stories/`
2. Import the meta configuration
3. Export story objects with `render` functions

Example:
```typescript
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { DbGridModule } from '../../projects/db-grid/src/lib/angular/db-grid.module';

const meta: Meta = {
  title: 'DB Grid/Your Category',
  decorators: [
    moduleMetadata({
      imports: [DbGridModule],
    }),
  ],
};

export default meta;

export const YourStory: StoryObj = {
  render: () => ({
    template: `<db-grid ...></db-grid>`,
    props: { ... },
  }),
};
```

## Deployment

Stories are automatically built and deployed to GitHub Pages via CI/CD.

See `.github/workflows/` for deployment configuration.
