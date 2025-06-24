import { Project, SyntaxKind } from "ts-morph"
import { join } from "node:path"
import { existsSync, readdirSync, statSync } from "node:fs"
import { verboseLog } from "../logger"

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
	}>
}

export class ExpressScanner {
	private project: Project
	private directory: string

	constructor(directory: string) {
		this.directory = directory
		this.project = new Project({
			tsConfigFilePath: existsSync(join(directory, "tsconfig.json")) ? join(directory, "tsconfig.json") : undefined,
		})
	}

	async scanForEndpoints(framework?: string): Promise<ExpressEndpoint[]> {
		const endpoints: ExpressEndpoint[] = []
		
		// Find JavaScript/TypeScript files to scan
		const filesToScan = this.findSourceFiles()
		verboseLog(`Scanning ${filesToScan.length} files for Express routes`)

		for (const filePath of filesToScan) {
			try {
				const sourceFile = this.project.addSourceFileAtPath(filePath)
				const fileEndpoints = this.scanFileForRoutes(sourceFile)
				endpoints.push(...fileEndpoints)
				verboseLog(`Found ${fileEndpoints.length} routes in ${filePath}`)
			} catch (error) {
				verboseLog(`Error scanning ${filePath}: ${error}`)
			}
		}

		return endpoints
	}

	private findSourceFiles(): string[] {
		const files: string[] = []
		const extensions = ['.js', '.ts', '.mjs', '.cjs']
		
		const scanDirectory = (dir: string) => {
			try {
				const items = readdirSync(dir)
				for (const item of items) {
					const fullPath = join(dir, item)
					const stat = statSync(fullPath)
					
					if (stat.isDirectory()) {
						// Skip node_modules and common build directories
						if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
							scanDirectory(fullPath)
						}
					} else if (stat.isFile()) {
						const hasValidExtension = extensions.some(ext => item.endsWith(ext))
						if (hasValidExtension) {
							files.push(fullPath)
						}
					}
				}
			} catch (error) {
				verboseLog(`Error scanning directory ${dir}: ${error}`)
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
								const endpoint: ExpressEndpoint = {
									method: methodName.toUpperCase(),
									path: path,
									handler: this.extractHandlerInfo(args[args.length - 1]),
									parameters: this.extractRouteParameters(path)
								}
								
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
		if (node.getKind() === SyntaxKind.TemplateExpression || node.getKind() === SyntaxKind.TemplateHead) {
			return node.getText().replace(/[`'"]/g, '')
		}
		return null
	}

	private extractHandlerInfo(node: any): string {
		// Try to get the handler function name or inline function info
		if (node.getKind() === SyntaxKind.Identifier) {
			return node.getText()
		}
		if (node.getKind() === SyntaxKind.ArrowFunction || node.getKind() === SyntaxKind.FunctionExpression) {
			return "inline function"
		}
		return "unknown handler"
	}

	private extractRouteParameters(path: string): Array<{
		name: string
		type: string
		required: boolean
		location: "path" | "query" | "body"
	}> {
		const parameters: Array<{
			name: string
			type: string
			required: boolean
			location: "path" | "query" | "body"
		}> = []

		// Extract path parameters (e.g., /users/:id)
		const pathParamRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
		let match
		while ((match = pathParamRegex.exec(path)) !== null) {
			parameters.push({
				name: match[1],
				type: "string",
				required: true,
				location: "path"
			})
		}

		return parameters
	}
} 