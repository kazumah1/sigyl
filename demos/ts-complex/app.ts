import express from 'express'
import { 
	User, 
	CreateUserRequest, 
	UpdateUserRequest, 
	UserSearchQuery, 
	PaginatedResponse,
	ApiResponse,
	AdvancedSearchQuery
} from './types'

const app = express()

app.use(express.json())

// Complex route with extensive query parameters
app.get('/api/users/search', (req, res) => {
	const query: UserSearchQuery = req.query
	
	// Mock complex user data
	const allUsers: User[] = [
		{
			id: 1,
			name: 'John Doe',
			email: 'john@example.com',
			profile: {
				firstName: 'John',
				lastName: 'Doe',
				bio: 'Software developer',
				location: {
					city: 'New York',
					country: 'USA',
					timezone: 'EST'
				}
			},
			preferences: {
				theme: 'dark',
				language: 'en',
				notifications: {
					email: true,
					push: false,
					sms: true
				},
				privacy: {
					profileVisible: true,
					emailVisible: false
				}
			},
			createdAt: new Date('2023-01-01'),
			updatedAt: new Date('2024-01-01')
		},
		{
			id: 2,
			name: 'Jane Smith',
			email: 'jane@example.com',
			profile: {
				firstName: 'Jane',
				lastName: 'Smith',
				bio: 'Product manager',
				location: {
					city: 'San Francisco',
					country: 'USA',
					timezone: 'PST'
				}
			},
			preferences: {
				theme: 'light',
				language: 'en',
				notifications: {
					email: true,
					push: true,
					sms: false
				},
				privacy: {
					profileVisible: true,
					emailVisible: true
				}
			},
			createdAt: new Date('2023-02-01'),
			updatedAt: new Date('2024-02-01')
		}
	]
	
	let filteredUsers = allUsers
	
	// Apply various filters
	if (query.q) {
		const searchTerm = query.q.toLowerCase()
		filteredUsers = filteredUsers.filter(user => 
			user.name.toLowerCase().includes(searchTerm) ||
			user.email.toLowerCase().includes(searchTerm) ||
			user.profile.bio?.toLowerCase().includes(searchTerm)
		)
	}
	
	if (query.name) {
		filteredUsers = filteredUsers.filter(user => 
			user.name.toLowerCase().includes(query.name!.toLowerCase())
		)
	}
	
	if (query.email) {
		filteredUsers = filteredUsers.filter(user => 
			user.email.toLowerCase().includes(query.email!.toLowerCase())
		)
	}
	
	if (query.city) {
		filteredUsers = filteredUsers.filter(user => 
			user.profile.location.city.toLowerCase() === query.city!.toLowerCase()
		)
	}
	
	if (query.country) {
		filteredUsers = filteredUsers.filter(user => 
			user.profile.location.country.toLowerCase() === query.country!.toLowerCase()
		)
	}
	
	if (query.theme) {
		filteredUsers = filteredUsers.filter(user => 
			user.preferences.theme === query.theme
		)
	}
	
	// Apply sorting
	if (query.sortBy) {
		const sortOrder = query.sortOrder || 'asc'
		filteredUsers.sort((a, b) => {
			let aVal: any, bVal: any
			
			switch (query.sortBy) {
				case 'name':
					aVal = a.name
					bVal = b.name
					break
				case 'email':
					aVal = a.email
					bVal = b.email
					break
				case 'createdAt':
					aVal = a.createdAt
					bVal = b.createdAt
					break
				case 'updatedAt':
					aVal = a.updatedAt || a.createdAt
					bVal = b.updatedAt || b.createdAt
					break
				default:
					return 0
			}
			
			const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
			return sortOrder === 'desc' ? -comparison : comparison
		})
	}
	
	// Apply pagination
	const offset = query.offset || 0
	const limit = query.limit || 10
	const paginatedUsers = filteredUsers.slice(offset, offset + limit)
	
	// Optionally strip data based on include flags
	const responseUsers = paginatedUsers.map(user => {
		const result: any = {
			id: user.id,
			name: user.name,
			email: user.email,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		}
		
		if (query.includeProfile !== false) {
			result.profile = user.profile
		}
		
		if (query.includePreferences !== false) {
			result.preferences = user.preferences
		}
		
		return result
	})
	
	const response: PaginatedResponse<User> = {
		data: responseUsers,
		pagination: {
			total: filteredUsers.length,
			limit,
			offset,
			hasNext: offset + limit < filteredUsers.length,
			hasPrev: offset > 0
		},
		filters: {
			q: query.q,
			name: query.name,
			email: query.email,
			city: query.city,
			country: query.country,
			theme: query.theme
		}
	}
	
	res.json(response)
})

// Route with nested query parameters (advanced)
app.get('/api/users/advanced-search', (req, res) => {
	const query: AdvancedSearchQuery = req.query as any // Type assertion for complex nested params
	
	// This would handle nested query parameters like:
	// ?user[name]=John&user[location][city]=NYC&preferences[theme]=dark&pagination[limit]=5
	
	const response: ApiResponse<any> = {
		success: true,
		data: {
			message: 'Advanced search endpoint',
			receivedQuery: query,
			note: 'This demonstrates complex nested query parameter handling'
		},
		timestamp: new Date().toISOString()
	}
	
	res.json(response)
})

// Standard CRUD routes
app.get('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id)
	
	const mockUser: User = {
		id,
		name: `User ${id}`,
		email: `user${id}@example.com`,
		profile: {
			firstName: `User`,
			lastName: `${id}`,
			location: {
				city: 'Unknown',
				country: 'Unknown',
				timezone: 'UTC'
			}
		},
		preferences: {
			theme: 'light',
			language: 'en',
			notifications: {
				email: true,
				push: true,
				sms: false
			},
			privacy: {
				profileVisible: true,
				emailVisible: false
			}
		},
		createdAt: new Date()
	}
	
	const response: ApiResponse<User> = {
		success: true,
		data: mockUser,
		timestamp: new Date().toISOString()
	}
	
	res.json(response)
})

app.post('/api/users', (req, res) => {
	const userData: CreateUserRequest = req.body
	
	const newUser: User = {
		id: Date.now(),
		name: userData.name,
		email: userData.email,
		profile: {
			...userData.profile,
			avatar: undefined
		},
		preferences: {
			theme: 'light',
			language: 'en',
			notifications: {
				email: true,
				push: true,
				sms: false
			},
			privacy: {
				profileVisible: true,
				emailVisible: false
			},
			...userData.preferences
		},
		createdAt: new Date()
	}
	
	const response: ApiResponse<User> = {
		success: true,
		data: newUser,
		timestamp: new Date().toISOString()
	}
	
	res.status(201).json(response)
})

const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Server running on port ${port}`)
}) 