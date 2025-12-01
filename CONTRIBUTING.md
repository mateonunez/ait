# Contributing to AIt

Thank you for your interest in contributing to AIt! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Package Guidelines](#package-guidelines)

## Code of Conduct

Please be respectful and constructive in all interactions. We're building something together.

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 10.23.0+ (via corepack)
- Docker and Docker Compose
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/mateonunez/ait.git
cd ait

# Enable corepack for pnpm
corepack enable

# Install dependencies
pnpm install

# Start infrastructure services
pnpm start:services

# Run database migrations
pnpm migrate

# Verify setup
pnpm build
pnpm test
```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feat/` - New features (e.g., `feat/notion-connector`)
- `fix/` - Bug fixes (e.g., `fix/oauth-token-refresh`)
- `docs/` - Documentation changes (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/connector-base`)
- `test/` - Test additions or fixes (e.g., `test/ai-sdk-coverage`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `test` - Adding or fixing tests
- `chore` - Maintenance, dependencies

**Examples:**
```
feat(connectors): add Notion integration

fix(ai-sdk): resolve streaming timeout issue

docs(readme): add troubleshooting section
```

### Development Commands

```bash
# Start development servers (all packages)
pnpm dev

# Build all packages
pnpm build

# Run linting
pnpm lint
pnpm lint:fix  # Auto-fix issues

# Type checking
pnpm typecheck

# Run tests
pnpm test
pnpm test:watch  # Watch mode

# Clean build artifacts
pnpm clean
pnpm clean:all  # Including services
```

## Code Standards

### Naming Conventions

Follow clean code principles with descriptive, intention-revealing names:

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `ConnectorService`, `EmbeddingsClient` |
| Interfaces | PascalCase with `I` prefix | `IConnectorService`, `IEmbeddingsConfig` |
| Methods | camelCase | `generateEmbeddings`, `fetchUserData` |
| Variables | camelCase | `accessToken`, `embeddings` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Files | kebab-case | `connector.service.ts`, `rate-limit.error.ts` |
| Type files | `.types.ts` suffix | `connector.types.ts` |
| Scoped files | `.scope(interface\|type\|spec\|etc).ts` suffix | `connector.interface.ts`, `connector.type.ts`, `connector.spec.ts`, etc. |

### TypeScript Guidelines

1. **Strong Typing**: All functions must be strongly typed. Avoid `any` when possible.

```typescript
// Good
async function fetchData(endpoint: string, options: RequestOptions): Promise<ApiResponse> {
  // ...
}

// Avoid
async function fetchData(endpoint, options) {
  // ...
}
```

2. **Check Existing Types**: Before creating new types, check `@ait/core` and existing packages.

3. **Interface + Implementation Pattern**: Use interfaces for services.

```typescript
// Define interface
export interface IConnectorService {
  authenticate(token: string): Promise<void>;
  fetchData(): Promise<DataItem[]>;
}

// Implement
export class GitHubConnectorService implements IConnectorService {
  // ...
}
```

4. **Use `@ait/core` Utilities**: Leverage shared error handling and result types.

```typescript
import { AItError, Result, ok, err } from '@ait/core';
```

### File Organization

```
packages/{package-name}/
├── src/
│   ├── index.ts              # Public exports
│   ├── services/
│   │   └── {domain}/
│   │       ├── service.ts
│   │       └── service.types.ts
│   ├── types/
│   │   └── {domain}.ts
│   └── utils/
│       └── helpers.ts
├── test/
│   └── services/
│       └── {domain}/
│           └── service.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Formatting

We use [Biome](https://biomejs.dev/) for formatting and linting:

- **Indent**: 2 spaces
- **Line width**: 120 characters
- **Semicolons**: Required
- **Quotes**: Double quotes for strings

Run before committing:

```bash
pnpm lint:fix
```

## Testing

### Test Structure

Use `node:test` with `describe`/`it` structure:

```typescript
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  describe('methodName', () => {
    it('should do something specific', async () => {
      const result = await service.methodName('input');
      assert.strictEqual(result, 'expected');
    });

    it('should handle edge case', async () => {
      await assert.rejects(
        () => service.methodName(null),
        { message: 'Expected error message' }
      );
    });
  });
});
```

### Testing Guidelines

1. **Unit Tests**: Test services in isolation with mocked dependencies
2. **Fast & Isolated**: Tests should run quickly and not depend on external services
3. **Clear Naming**: Test names should describe the behavior being tested
4. **Coverage**: Aim for meaningful coverage, not just high percentages

### Running Tests

```bash
# All tests (starts test Docker services)
pnpm test

# Watch mode for development
pnpm test:watch

# Specific package
pnpm --filter @ait/ai-sdk test
```

## Pull Request Process

### Before Submitting

1. **Update from main**: Rebase or merge the latest changes
2. **Run checks locally**:
   ```bash
   pnpm lint
   pnpm build
   pnpm test
   ```
3. **Update documentation**: If your changes affect usage or APIs
4. **Add tests**: For new features or bug fixes

### PR Description

Include in your PR description:

- **What**: Brief description of changes
- **Why**: Motivation and context
- **How**: Implementation approach (if not obvious)
- **Testing**: How you verified the changes
- **Breaking Changes**: If any, with migration guidance

### Review Process

1. All PRs require at least one approval
2. CI checks must pass (lint, build, test)
3. Keep PRs focused and reasonably sized
4. Respond to feedback constructively
5. Squash commits when merging (if many small commits)

## Package Guidelines

### Creating a New Package

1. Create directory under appropriate location:
   - `packages/` - Core application packages
   - `packages/infrastructure/` - Infrastructure clients
   - `packages/transformers/` - Data transformation packages

2. Initialize with required files:
   ```
   packages/my-package/
   ├── src/
   │   └── index.ts
   ├── package.json
   ├── tsconfig.json
   ├── tsconfig.build.json
   └── README.md
   ```

3. Package.json template:
   ```json
   {
     "name": "@ait/my-package",
     "version": "0.1.0",
     "type": "module",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "dev": "tsc -p ./tsconfig.build.json --watch",
       "build": "tsc -p ./tsconfig.build.json",
       "test": "node --test --test-reporter spec ./test/**/*.test.ts",
       "lint": "biome format && biome lint && biome check"
     }
   }
   ```

4. Add to `pnpm-workspace.yaml` if in a new directory pattern

### Dependencies

- Use `workspace:*` protocol for internal dependencies
- Keep services loosely coupled with clear interfaces
- Minimize external dependencies when possible

```json
{
  "dependencies": {
    "@ait/core": "workspace:*"
  }
}
```

## Questions?

If you have questions or need help:

1. Check existing documentation and READMEs
2. Search existing issues
3. Open a new issue with the `question` label

Thank you for contributing!

