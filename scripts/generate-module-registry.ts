#!/usr/bin/env tsx
/**
 * Auto-Generate Module Registry
 *
 * Scans src/modules directory and generates a registry with ACTUAL exported functions
 * from the source code, not manually maintained entries.
 *
 * This ensures the registry always matches the actual implementation.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import * as ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const modulesDir = join(rootDir, 'src', 'modules');

interface FunctionInfo {
  name: string;
  description: string;
  signature: string;
  parameters: ParameterInfo[];
  example?: string;
}

interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
}

interface ModuleInfo {
  name: string;
  category: string;
  functions: FunctionInfo[];
}

/**
 * Extract JSDoc comment from a node
 */
function getJSDocDescription(node: ts.Node): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsDoc = (node as any).jsDoc;
  if (!jsDoc || jsDoc.length === 0) return '';

  const comment = jsDoc[0].comment;
  if (typeof comment === 'string') {
    return comment.split('\n')[0].trim(); // First line only
  }

  return '';
}

/**
 * Extract example from JSDoc
 */
function getJSDocExample(node: ts.Node): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsDoc = (node as any).jsDoc;
  if (!jsDoc || jsDoc.length === 0) return undefined;

  for (const doc of jsDoc) {
    if (doc.tags) {
      for (const tag of doc.tags) {
        if (tag.tagName?.text === 'example') {
          return typeof tag.comment === 'string' ? tag.comment : undefined;
        }
      }
    }
  }

  return undefined;
}

/**
 * Parse function parameters and build signature
 */
function parseFunction(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile
): FunctionInfo | null {
  if (!node.name) return null;

  const functionName = node.name.text;
  const description = getJSDocDescription(node, sourceFile);
  const example = getJSDocExample(node);

  // Build parameter list
  const parameters: ParameterInfo[] = [];
  const paramNames: string[] = [];

  for (const param of node.parameters) {
    const paramName = param.name.getText(sourceFile);
    const paramType = param.type ? param.type.getText(sourceFile) : 'unknown';
    const required = !param.questionToken && !param.initializer;

    parameters.push({
      name: paramName,
      type: paramType,
      required,
    });

    // For signature, show object destructuring or simple param name
    if (ts.isObjectBindingPattern(param.name)) {
      // Object destructuring: ({ a, b, c })
      const props = param.name.elements.map(e => e.name.getText(sourceFile));
      paramNames.push(`{ ${props.join(', ')} }`);
    } else {
      // Simple parameter
      paramNames.push(paramName + (required ? '' : '?'));
    }
  }

  const signature = `${functionName}(${paramNames.join(', ')})`;

  return {
    name: functionName,
    description: description || `Execute ${functionName}`,
    signature,
    parameters,
    example,
  };
}

/**
 * Parse a TypeScript file and extract exported functions
 */
