// Tool handler for POST /api/users

export async function postApiUsers(args) {
	try {
		const baseUrl = "http://localhost:3000"
		let url = "/api/users"
		
		const queryParams = new URLSearchParams()
		
		if (queryParams.toString()) {
			url += "?" + queryParams.toString()
		}
		const fullUrl = baseUrl + url
		const options = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		}
		if (["POST", "PUT", "PATCH"].includes("POST") && args.body) {
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
					text: `Error calling POST /api/users: ${error}`
				}
			]
		}
	}
}