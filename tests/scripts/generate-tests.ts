#!/usr/bin/env tsx

/**
 * Module Test Generator
 *
 * Automatically generates test scaffolds for modules that don't have tests.
 * Run: npm run test:generate
 */

import fs from 'fs';
import path from 'path';

const MODULES_DIR = path.join(process.cwd(), 'src/modules');
const TEMPLATES_DIR = path.join(process.cwd(), 'tests/templates');

interface ModuleInfo {
  category: string;
  moduleName: string;
  modulePath: string;
  testPath: string;
  hasTest: boolean;
}

// Detect module type based on imports
function detectModuleType(moduleContent: string): 'utility' | 'api' | 'database' {
  // Database modules
  if (moduleContent.includes('mongodb') ||
      moduleContent.includes('Pool') ||
      moduleContent.includes('mysql')) {
    return 'database';
  }

  // API modules have external SDK imports
  if (moduleContent.includes('import') &&
      (moduleContent.includes('axios') ||
       moduleContent.includes('TwitterApi') ||
       moduleContent.includes('@slack/web-api') ||
       moduleContent.includes('openai') ||
       moduleContent.includes('Anthropic'))) {
    return 'api';
  }

  return 'utility';
}

// Generate test content from template
function generateTestContent(moduleInfo: ModuleInfo, moduleType: string): string {
  const templatePath = path.join(TEMPLATES_DIR, `${moduleType}-module.template.ts`);

  if (!fs.existsSync(templatePath)) {
    // Fallback to basic template
    return generateBasicTemplate(moduleInfo);
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders
  template = template.replace(/\{\{MODULE_NAME\}\}/g, moduleInfo.moduleName);
  template = template.replace(/\{\{MODULE_PATH\}\}/g, `../${moduleInfo.moduleName}`);
  template = template.replace(/\{\{CATEGORY\}\}/g, moduleInfo.category);

  return template;
}

function generateBasicTemplate(moduleInfo: ModuleInfo): string {
  return `import { describe, it, expect } from 'vitest';
import * as module from '../${moduleInfo.moduleName}';

describe('${moduleInfo.moduleName} module', () => {
  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  // TODO: Add tests for each exported function
  // Uncomment and implement:

  // describe('functionName', () => {
  //   it('works correctly', () => {
  //     expect(module.functionName('input')).toBe('expected');
  //   });
  //
  //   it('handles edge cases', () => {
  //     expect(() => module.functionName(null)).toThrow();
  //   });
  // });
});
`;
}

// Scan all modules
function scanModules(): ModuleInfo[] {
  const modules: ModuleInfo[] = [];

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
      const modulePath = path.join(categoryPath, file);
      const testDir = path.join(categoryPath, '__tests__');
      const testPath = path.join(testDir, `${moduleName}.test.ts`);
      const hasTest = fs.existsSync(testPath);

      modules.push({
        category,
        moduleName,
        modulePath,
        testPath,
        hasTest,
      });
    }
  }

  return modules;
}

// Generate missing tests
function generateMissingTests(dryRun = false): void {
  console.log('🔍 Scanning modules...\n');

  const modules = scanModules();
  const missingTests = modules.filter(m => !m.hasTest);

  console.log(`📊 Found ${modules.length} modules`);
  console.log(`✅ ${modules.filter(m => m.hasTest).length} have tests`);
  console.log(`❌ ${missingTests.length} missing tests\n`);

  if (missingTests.length === 0) {
    console.log('🎉 All modules have tests!');
    return;
  }

  if (dryRun) {
    console.log('📝 Would generate tests for:');
    missingTests.forEach(m => {
      console.log(`  - ${m.category}/${m.moduleName}.ts`);
    });
    console.log(`\nRun without --dry-run to generate`);
    return;
  }

  console.log('⚙️  Generating tests...\n');

  let generated = 0;
  for (const moduleInfo of missingTests) {
    try {
      // Read module to detect type
      const moduleContent = fs.readFileSync(moduleInfo.modulePath, 'utf-8');
      const moduleType = detectModuleType(moduleContent);

      // Create __tests__ directory if needed
      const testDir = path.dirname(moduleInfo.testPath);
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Generate test content
      const testContent = generateTestContent(moduleInfo, moduleType);
      fs.writeFileSync(moduleInfo.testPath, testContent);

      console.log(`✅ Generated: ${moduleInfo.category}/__tests__/${moduleInfo.moduleName}.test.ts (${moduleType})`);
      generated++;
    } catch (error) {
      console.error(`❌ Failed to generate test for ${moduleInfo.category}/${moduleInfo.moduleName}:`, error);
    }
  }

  console.log(`\n✨ Generated ${generated} test files`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review generated tests in src/modules/[category]/__tests__/`);
  console.log(`   2. Implement test cases for each function`);
  console.log(`   3. Run: npm test`);
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

generateMissingTests(dryRun);
