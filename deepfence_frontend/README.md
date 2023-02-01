# deepfence_frontend

This is a JS Monorepo for deepfence frontend projects.

## What's inside?

This monorepo uses

- Turborepo
- PNPM for package management

### Apps and Packages

- `dashboard`: deepfence dashboard app [Vite + React + TS]
- `ui-components`: React UI Component library with deepfence branding used by deepfence applications
- `tailwind-preset`: tailwind configurations used by all UI apps and packages

### Utilities

This turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
pnpm run build
```

### Develop

To develop all apps and packages, run the following command:

```
pnpm run dev
```

### Check for code formatting issues

To check for code formatting issues, run the following command:

```
pnpm run format
```

### Fix code formatting issues

To fix code formatting issues automatically, run the following command:

```
pnpm run format:fix
```

### Check for linting issues

To check for lint errors, run the following command:

```
pnpm run lint
```

### Fix linting issues

To fix linting issues automatically, run the following command:

```
pnpm run lint:fix
```
