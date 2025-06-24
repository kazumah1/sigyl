import { Project, SyntaxKind, TypeFormatFlags, ScriptTarget, ModuleKind, ModuleResolutionKind } from "ts-morph"
import { join } from "node:path"
import { existsSync, readdirSync, statSync } from "node:fs"
import { verboseLog } from "../logger"
import chalk from "chalk"

export interface ExpressEndpoint {
	method: string
	path: string
	handler: string
	description?: string
	parameters?: Array<{
		name: string
		type: string
		required: boolean
		location: "path" | "query" | "body"
		description?: string
	}>
	requestBody?: {
		type: string
		properties?: Record<string, any>
		required?: string[]
	}
	responseType?: string
	responseSchema?: any
}

export interface TypeInfo {
	name: string
	type: string
	properties?: Record<string, any>
	required?: string[]
}

export class ExpressScanner {
	private project: Project
	private directory: string
	private typeCache: Map<string, TypeInfo> = new Map()
	private importedTypes: Map<string, string> = new Map() // Maps imported name to actual type

	constructor(directory: string) {
		this.directory = directory
		this.project = new Project({
			compilerOptions: {
				target: ScriptTarget.ES2020,
				module: ModuleKind.ESNext,
				moduleResolution: ModuleResolutionKind.NodeJs,
				allowSyntheticDefaultImports: true,
				esModuleInterop: true,
				skipLibCheck: true,
				strict: false
			}
		})
	}

	async scanForEndpoints(framework?: string): Promise<ExpressEndpoint[]> {
		verboseLog(`Scanning directory: ${this.directory}`)
		
		// First, collect all type definitions
		await this.collectTypes()
		
		// Then scan for routes
		const sourceFiles = this.findSourceFiles()
		let allEndpoints: ExpressEndpoint[] = []
		
		for (const filePath of sourceFiles) {
			try {
				const sourceFile = this.project.addSourceFileAtPath(filePath)
				const endpoints = this.scanFileForRoutes(sourceFile)
				allEndpoints.push(...endpoints)
				verboseLog(`Found ${endpoints.length} endpoints in ${filePath}`)
			} catch (error) {
				console.warn(chalk.yellow(`Warning: Could not parse ${filePath}: ${error}`))
			}
		}
		
		return allEndpoints
	}

	private async collectTypes(): Promise<void> {
		const sourceFiles = this.findSourceFiles()
		
		for (const filePath of sourceFiles) {
			try {
				const sourceFile = this.project.addSourceFileAtPath(filePath)
				this.extractTypesFromFile(sourceFile)
				this.extractImportsFromFile(sourceFile)
			} catch (error) {
				console.warn(chalk.yellow(`Warning: Could not parse types from ${filePath}: ${error}`))
			}
		}
		
		verboseLog(`Collected ${this.typeCache.size} types and ${this.importedTypes.size} imports`)
	}

	private extractImportsFromFile(sourceFile: any): void {
		// Extract import statements to understand type mappings
		sourceFile.getImportDeclarations().forEach((importDecl: any) => {
			const moduleSpecifier = importDecl.getModuleSpecifierValue()
			const namedImports = importDecl.getNamedImports()
			
			namedImports.forEach((namedImport: any) => {
				const importName = namedImport.getName()
				const aliasName = namedImport.getAliasNode()?.getText() || importName
				this.importedTypes.set(aliasName, importName)
				
				// Also store the full import path mapping for complex types
				const fullImportPath = `import("${moduleSpecifier}").${importName}`
				this.importedTypes.set(fullImportPath, importName)
			})
		})
	}

