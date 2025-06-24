// Tool handler for GET /api/users/:id

export async function getApiUsersById(args) {
	try {
		const baseUrl = "http://localhost:3000"
		let url = "/api/users/:id"
		url = url.replace(":id", args.id || "")
		const queryParams = new URLSearchParams()
		
		if (queryParams.toString()) {
			url += "?" + queryParams.toString()
		}
		const fullUrl = baseUrl + url
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		}
		if (["POST", "PUT", "PATCH"].includes("GET") && args.body) {
			options.body = JSON.stringify(args.body)
		}
		const response = await fetch(fullUrl, options)
		const result = await response.text()
		return {
			content
				{
					type: "text",
					text: `Request: ${options.method} ${fullUrl}\nResponse: ${result}`
				}
			]
		}
	} catch (error) {
		return {
			content
				{
					type: "text",
					text: `Error calling GET /api/users/:id: ${error}`
				}
			]
		}
	}
}