async function parseModuleFile(filePath: string): Promise<FunctionInfo[]> {
  const content = await readFile(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const functions: FunctionInfo[] = [];

  function visit(node: ts.Node) {
    // Look for exported functions
    if (ts.isFunctionDeclaration(node)) {
      const hasExportKeyword = node.modifiers?.some(
        m => m.kind === ts.SyntaxKind.ExportKeyword
      );

      if (hasExportKeyword) {
        const funcInfo = parseFunction(node, sourceFile);
        if (funcInfo) {
          functions.push(funcInfo);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return functions;
}

/**
 * Scan modules directory and build registry
 */
async function buildRegistry(): Promise<Map<string, ModuleInfo[]>> {
  const registry = new Map<string, ModuleInfo[]>();

  // Read category directories
  const categories = await readdir(modulesDir, { withFileTypes: true });

  for (const categoryDir of categories) {
    if (!categoryDir.isDirectory()) continue;
    if (categoryDir.name === '__tests__') continue;

    const categoryName = categoryDir.name;
    const categoryPath = join(modulesDir, categoryName);
    const modules: ModuleInfo[] = [];

    // Read module files in category
    const files = await readdir(categoryPath, { withFileTypes: true });

    for (const file of files) {
      if (file.isDirectory() || !file.name.endsWith('.ts')) continue;
      if (file.name.endsWith('.test.ts')) continue;

      const moduleName = file.name.replace('.ts', '');
      const modulePath = join(categoryPath, file.name);

      try {
        const functions = await parseModuleFile(modulePath);

        if (functions.length > 0) {
          modules.push({
            name: moduleName,
            category: categoryName,
            functions,
          });
        }
      } catch (error) {
        console.error(`Error parsing ${modulePath}:`, error);
      }
    }

    if (modules.length > 0) {
      registry.set(categoryName, modules);
    }
  }

  return registry;
}

/**
 * Format registry as TypeScript code for module-registry.ts
 */
function formatRegistry(registry: Map<string, ModuleInfo[]>): string {
  const categories = Array.from(registry.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  let output = `// AUTO-GENERATED - DO NOT EDIT MANUALLY\n`;
  output += `// Generated by: scripts/generate-module-registry.ts\n`;
  output += `// Run: npm run generate:registry\n\n`;
  output += `import { logger } from '@/lib/logger';\n\n`;
  output += `export interface ModuleFunction {\n`;
  output += `  name: string;\n`;
  output += `  description: string;\n`;
  output += `  signature: string;\n`;
  output += `  example?: string;\n`;
  output += `}\n\n`;
  output += `export interface ModuleCategory {\n`;
  output += `  name: string;\n`;
  output += `  modules: Array<{\n`;
  output += `    name: string;\n`;
  output += `    functions: ModuleFunction[];\n`;
  output += `  }>;\n`;
  output += `}\n\n`;
  output += `export function getModuleRegistry(): ModuleCategory[] {\n`;
  output += `  return [\n`;

  for (const [categoryName, modules] of categories) {
    // Capitalize category name
    const displayName = categoryName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    output += `    {\n`;
    output += `      name: '${displayName}',\n`;
    output += `      modules: [\n`;

    for (const mod of modules) {
      output += `        {\n`;
      output += `          name: '${mod.name}',\n`;
      output += `          functions: [\n`;

      for (const func of mod.functions) {
        output += `            {\n`;
        output += `              name: '${func.name}',\n`;
        output += `              description: ${JSON.stringify(func.description)},\n`;
        output += `              signature: '${func.signature}',\n`;

        if (func.example) {
          output += `              example: ${JSON.stringify(func.example)},\n`;
        }

        output += `            },\n`;
      }

      output += `          ],\n`;
      output += `        },\n`;
    }

    output += `      ],\n`;
    output += `    },\n`;
  }

  output += `  ];\n`;
  output += `}\n`;

  return output;
}

/**
 * Main
 */
async function main() {
  console.log('🔍 Scanning modules directory...\n');

  const registry = await buildRegistry();

  let totalFunctions = 0;
  let totalModules = 0;

  console.log('📊 Module Registry:\n');
  for (const [category, modules] of registry) {
    const funcCount = modules.reduce((sum, m) => sum + m.functions.length, 0);
    console.log(`  ${category}: ${modules.length} modules, ${funcCount} functions`);
    totalModules += modules.length;
    totalFunctions += funcCount;
  }

  console.log(`\n✅ Total: ${totalModules} modules, ${totalFunctions} functions\n`);

  const output = formatRegistry(registry);
  const outputPath = join(rootDir, 'src', 'lib', 'workflows', 'module-registry.ts');

  await writeFile(outputPath, output, 'utf-8');

  console.log(`✅ Registry generated: ${relative(rootDir, outputPath)}\n`);
  console.log('💡 Next steps:');
  console.log('   1. Review the generated file');
  console.log('   2. Run type checking: npm run typecheck');
  console.log('   3. Test search: npx tsx scripts/search-modules.ts array');
}

main().catch(console.error);
