// Tool handler for PUT /api/users/:id
export async function putApiUsersById(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
	try {
		// Construct URL for the Express endpoint
		const baseUrl = "http://localhost:3000"
		let url = "/api/users/:id"
		
		// Replace path parameters
		url = url.replace(":id", args.id || "")
		
		// Add query parameters
		const queryParams = new URLSearchParams()
		
		
		if (queryParams.toString()) {
			url += "?" + queryParams.toString()
		}
		
		const fullUrl = baseUrl + url
		
		// Make HTTP request to Express app
		const options: RequestInit = {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
		}
		
		// Add body for POST/PUT requests
		if (["POST", "PUT", "PATCH"].includes("PUT") && args.body) {
			options.body = JSON.stringify(args.body)
		}
		
		const response = await fetch(fullUrl, options)
		const result = await response.text()
		
		return {
			content: [
				{
					type: "text",
					text: `Request: ${options.method} ${fullUrl}\nResponse: ${result}`
				}
			]
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Error calling PUT /api/users/:id: ${error}`
				}
			]
		}
	}
}
