import { Project, SourceFile, FunctionDeclaration, ClassDeclaration, MethodDeclaration, PropertyDeclaration, ParameterDeclaration, TypeReferenceNode, JSDoc, ScriptTarget, ModuleKind, ModuleResolutionKind } from 'ts-morph';
import { ScannedFunction, ScannedClass, FunctionParameter, ClassProperty, ScanResult, ScanError, ScanOptions } from './types.js';

export class TypeScriptScanner {
  private project: Project;
  private options: ScanOptions;

  constructor(options: ScanOptions = {}) {
    this.options = {
      includeNodeModules: false,
      includeTests: false,
      maxFileSize: 1024 * 1024, // 1MB
      scanOpenAPI: true,
      verbose: false,
      ...options
    };
    
    this.project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        moduleResolution: ModuleResolutionKind.NodeJs,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      }
    });
  }

  async scanDirectory(directoryPath: string): Promise<ScanResult> {
    const result: ScanResult = {
      functions: [],
      classes: [],
      sourceFiles: [],
      errors: []
    };

    try {
      // Add source files to the project
      const sourceFiles = this.project.addSourceFilesAtPaths([
        `${directoryPath}/**/*.ts`,
        `${directoryPath}/**/*.tsx`
      ]);

      // Filter files based on options
      const filteredFiles = sourceFiles.filter(file => {
        const filePath = file.getFilePath();
        
        // Skip node_modules if not included
        if (!this.options.includeNodeModules && filePath.includes('node_modules')) {
          return false;
        }
        
        // Skip test files if not included
        if (!this.options.includeTests && (
          filePath.includes('.test.') || 
          filePath.includes('.spec.') ||
          filePath.includes('__tests__')
        )) {
          return false;
        }

        // Check file size (simplified approach)
        try {
          const fs = require('fs');
          const stats = fs.statSync(filePath);
          if (stats.size > (this.options.maxFileSize || 1024 * 1024)) {
            result.errors.push({
              file: filePath,
              message: `File too large: ${stats.size} bytes`,
              type: 'scan'
            });
            return false;
          }
        } catch (error) {
          // Continue if we can't read file size
        }

        return true;
      });

      result.sourceFiles = filteredFiles.map(f => f.getFilePath());

      // Scan each file
      for (const sourceFile of filteredFiles) {
        try {
          const fileResult = this.scanSourceFile(sourceFile);
          result.functions.push(...fileResult.functions);
          result.classes.push(...fileResult.classes);
        } catch (error) {
          result.errors.push({
            file: sourceFile.getFilePath(),
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'scan'
          });
        }
      }

      if (this.options.verbose) {
        console.log(`Scanned ${result.sourceFiles.length} files`);
        console.log(`Found ${result.functions.length} functions and ${result.classes.length} classes`);
      }

    } catch (error) {
      result.errors.push({
        file: directoryPath,
        message: error instanceof Error ? error.message : 'Failed to scan directory',
        type: 'scan'
      });
    }

    return result;
  }

  private scanSourceFile(sourceFile: SourceFile): { functions: ScannedFunction[], classes: ScannedClass[] } {
    const functions: ScannedFunction[] = [];
    const classes: ScannedClass[] = [];

    // Scan function declarations
    const functionDeclarations = sourceFile.getFunctions();
    for (const func of functionDeclarations) {
      const scannedFunction = this.scanFunction(func);
      if (scannedFunction) {
        functions.push(scannedFunction);
      }
    }

    // Scan class declarations
    const classDeclarations = sourceFile.getClasses();
    for (const cls of classDeclarations) {
      const scannedClass = this.scanClass(cls);
      if (scannedClass) {
        classes.push(scannedClass);
      }
    }

    return { functions, classes };
  }

  private scanFunction(func: FunctionDeclaration): ScannedFunction | null {
    const name = func.getName();
    if (!name) return null; // Skip anonymous functions

    const jsDocs = func.getJsDocs();
    const description = jsDocs.length > 0 ? jsDocs[0].getDescription() : undefined;

    const parameters = func.getParameters().map(param => this.scanParameter(param));
    
    const returnType = func.getReturnType().getText();
    const isExported = func.hasExportKeyword();
    const isAsync = func.isAsync();
    const lineNumber = func.getStartLineNumber();

    return {
      name,
      description,
      parameters,
      returnType,
      sourceFile: func.getSourceFile().getFilePath(),
      lineNumber,
      isExported,
      isAsync
    };
  }

  private scanParameter(param: ParameterDeclaration): FunctionParameter {
    const name = param.getName();
    const type = param.getType().getText();
    const required = !param.hasQuestionToken();
    const defaultValue = param.getInitializer()?.getText();
    return {
      name,
      type,
      required,
      description: undefined,
      defaultValue
    };
  }

  private scanClass(cls: ClassDeclaration): ScannedClass | null {
    const name = cls.getName();
    if (!name) return null; // Skip anonymous classes

    const jsDocs = cls.getJsDocs();
    const description = jsDocs.length > 0 ? jsDocs[0].getDescription() : undefined;

    const methods = cls.getMethods().map(method => this.scanMethod(method));
    const properties = cls.getProperties().map(prop => this.scanProperty(prop));
    
    const isExported = cls.hasExportKeyword();
    const lineNumber = cls.getStartLineNumber();

    return {
      name,
      description,
      methods,
      properties,
      sourceFile: cls.getSourceFile().getFilePath(),
      lineNumber,
      isExported
    };
  }

  private scanMethod(method: MethodDeclaration): ScannedFunction {
    const name = method.getName();
    const jsDocs = method.getJsDocs();
    const description = jsDocs.length > 0 ? jsDocs[0].getDescription() : undefined;
    const parameters = method.getParameters().map(param => this.scanParameter(param));
    const returnType = method.getReturnType().getText();
    const isExported = false;
    const isAsync = method.isAsync();
    const lineNumber = method.getStartLineNumber();
    return {
      name,
      description,
      parameters,
      returnType,
      sourceFile: method.getSourceFile().getFilePath(),
      lineNumber,
      isExported,
      isAsync
    };
  }

  private scanProperty(prop: PropertyDeclaration): ClassProperty {
    const name = prop.getName();
    const type = prop.getType().getText();
    const isReadonly = prop.isReadonly();
    const isOptional = prop.hasQuestionToken();
    
    const jsDocs = prop.getJsDocs();
    const description = jsDocs.length > 0 ? jsDocs[0].getDescription() : undefined;

    return {
      name,
      type,
      description,
      isReadonly,
      isOptional
    };
  }
} 