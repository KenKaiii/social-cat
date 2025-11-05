# Module Testing System

Automated testing infrastructure for all 140+ workflow modules.

## Quick Start

```bash
# Generate tests for new/missing modules
npm run test:generate

# Check module test coverage
npm run test:coverage

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Directory Structure

```
tests/
  ├── README.md                 # This file
  ├── templates/                # Test templates for generators
  │   ├── utility-module.template.ts
  │   ├── api-module.template.ts
  │   └── database-module.template.ts
  ├── fixtures/                 # Shared test data
  │   ├── mock-responses/       # API response mocks
  │   └── test-data/            # Sample data for testing
  └── scripts/
      ├── generate-tests.ts     # Auto-generate missing tests
      └── check-coverage.ts     # Track module test status

src/modules/
  [category]/
    [module].ts                 # Module implementation
    __tests__/
      [module].test.ts          # Co-located tests
```

## Adding a New Module

When you create a new module, **automatically generate its test**:

```bash
# 1. Create your module
touch src/modules/utilities/my-new-module.ts

# 2. Generate test scaffold
npm run test:generate

# 3. Implement the test
vim src/modules/utilities/__tests__/my-new-module.test.ts
```

## Test Templates

### Utility Module (No External APIs)

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../my-module';

describe('my-module', () => {
  describe('myFunction', () => {
    it('works correctly', () => {
      expect(myFunction('input')).toBe('expected');
    });

    it('handles edge cases', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

### API Module (With External Calls)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myApiFunction } from '../my-api-module';

vi.mock('external-sdk', () => ({
  Client: vi.fn().mockImplementation(() => ({
    method: vi.fn().mockResolvedValue({ data: 'mock' }),
  })),
}));

describe('my-api-module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls API correctly', async () => {
    const result = await myApiFunction('param');
    expect(result).toBeDefined();
  });

  it('handles errors', async () => {
    // Mock implementation here
  });
});
```

## Module Test Status

Run `npm run test:coverage` to see which modules have tests:

```
✅ utilities/datetime.ts
✅ utilities/string-utils.ts
❌ utilities/new-module.ts (MISSING TEST)
✅ social/twitter.ts
...

Coverage: 87/140 modules (62%)
```

## Testing Priorities

**Priority 1: Core Infrastructure** (Required)
- `src/lib/workflows/executor.ts` - Variable resolution, module calling
- `src/lib/workflows/module-registry.ts` - Registry validation
- `src/lib/workflows/control-flow.ts` - Loops, conditions

**Priority 2: Utility Modules** (Easy wins)
- All `src/modules/utilities/*` - No API mocking needed

**Priority 3: External API Modules** (Requires mocks)
- `src/modules/social/*`
- `src/modules/communication/*`
- `src/modules/ai/*`

**Priority 4: Integration** (Later)
- Multi-step workflow execution
- Error handling & retries

## Coverage Goals

- ✅ **70%+** function coverage
- ✅ **90%+** core infrastructure coverage
- ✅ All modules have at least basic tests
- ✅ All error paths tested

## CI/CD Integration

Tests run automatically on:
- Every commit (via pre-commit hook)
- Pull requests
- Main branch pushes

## Common Patterns

### Mocking Environment Variables

```typescript
beforeEach(() => {
  process.env.API_KEY = 'test-key';
});
```

### Mocking Logger

Already mocked globally in `vitest.setup.ts` - no action needed.

### Testing Circuit Breakers

```typescript
import { createCircuitBreaker } from '@/lib/resilience';

it('opens circuit after failures', async () => {
  const breaker = createCircuitBreaker(failingFn, { name: 'test' });
  // Test implementation
});
```

### Testing Rate Limiters

```typescript
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';

it('enforces rate limits', async () => {
  const limiter = createRateLimiter({ maxConcurrent: 1, minTime: 100 });
  // Test implementation
});
```

## Maintenance

**After adding a module:**
1. Run `npm run test:generate` to create test scaffold
2. Implement test cases
3. Run `npm test` to verify

**Before committing:**
1. Run `npm run test:coverage` to check status
2. Ensure no critical modules are untested
3. Run `npm run test:run` to verify all pass

## References

- [Vitest Docs](https://vitest.dev)
- [Testing Best Practices](https://vitest.dev/guide/best-practices.html)
- Module Testing Examples: `src/modules/utilities/__tests__/datetime.test.ts`
