import { expect } from 'chai';
import { Scanner } from '../src/scanner.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Scanner', () => {
  let tempDir: string;
  let scanner: Scanner;

  beforeEach(() => {
    tempDir = join(process.cwd(), 'temp-test');
    mkdirSync(tempDir, { recursive: true });
    scanner = new Scanner({ verbose: false });
  });

  afterEach(() => {
    // Clean up temp files
    const fs = require('fs');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('TypeScript Scanning', () => {
    it('should scan TypeScript functions', async () => {
      const testFile = join(tempDir, 'test.ts');
      const testCode = `
        /**
         * A test function
         */
        export function testFunction(param1: string, param2?: number): string {
          return param1 + param2;
        }

        /**
         * A test class
         */
        export class TestClass {
          private property: string;

          constructor(value: string) {
            this.property = value;
          }

          /**
           * A test method
           */
          public testMethod(param: string): void {
            console.log(param);
          }
        }
      `;

      writeFileSync(testFile, testCode);

      const result = await scanner.scan(tempDir);

      expect(result.functions).to.have.length(2); // function + method
      expect(result.classes).to.have.length(1);
      expect(result.errors).to.have.length(0);

      const testFunction = result.functions.find(f => f.name === 'testFunction');
      expect(testFunction).to.exist;
      expect(testFunction?.isExported).to.be.true;
      expect(testFunction?.parameters).to.have.length(2);
      expect(testFunction?.description).to.include('A test function');

      const testClass = result.classes.find(c => c.name === 'TestClass');
      expect(testClass).to.exist;
      expect(testClass?.isExported).to.be.true;
      expect(testClass?.methods).to.have.length(1);
    });

    it('should filter out non-exported functions', async () => {
      const testFile = join(tempDir, 'test.ts');
      const testCode = `
        function internalFunction() {}
        export function publicFunction() {}
      `;

      writeFileSync(testFile, testCode);

      const result = await scanner.scan(tempDir);
      const exportedFunctions = scanner.getExportedFunctions(result);

      expect(result.functions).to.have.length(2);
      expect(exportedFunctions).to.have.length(1);
      expect(exportedFunctions[0].name).to.equal('publicFunction');
    });
  });

  describe('OpenAPI Scanning', () => {
    it('should scan OpenAPI specification', async () => {
      const openAPIFile = join(tempDir, 'openapi.yaml');
      const openAPIContent = `
        openapi: 3.0.0
        info:
          title: Test API
          version: 1.0.0
        paths:
          /users:
            get:
              summary: Get users
              operationId: getUsers
              parameters:
                - name: limit
                  in: query
                  required: false
                  schema:
                    type: integer
              responses:
                '200':
                  description: Success
          /users/{id}:
            post:
              summary: Create user
              operationId: createUser
              parameters:
                - name: id
                  in: path
                  required: true
                  schema:
                    type: string
              responses:
                '201':
                  description: Created
      `;

      writeFileSync(openAPIFile, openAPIContent);

      const result = await scanner.scan(tempDir);

      expect(result.endpoints).to.have.length(2);
      expect(result.openApiSpec).to.exist;
      expect(result.errors).to.have.length(0);

      const getUsersEndpoint = result.endpoints?.find(e => e.operationId === 'getUsers');
      expect(getUsersEndpoint).to.exist;
      expect(getUsersEndpoint?.method).to.equal('GET');
      expect(getUsersEndpoint?.path).to.equal('/users');

      const createUserEndpoint = result.endpoints?.find(e => e.operationId === 'createUser');
      expect(createUserEndpoint).to.exist;
      expect(createUserEndpoint?.method).to.equal('POST');
      expect(createUserEndpoint?.path).to.equal('/users/{id}');
    });
  });

  describe('Combined Scanning', () => {
    it('should scan both TypeScript and OpenAPI files', async () => {
      // Create TypeScript file
      const tsFile = join(tempDir, 'api.ts');
      const tsCode = `
        export interface User {
          id: string;
          name: string;
        }

        export async function getUser(id: string): Promise<User> {
          return { id, name: 'Test User' };
        }
      `;
      writeFileSync(tsFile, tsCode);

      // Create OpenAPI file
      const openAPIFile = join(tempDir, 'openapi.json');
      const openAPIContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/users/{id}': {
            get: {
              operationId: 'getUser',
              parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      });
      writeFileSync(openAPIFile, openAPIContent);

      const result = await scanner.scan(tempDir);

      expect(result.functions).to.have.length(1);
      expect(result.endpoints).to.have.length(1);
      expect(result.sourceFiles).to.have.length(1);
      expect(result.errors).to.have.length(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid TypeScript files gracefully', async () => {
      const invalidFile = join(tempDir, 'invalid.ts');
      const invalidCode = `
        function testFunction( {
          return "invalid syntax";
        }
      `;

      writeFileSync(invalidFile, invalidCode);

      const result = await scanner.scan(tempDir);

      expect(result.errors).to.have.length.greaterThan(0);
      expect(result.errors[0].type).to.equal('scan');
    });

    it('should handle invalid OpenAPI files gracefully', async () => {
      const invalidOpenAPIFile = join(tempDir, 'invalid.yaml');
      const invalidContent = `
        openapi: 3.0.0
        info:
          title: Test API
        paths:
          invalid: yaml: content
      `;

      writeFileSync(invalidOpenAPIFile, invalidContent);

      const result = await scanner.scan(tempDir);

      expect(result.errors).to.have.length.greaterThan(0);
      expect(result.errors[0].type).to.equal('openapi');
    });
  });
}); 