import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { OpenAPISpec, ScannedEndpoint, EndpointParameter, ScanError } from './types.js';

export class OpenAPIScanner {
  async scanOpenAPIFile(filePath: string): Promise<{ spec: OpenAPISpec; endpoints: ScannedEndpoint[]; errors: ScanError[] }> {
    const errors: ScanError[] = [];
    let spec: OpenAPISpec;
    let endpoints: ScannedEndpoint[] = [];

    try {
      const content = readFileSync(filePath, 'utf-8');
      
      // Try to parse as JSON first, then YAML
      try {
        spec = JSON.parse(content);
      } catch {
        try {
          spec = parseYaml(content);
        } catch (yamlError) {
          errors.push({
            file: filePath,
            message: `Failed to parse OpenAPI file: ${yamlError instanceof Error ? yamlError.message : 'Unknown error'}`,
            type: 'openapi'
          });
          return { spec: {} as OpenAPISpec, endpoints, errors };
        }
      }

      // Validate basic OpenAPI structure
      if (!spec.openapi || !spec.paths) {
        errors.push({
          file: filePath,
          message: 'Invalid OpenAPI specification: missing openapi version or paths',
          type: 'openapi'
        });
        return { spec, endpoints, errors };
      }

      // Extract endpoints from paths
      endpoints = this.extractEndpoints(spec);

    } catch (error) {
      errors.push({
        file: filePath,
        message: error instanceof Error ? error.message : 'Failed to read OpenAPI file',
        type: 'openapi'
      });
      return { spec: {} as OpenAPISpec, endpoints, errors };
    }

    return { spec, endpoints, errors };
  }

  async scanOpenAPIFiles(filePaths: string[]): Promise<{ specs: OpenAPISpec[]; endpoints: ScannedEndpoint[]; errors: ScanError[] }> {
    const specs: OpenAPISpec[] = [];
    const allEndpoints: ScannedEndpoint[] = [];
    const allErrors: ScanError[] = [];

    for (const filePath of filePaths) {
      const result = await this.scanOpenAPIFile(filePath);
      if (result.spec.openapi) {
        specs.push(result.spec);
      }
      allEndpoints.push(...result.endpoints);
      allErrors.push(...result.errors);
    }

    return { specs, endpoints: allEndpoints, errors: allErrors };
  }

  private extractEndpoints(spec: OpenAPISpec): ScannedEndpoint[] {
    const endpoints: ScannedEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
      
      for (const method of methods) {
        const operation = pathItem[method];
        if (operation) {
          const endpoint = this.extractEndpoint(path, method.toUpperCase(), operation);
          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  private extractEndpoint(path: string, method: string, operation: any): ScannedEndpoint {
    const parameters: EndpointParameter[] = [];

    // Extract parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        const endpointParam: EndpointParameter = {
          name: param.name,
          in: param.in,
          required: param.required || false,
          schema: param.schema,
          description: param.description
        };
        parameters.push(endpointParam);
      }
    }

    return {
      path,
      method,
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      parameters,
      requestBody: operation.requestBody,
      responses: operation.responses,
      tags: operation.tags
    };
  }

  findOpenAPIFiles(directoryPath: string): string[] {
    const fs = require('fs');
    const path = require('path');
    
    const openAPIFiles: string[] = [];
    
    function scanDirectory(dir: string) {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (stat.isFile()) {
            const lowerName = item.toLowerCase();
            if (lowerName.includes('openapi') || 
                lowerName.includes('swagger') ||
                lowerName.endsWith('.yaml') ||
                lowerName.endsWith('.yml') ||
                lowerName.endsWith('.json')) {
              openAPIFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    scanDirectory(directoryPath);
    return openAPIFiles;
  }
} 