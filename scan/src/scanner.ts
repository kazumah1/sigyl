import { TypeScriptScanner } from './typescript-scanner.js';
import { OpenAPIScanner } from './openapi-scanner.js';
import { ScanResult, ScanOptions } from './types.js';

export class Scanner {
  private typescriptScanner: TypeScriptScanner;
  private openapiScanner: OpenAPIScanner;
  private options: ScanOptions;

  constructor(options: ScanOptions = {}) {
    this.options = options;
    this.typescriptScanner = new TypeScriptScanner(options);
    this.openapiScanner = new OpenAPIScanner();
  }

  async scan(directoryPath: string): Promise<ScanResult> {
    const result: ScanResult = {
      functions: [],
      classes: [],
      endpoints: [],
      sourceFiles: [],
      errors: []
    };

    // Scan TypeScript files
    const tsResult = await this.typescriptScanner.scanDirectory(directoryPath);
    result.functions.push(...tsResult.functions);
    result.classes.push(...tsResult.classes);
    result.sourceFiles.push(...tsResult.sourceFiles);
    result.errors.push(...tsResult.errors);

    // Scan OpenAPI files if enabled
    if (this.options.scanOpenAPI) {
      const openAPIFiles = this.openapiScanner.findOpenAPIFiles(directoryPath);
      
      if (openAPIFiles.length > 0) {
        const openAPIResult = await this.openapiScanner.scanOpenAPIFiles(openAPIFiles);
        result.endpoints = openAPIResult.endpoints;
        result.errors.push(...openAPIResult.errors);
        
        if (openAPIResult.specs.length > 0) {
          result.openApiSpec = openAPIResult.specs[0]; // Use the first spec for now
        }
      }
    }

    // Add summary to errors if verbose
    if (this.options.verbose) {
      console.log(`\n📊 Scan Summary:`);
      console.log(`  📁 Source files: ${result.sourceFiles.length}`);
      console.log(`  🔧 Functions: ${result.functions.length}`);
      console.log(`  🏗️  Classes: ${result.classes.length}`);
      console.log(`  🌐 Endpoints: ${result.endpoints?.length || 0}`);
      console.log(`  ❌ Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log(`\n⚠️  Errors found:`);
        result.errors.forEach(error => {
          console.log(`  - ${error.file}: ${error.message}`);
        });
      }
    }

    return result;
  }

  async scanSpecificFiles(filePaths: string[]): Promise<ScanResult> {
    const result: ScanResult = {
      functions: [],
      classes: [],
      endpoints: [],
      sourceFiles: [],
      errors: []
    };

    for (const filePath of filePaths) {
      try {
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
          // Scan TypeScript file
          const tsResult = await this.typescriptScanner.scanDirectory(filePath);
          result.functions.push(...tsResult.functions);
          result.classes.push(...tsResult.classes);
          result.sourceFiles.push(...tsResult.sourceFiles);
          result.errors.push(...tsResult.errors);
        } else if (filePath.includes('openapi') || 
                   filePath.includes('swagger') ||
                   filePath.endsWith('.yaml') ||
                   filePath.endsWith('.yml') ||
                   filePath.endsWith('.json')) {
          // Scan OpenAPI file
          const openAPIResult = await this.openapiScanner.scanOpenAPIFile(filePath);
          if (openAPIResult.endpoints) {
            result.endpoints?.push(...openAPIResult.endpoints);
          }
          result.errors.push(...openAPIResult.errors);
          
          if (openAPIResult.spec && !result.openApiSpec) {
            result.openApiSpec = openAPIResult.spec;
          }
        }
      } catch (error) {
        result.errors.push({
          file: filePath,
          message: error instanceof Error ? error.message : 'Failed to scan file',
          type: 'scan'
        });
      }
    }

    return result;
  }

  // Helper method to filter results by export status
  getExportedFunctions(result: ScanResult) {
    return result.functions.filter(f => f.isExported);
  }

  getExportedClasses(result: ScanResult) {
    return result.classes.filter(c => c.isExported);
  }

  // Helper method to get functions that could be MCP tools
  getPotentialMCPTools(result: ScanResult) {
    return result.functions.filter(f => {
      // Filter for functions that could be MCP tools
      // - Must be exported
      // - Should have parameters (not just getters)
      // - Should not be internal/private functions
      return f.isExported && 
             f.parameters.length > 0 && 
             !f.name.startsWith('_') &&
             !f.name.startsWith('internal');
    });
  }
} 