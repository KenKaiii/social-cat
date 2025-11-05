#!/usr/bin/env tsx

/**
 * Module Test Coverage Checker
 *
 * Tracks which modules have tests and reports coverage statistics.
 * Run: npm run test:coverage
 */

import fs from 'fs';
import path from 'path';

const MODULES_DIR = path.join(process.cwd(), 'src/modules');

interface ModuleStats {
  category: string;
  moduleName: string;
  hasTest: boolean;
  testPath?: string;
}

interface CategoryStats {
  category: string;
  total: number;
  tested: number;
  untested: string[];
}

function scanModules(): ModuleStats[] {
  const modules: ModuleStats[] = [];

  if (!fs.existsSync(MODULES_DIR)) {
    console.error(`Error: Modules directory not found: ${MODULES_DIR}`);
    return modules;
  }

  const categories = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const category of categories) {
    const categoryPath = path.join(MODULES_DIR, category);
    const files = fs.readdirSync(categoryPath)
      .filter(f => f.endsWith('.ts') && f !== 'index.ts');

    for (const file of files) {
      const moduleName = file.replace('.ts', '');
      const testPath = path.join(categoryPath, '__tests__', `${moduleName}.test.ts`);
      const hasTest = fs.existsSync(testPath);

      modules.push({
        category,
        moduleName,
        hasTest,
        testPath: hasTest ? testPath : undefined,
      });
    }
  }

  return modules;
}

function groupByCategory(modules: ModuleStats[]): CategoryStats[] {
  const categories = new Map<string, CategoryStats>();

  for (const module of modules) {
    if (!categories.has(module.category)) {
      categories.set(module.category, {
        category: module.category,
        total: 0,
        tested: 0,
        untested: [],
      });
    }

    const stats = categories.get(module.category)!;
    stats.total++;
    if (module.hasTest) {
      stats.tested++;
    } else {
      stats.untested.push(module.moduleName);
    }
  }

  return Array.from(categories.values()).sort((a, b) => a.category.localeCompare(b.category));
}

function printReport(verbose = false): void {
  console.log('📊 Module Test Coverage Report\n');

  const modules = scanModules();
  const categoryStats = groupByCategory(modules);

  const totalModules = modules.length;
  const totalTested = modules.filter(m => m.hasTest).length;
  const totalUntested = totalModules - totalTested;
  const overallPercentage = totalModules > 0 ? Math.round((totalTested / totalModules) * 100) : 0;

  // Print category breakdown
  console.log('By Category:');
  console.log('━'.repeat(80));

  for (const stats of categoryStats) {
    const percentage = stats.total > 0 ? Math.round((stats.tested / stats.total) * 100) : 0;
    const statusEmoji = percentage === 100 ? '✅' : percentage >= 70 ? '⚠️ ' : '❌';

    console.log(
      `${statusEmoji} ${stats.category.padEnd(20)} ${stats.tested}/${stats.total} (${percentage}%)`
    );

    if (verbose && stats.untested.length > 0) {
      stats.untested.forEach(name => {
        console.log(`     ❌ ${name}.ts`);
      });
    }
  }

  console.log('━'.repeat(80));

  // Overall summary
  console.log('\nOverall Summary:');
  console.log(`  Total Modules:    ${totalModules}`);
  console.log(`  ✅ Tested:        ${totalTested}`);
  console.log(`  ❌ Missing Tests: ${totalUntested}`);
  console.log(`  Coverage:         ${overallPercentage}%`);

  // Status indicators
  console.log('\n📈 Status:');
  if (overallPercentage === 100) {
    console.log('  🎉 Perfect! All modules have tests!');
  } else if (overallPercentage >= 70) {
    console.log('  ⚠️  Good progress, but some modules still need tests');
  } else {
    console.log('  ❌ Many modules need tests. Run: npm run test:generate');
  }

  // List untested modules if requested
  if (verbose) {
    const untested = modules.filter(m => !m.hasTest);
    if (untested.length > 0) {
      console.log('\n❌ Modules without tests:');
      console.log('━'.repeat(80));
      untested.forEach(m => {
        console.log(`  ${m.category}/${m.moduleName}.ts`);
      });
    }
  } else if (totalUntested > 0) {
    console.log('\n💡 Tip: Use --verbose to see all untested modules');
  }

  // Next steps
  if (totalUntested > 0) {
    console.log('\n🔧 Next Steps:');
    console.log('  1. Generate missing tests: npm run test:generate');
    console.log('  2. Implement test cases');
    console.log('  3. Run tests: npm test');
  }

  // Exit code for CI
  if (process.env.CI && overallPercentage < 70) {
    console.log('\n⚠️  CI Check: Coverage below 70% threshold');
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');

printReport(verbose);
