export interface ScannedFunction {
  name: string;
  description?: string;
  parameters: FunctionParameter[];
  returnType?: string;
  sourceFile: string;
  lineNumber: number;
  isExported: boolean;
  isAsync: boolean;
}

export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
}

export interface ScannedClass {
  name: string;
  description?: string;
  methods: ScannedFunction[];
  properties: ClassProperty[];
  sourceFile: string;
  lineNumber: number;
  isExported: boolean;
}

export interface ClassProperty {
  name: string;
  type: string;
  description?: string;
  isReadonly: boolean;
  isOptional: boolean;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  parameters?: any[];
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
  tags?: string[];
}

export interface ScannedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters: EndpointParameter[];
  requestBody?: any;
  responses: Record<string, any>;
  tags?: string[];
}

export interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: any;
  description?: string;
}

export interface ScanResult {
  functions: ScannedFunction[];
  classes: ScannedClass[];
  endpoints?: ScannedEndpoint[];
  openApiSpec?: OpenAPISpec;
  sourceFiles: string[];
  errors: ScanError[];
}

export interface ScanError {
  file: string;
  line?: number;
  message: string;
  type: 'parse' | 'scan' | 'openapi';
}

export interface ScanOptions {
  includeNodeModules?: boolean;
  includeTests?: boolean;
  maxFileSize?: number;
  scanOpenAPI?: boolean;
  openAPIFiles?: string[];
  verbose?: boolean;
} 