	private extractTypesFromFile(sourceFile: any): void {
		// Extract interface and type definitions
		sourceFile.getInterfaces().forEach((interfaceDecl: any) => {
			const interfaceName = interfaceDecl.getName()
			const properties: Record<string, any> = {}
			const required: string[] = []
			
			interfaceDecl.getProperties().forEach((property: any) => {
				const propertyName = property.getName()
				const propertyType = this.extractTypeFromNode(property.getType())
				const isOptional = property.hasQuestionToken()
				
				properties[propertyName] = {
					type: propertyType,
					description: this.extractJSDocDescription(property)
				}
				
				if (!isOptional) {
					required.push(propertyName)
				}
			})
			
			this.typeCache.set(interfaceName, {
				name: interfaceName,
				type: "object",
				properties,
				required
			})
		})
		
		// Extract type aliases
		sourceFile.getTypeAliases().forEach((typeAlias: any) => {
			const typeName = typeAlias.getName()
			const typeNode = typeAlias.getType()
			const extractedType = this.extractTypeFromNode(typeNode)
			
			this.typeCache.set(typeName, {
				name: typeName,
				type: extractedType
			})
		})
	}

	private extractTypeFromNode(type: any): string {
		const typeText = type.getText()
		
		// Handle primitive types
		if (typeText === "string") return "string"
		if (typeText === "number") return "number"
		if (typeText === "boolean") return "boolean"
		if (typeText === "Date") return "string" // Date becomes string in JSON
		
		// Handle arrays
		if (typeText.endsWith("[]") || typeText.includes("Array<")) {
			return "array"
		}
		
		// Handle union types
		if (typeText.includes("|")) {
			// For union types, try to find a common type or default to string
			const unionTypes = typeText.split("|").map((t: string) => t.trim())
			if (unionTypes.every((t: string) => t === "string" || t === "number" || t === "boolean")) {
				// If all are primitives, use the first one
				return this.extractTypeFromNode({ getText: () => unionTypes[0] })
			}
			return "string" // Default for complex unions
		}
		
		// Handle object types
		if (typeText.includes("{") || typeText.includes("Record<")) {
			return "object"
		}
		
		// Check if it's a known interface/type
		if (this.typeCache.has(typeText)) {
			return "object"
		}
		
		// Check if it's an imported type
		if (this.importedTypes.has(typeText)) {
			const actualType = this.importedTypes.get(typeText)!
			if (this.typeCache.has(actualType)) {
				return "object"
			}
		}
		
		// Default to object for unknown types
		return "object"
	}

	private extractJSDocDescription(node: any): string | undefined {
		const jsDoc = node.getJsDocs()[0]
		return jsDoc?.getDescription()?.getText() || undefined
	}

	private findSourceFiles(): string[] {
		const files: string[] = []
		
		const scanDirectory = (dir: string) => {
			const entries = readdirSync(dir)
			for (const entry of entries) {
				const fullPath = join(dir, entry)
				const stat = statSync(fullPath)
				
				if (stat.isDirectory() && !entry.startsWith(".") && entry !== "node_modules") {
					scanDirectory(fullPath)
				} else if (stat.isFile() && (entry.endsWith(".ts") || entry.endsWith(".js"))) {
					files.push(fullPath)
				}
			}
		}
		
		scanDirectory(this.directory)
		return files
	}

	private scanFileForRoutes(sourceFile: any): ExpressEndpoint[] {
		const endpoints: ExpressEndpoint[] = []

		// Look for Express route patterns: app.get(), app.post(), etc.
		sourceFile.forEachDescendant((node: any) => {
			if (node.getKind() === SyntaxKind.CallExpression) {
				const callExpression = node
				
				// Check if this is an Express route call
				const expression = callExpression.getExpression()
				if (expression && expression.getKind() === SyntaxKind.PropertyAccessExpression) {
					const propertyAccess = expression
					const objectName = propertyAccess.getExpression()?.getText() || ""
					const methodName = propertyAccess.getName()

					// Check for patterns like app.get, router.post, etc.
					const isExpressObject = ["app", "router"].includes(objectName)
					const isHttpMethod = ["get", "post", "put", "delete", "patch", "options", "head"].includes(methodName.toLowerCase())

					if (isExpressObject && isHttpMethod) {
						const args = callExpression.getArguments()
						if (args.length >= 2) {
							// First argument should be the path
							const pathArg = args[0]
							const path = this.extractStringValue(pathArg)
							
							if (path) {
								const handlerNode = args[args.length - 1]
								const endpoint: ExpressEndpoint = {
									method: methodName.toUpperCase(),
									path: path,
									handler: this.extractHandlerInfo(handlerNode),
									parameters: this.extractRouteParameters(path),
									description: this.extractRouteDescription(handlerNode)
								}
								
								// Analyze the handler function for types
								this.analyzeHandlerTypes(endpoint, handlerNode)
								
								endpoints.push(endpoint)
							}
						}
					}
				}
			}
		})

		return endpoints
	}

