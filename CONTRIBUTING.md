# Contributing to b0t

Most contributors use coding agents (like Claude Code) to contribute. This guide provides simple prompts you can use with your coding agent.

## Quick Start Prompts

### Setting Up to Contribute

**Prompt for your coding agent:**
```
Fork the b0t repository at https://github.com/kenkai/b0t, then:
1. Clone my fork locally
2. Run the setup script: npm run setup
3. Start the dev environment: npm run dev:full
4. Verify everything works: npm run typecheck && npm run lint && npm run test
```

### Adding a New Module

**Prompt for your coding agent:**
```
Create a new [SERVICE_NAME] module in b0t:

1. Look at existing modules in src/modules/[CATEGORY]/ for reference
2. Create src/modules/[CATEGORY]/[service].ts with:
   - Zod schemas for type validation
   - Rate limiting with createRateLimiter()
   - Circuit breaker with createCircuitBreaker()
   - JSDoc comments with examples
   - Proper error handling
3. Create tests in src/modules/[CATEGORY]/__tests__/[service].test.ts
4. The module registry auto-generates, so just export functions properly
5. Run: npm run typecheck && npm run lint && npm run test
6. Fix any errors before committing

Service API docs: [PASTE_API_DOCS_URL]
```

**Example:**
```
Create a Linear module in b0t with functions to create issues and search issues.
API docs: https://linear.app/docs/api
```

### Fixing a Bug

**Prompt for your coding agent:**
```
Fix the bug described in GitHub issue #[NUMBER]:
1. Read the issue and understand the problem
2. Locate the relevant code
3. Fix the bug
4. Add/update tests to prevent regression
5. Run: npm run typecheck && npm run lint && npm run test
6. Verify the fix works locally
```

### Adding a Feature

**Prompt for your coding agent:**
```
Add [FEATURE_DESCRIPTION] to b0t:
1. Review existing code structure in relevant areas
2. Implement the feature following existing patterns
3. Add tests for new functionality
4. Run: npm run typecheck && npm run lint && npm run test
5. Test the feature manually in the UI if applicable
```

## Submitting Your Changes

**Prompt for your coding agent:**
```
Submit my changes as a pull request:
1. Create a feature branch: git checkout -b feature/[description]
2. Commit changes with clear message: git commit -m "feat: [description]"
3. Push to my fork: git push origin feature/[description]
4. Open a PR to kenkai/b0t main branch
5. Fill out the PR template that appears
```

## Code Quality Checklist

Before submitting, these **MUST** pass:
- `npm run typecheck` (zero errors)
- `npm run lint` (zero warnings)
- `npm run test` (all passing)

**Prompt for your coding agent:**
```
Before I submit this PR, run all code quality checks and fix any issues:
npm run typecheck && npm run lint && npm run test
```

## Module Structure Reference

```
src/modules/[category]/[service].ts

Required:
- Zod schemas for validation
- Rate limiting: createRateLimiter()
- Circuit breakers: createCircuitBreaker()
- JSDoc comments with @example
- Proper TypeScript types (no 'any')
- Error handling with context

Tests:
src/modules/[category]/__tests__/[service].test.ts
```

## Common Categories

- `ai/` - AI services (OpenAI, Claude, etc.)
- `business/` - CRM, ERP, accounting
- `communication/` - Email, chat, messaging
- `data/` - Databases, storage
- `devtools/` - Developer tools, APIs
- `ecommerce/` - Shopping platforms
- `productivity/` - Project management, notes
- `social/` - Social media platforms
- `utilities/` - HTTP, date/time, validation

## Questions?

- [GitHub Issues](https://github.com/kenkai/b0t/issues) - Bug reports & feature requests
- [GitHub Discussions](https://github.com/kenkai/b0t/discussions) - General questions

## License

By contributing, you agree that your contributions will be licensed under AGPL-3.0.