	private extractStringValue(node: any): string | null {
		if (node.getKind() === SyntaxKind.StringLiteral) {
			return node.getLiteralValue()
		}
		return null
	}

	private extractHandlerInfo(node: any): string {
		if (node.getKind() === SyntaxKind.ArrowFunction) {
			return "Arrow Function"
		} else if (node.getKind() === SyntaxKind.FunctionExpression) {
			return "Function Expression"
		} else if (node.getKind() === SyntaxKind.Identifier) {
			return `Function: ${node.getText()}`
		}
		return "Unknown Handler"
	}

	private extractRouteDescription(handlerNode: any): string | undefined {
		// Try to extract JSDoc comments from the handler
		const jsDoc = handlerNode.getJsDocs()[0]
		return jsDoc?.getDescription()?.getText() || undefined
	}

	private extractRouteParameters(path: string): Array<{
		name: string
		type: string
		required: boolean
		location: "path" | "query" | "body"
		description?: string
	}> {
		const parameters: Array<{
			name: string
			type: string
			required: boolean
			location: "path" | "query" | "body"
			description?: string
		}> = []

		// Extract path parameters (e.g., /users/:id)
		const pathParamRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
		let match
		while ((match = pathParamRegex.exec(path)) !== null) {
			parameters.push({
				name: match[1],
				type: "string", // Will be overridden by type analysis if found
				required: true,
				location: "path",
				description: `Path parameter: ${match[1]}`
			})
		}

		return parameters
	}

	private analyzeHandlerTypes(endpoint: ExpressEndpoint, handlerNode: any): void {
		// Analyze the handler function to understand request/response types
		if (handlerNode.getKind() === SyntaxKind.ArrowFunction || 
			handlerNode.getKind() === SyntaxKind.FunctionExpression) {
			
			const parameters = handlerNode.getParameters()
			if (parameters.length >= 2) {
				const reqParam = parameters[0]
				const resParam = parameters[1]
				
				// Analyze request parameter usage
				this.analyzeRequestUsage(endpoint, handlerNode, reqParam)
				
				// Analyze response type
				this.analyzeResponseType(endpoint, handlerNode, resParam)
			}
		}
	}

	private analyzeRequestUsage(endpoint: ExpressEndpoint, handlerNode: any, reqParam: any): void {
		const reqName = reqParam.getName()
		
		// Look for type annotations on req parameter
		const reqType = reqParam.getType()
		if (reqType) {
			// This would be the Express.Request type, not very useful for our purposes
		}
		
		// Look for variable declarations with type annotations
		handlerNode.forEachDescendant((node: any) => {
			if (node.getKind() === SyntaxKind.VariableStatement) {
				const varDecl = node.getDeclarationList().getDeclarations()[0]
				if (varDecl) {
					const varName = varDecl.getName()
					const varType = varDecl.getType()
					const initializer = varDecl.getInitializer()
					
					// Check if this variable is initialized with req.body, req.query, etc.
					if (initializer) {
						const initText = initializer.getText()
						if (initText.includes(`${reqName}.body`)) {
							this.analyzeTypedBodyUsage(endpoint, varType, varName)
						} else if (initText.includes(`${reqName}.query`)) {
							this.analyzeTypedQueryUsage(endpoint, varType, varName)
						} else if (initText.includes(`${reqName}.params`)) {
							this.analyzeTypedParamsUsage(endpoint, varType, varName)
						}
					}
				}
			}
		})
		
		// Also look for direct property access patterns
		handlerNode.forEachDescendant((node: any) => {
			if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
				const propertyAccess = node
				const objectName = propertyAccess.getExpression()?.getText()
				const propertyName = propertyAccess.getName()
				
				if (objectName === reqName) {
					switch (propertyName) {
						case "body":
							this.analyzeBodyUsage(endpoint, node)
							break
						case "params":
							this.analyzeParamsUsage(endpoint, node)
							break
						case "query":
							this.analyzeQueryUsage(endpoint, node)
							break
					}
				}
			}
		})
	}

	private analyzeTypedBodyUsage(endpoint: ExpressEndpoint, varType: any, varName: string): void {
		const typeText = varType.getText()
		
		// Extract the actual type name from complex import paths
		let actualTypeName = typeText
		if (typeText.includes('import(') && typeText.includes(').')) {
			// Extract type name from import("...").TypeName format
			const match = typeText.match(/import\([^)]+\)\.(.+)$/)
			if (match) {
				actualTypeName = match[1]
			}
		}
		
		// Check if this type is in our cache (try both full type text and extracted name)
		let typeInfo = this.typeCache.get(typeText) || this.typeCache.get(actualTypeName)
		
		if (!typeInfo && this.importedTypes.has(typeText)) {
			const mappedType = this.importedTypes.get(typeText)!
			typeInfo = this.typeCache.get(mappedType)
		}
		
		if (!typeInfo && this.importedTypes.has(actualTypeName)) {
			const mappedType = this.importedTypes.get(actualTypeName)!
			typeInfo = this.typeCache.get(mappedType)
		}
		
		if (typeInfo && typeInfo.properties) {
			endpoint.requestBody = {
				type: "object",
				properties: typeInfo.properties,
				required: typeInfo.required || []
			}
		} else {
			endpoint.requestBody = {
				type: this.extractTypeFromNode(varType)
			}
		}
	}

	private analyzeTypedQueryUsage(endpoint: ExpressEndpoint, varType: any, varName: string): void {
		const typeText = varType.getText()
		
		// Extract the actual type name from complex import paths
		let actualTypeName = typeText
		if (typeText.includes('import(') && typeText.includes(').')) {
			// Extract type name from import("...").TypeName format
			const match = typeText.match(/import\([^)]+\)\.(.+)$/)
			if (match) {
				actualTypeName = match[1]
			}
		}
		
		// Check if this type is in our cache (try both full type text and extracted name)
		let typeInfo = this.typeCache.get(typeText) || this.typeCache.get(actualTypeName)
		
		if (!typeInfo && this.importedTypes.has(typeText)) {
			const mappedType = this.importedTypes.get(typeText)!
			typeInfo = this.typeCache.get(mappedType)
		}
		
		if (!typeInfo && this.importedTypes.has(actualTypeName)) {
			const mappedType = this.importedTypes.get(actualTypeName)!
			typeInfo = this.typeCache.get(mappedType)
		}
		
		if (typeInfo && typeInfo.properties) {
			// Add query parameters based on the type
			endpoint.parameters = endpoint.parameters || []
			Object.entries(typeInfo.properties).forEach(([propName, propInfo]) => {
				endpoint.parameters!.push({
					name: propName,
					type: propInfo.type,
					required: typeInfo.required?.includes(propName) || false,
					location: "query",
					description: propInfo.description || `Query parameter: ${propName}`
				})
			})
		}
	}

	private analyzeTypedParamsUsage(endpoint: ExpressEndpoint, varType: any, varName: string): void {
		// For params, we typically just have string types, but we can check for number conversion
		// Since we can't easily traverse the AST from the type object, we'll rely on the path parameter analysis
		// and the fact that path parameters are typically strings that might be converted to numbers
		
		// Look for parseInt usage in the handler by analyzing the entire handler node
		// This is a simplified approach - in a real implementation, we'd need more sophisticated AST traversal
		if (endpoint.parameters) {
			endpoint.parameters.forEach(param => {
				if (param.location === "path" && param.name === "id") {
					// Common pattern: id parameters are often converted to numbers
					param.type = "number"
				}
			})
		}
	}

	private analyzeBodyUsage(endpoint: ExpressEndpoint, bodyNode: any): void {
		// If we already have detailed request body info from typed analysis, don't overwrite it
		if (endpoint.requestBody && endpoint.requestBody.properties) {
			return
		}
		
		// Look for property access on req.body to understand the structure
		const properties: Record<string, any> = {}
		const required: string[] = []
		
		bodyNode.getParent()?.forEachDescendant((node: any) => {
			if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
				const propertyAccess = node
				const objectName = propertyAccess.getExpression()?.getText()
				
				if (objectName?.includes("body")) {
					const propertyName = propertyAccess.getName()
					properties[propertyName] = {
						type: "string", // Default type
						description: `Body parameter: ${propertyName}`
					}
					required.push(propertyName)
				}
			}
		})
		
		if (Object.keys(properties).length > 0) {
			endpoint.requestBody = {
				type: "object",
				properties,
				required
			}
		} else {
			endpoint.requestBody = {
				type: "object"
			}
		}
	}

	private analyzeParamsUsage(endpoint: ExpressEndpoint, paramsNode: any): void {
		// Look for req.params usage to understand path parameters
		paramsNode.getParent()?.forEachDescendant((node: any) => {
			if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
				const propertyAccess = node
				const objectName = propertyAccess.getExpression()?.getText()
				
				if (objectName?.includes("params")) {
					const propertyName = propertyAccess.getName()
					
					// Check if this parameter is already in our path parameters
					const existingParam = endpoint.parameters?.find(p => p.name === propertyName)
					if (!existingParam) {
						endpoint.parameters = endpoint.parameters || []
						endpoint.parameters.push({
							name: propertyName,
							type: "string",
							required: true,
							location: "path",
							description: `Path parameter: ${propertyName}`
						})
					}
				}
			}
		})
	}

	private analyzeQueryUsage(endpoint: ExpressEndpoint, queryNode: any): void {
		// Look for req.query usage to understand query parameters
		queryNode.getParent()?.forEachDescendant((node: any) => {
			if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
				const propertyAccess = node
				const objectName = propertyAccess.getExpression()?.getText()
				
				if (objectName?.includes("query")) {
					const propertyName = propertyAccess.getName()
					
					endpoint.parameters = endpoint.parameters || []
					endpoint.parameters.push({
						name: propertyName,
						type: "string",
						required: false,
						location: "query",
						description: `Query parameter: ${propertyName}`
					})
				}
			}
		})
	}

	private analyzeResponseType(endpoint: ExpressEndpoint, handlerNode: any, resParam: any): void {
		// Look for res.json() calls to understand response type
		handlerNode.forEachDescendant((node: any) => {
			if (node.getKind() === SyntaxKind.CallExpression) {
				const callExpression = node
				const expression = callExpression.getExpression()
				
				if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
					const propertyAccess = expression
					const objectName = propertyAccess.getExpression()?.getText()
					const methodName = propertyAccess.getName()
					
					if (objectName === resParam.getName() && methodName === "json") {
						// Try to infer response type from the argument
						const args = callExpression.getArguments()
						if (args.length > 0) {
							const responseArg = args[0]
							const responseInfo = this.analyzeResponseArgument(responseArg)
							endpoint.responseType = responseInfo.type
							endpoint.responseSchema = responseInfo.schema
						}
					}
				}
			}
		})
	}

	private analyzeResponseArgument(node: any): { type: string; schema?: any } {
		// Handle array literals
		if (node.getKind() === SyntaxKind.ArrayLiteralExpression) {
			const elements = node.getElements()
			if (elements.length > 0) {
				// Analyze the first element to understand the array type
				const firstElement = elements[0]
				const elementInfo = this.analyzeResponseArgument(firstElement)
				
				return {
					type: "array",
					schema: {
						type: "array",
						items: elementInfo.schema || { type: elementInfo.type }
					}
				}
			}
			return { type: "array" }
		}
		
		// Handle object literals
		if (node.getKind() === SyntaxKind.ObjectLiteralExpression) {
			const properties: Record<string, any> = {}
			const required: string[] = []
			
			node.getProperties().forEach((prop: any) => {
				if (prop.getKind() === SyntaxKind.PropertyAssignment) {
					const propName = prop.getName()
					const propValue = prop.getInitializer()
					
					if (propValue) {
						const propInfo = this.analyzeResponseArgument(propValue)
						properties[propName] = {
							type: propInfo.type,
							description: `Response property: ${propName}`
						}
						
						// Assume all properties are required in response objects
						required.push(propName)
					}
				}
			})
			
			return {
				type: "object",
				schema: {
					type: "object",
					properties,
					required
				}
			}
		}
		
		// Handle identifier references (typed variables)
		if (node.getKind() === SyntaxKind.Identifier) {
			const varName = node.getText()
			
			// Look for variable declarations with types
			const parentFunction = this.findParentFunction(node)
			if (parentFunction) {
				let foundTypeInfo: any = null
				
				parentFunction.forEachDescendant((varNode: any) => {
					if (varNode.getKind() === SyntaxKind.VariableStatement) {
						const varDecl = varNode.getDeclarationList().getDeclarations()[0]
						if (varDecl && varDecl.getName() === varName) {
							const varType = varDecl.getType()
							const typeText = varType.getText()
							
							// Extract type name from complex import paths
							let actualTypeName = typeText
							if (typeText.includes('import(') && typeText.includes(').')) {
								const match = typeText.match(/import\([^)]+\)\.(.+)$/)
								if (match) {
									actualTypeName = match[1]
								}
							}
							
							// Check if this type is in our cache
							let typeInfo = this.typeCache.get(typeText) || this.typeCache.get(actualTypeName)
							
							if (!typeInfo && this.importedTypes.has(typeText)) {
								const mappedType = this.importedTypes.get(typeText)!
								typeInfo = this.typeCache.get(mappedType)
							}
							
							if (!typeInfo && this.importedTypes.has(actualTypeName)) {
								const mappedType = this.importedTypes.get(actualTypeName)!
								typeInfo = this.typeCache.get(mappedType)
							}
							
							if (typeInfo && typeInfo.properties) {
								foundTypeInfo = {
									type: "object",
									schema: {
										type: "object",
										properties: typeInfo.properties,
										required: typeInfo.required || []
									}
								}
							}
						}
					}
				})
				
				if (foundTypeInfo) {
					return foundTypeInfo
				}
			}
		}
		
		// Handle primitive literals
		if (node.getKind() === SyntaxKind.StringLiteral) {
			return { type: "string" }
		}
		if (node.getKind() === SyntaxKind.NumericLiteral) {
			return { type: "number" }
		}
		if (node.getKind() === SyntaxKind.TrueKeyword || node.getKind() === SyntaxKind.FalseKeyword) {
			return { type: "boolean" }
		}
		
		// Default fallback
		return { type: "object" }
	}

	private findParentFunction(node: any): any {
		let current = node.getParent()
		while (current) {
			if (current.getKind() === SyntaxKind.ArrowFunction || 
				current.getKind() === SyntaxKind.FunctionExpression ||
				current.getKind() === SyntaxKind.FunctionDeclaration) {
				return current
			}
			current = current.getParent()
		}
		return null
	}

	private inferResponseType(node: any): string {
		if (node.getKind() === SyntaxKind.ArrayLiteralExpression) {
			return "array"
		}
		if (node.getKind() === SyntaxKind.ObjectLiteralExpression) {
			return "object"
		}
		if (node.getKind() === SyntaxKind.StringLiteral) {
			return "string"
		}
		if (node.getKind() === SyntaxKind.NumericLiteral) {
			return "number"
		}
		return "object"
	}
} 