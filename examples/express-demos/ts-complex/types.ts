export interface User {
	id: number
	name: string
	email: string
	profile: UserProfile
	preferences: UserPreferences
	createdAt: Date
	updatedAt?: Date
}

export interface UserProfile {
	firstName: string
	lastName: string
	avatar?: string
	bio?: string
	location: {
		city: string
		country: string
		timezone: string
	}
}

export interface UserPreferences {
	theme: 'light' | 'dark' | 'auto'
	language: string
	notifications: {
		email: boolean
		push: boolean
		sms: boolean
	}
	privacy: {
		profileVisible: boolean
		emailVisible: boolean
	}
}

export interface CreateUserRequest {
	name: string
	email: string
	profile: Omit<UserProfile, 'avatar'>
	preferences?: Partial<UserPreferences>
}

export interface UpdateUserRequest {
	name?: string
	email?: string
	profile?: Partial<UserProfile>
	preferences?: Partial<UserPreferences>
}

export interface UserSearchQuery {
	q?: string                    // General search
	name?: string                 // Name filter
	email?: string                // Email filter
	city?: string                 // Location filter
	country?: string              // Country filter
	theme?: 'light' | 'dark' | 'auto'  // Theme filter
	limit?: number                // Pagination
	offset?: number               // Pagination
	sortBy?: 'name' | 'email' | 'createdAt' | 'updatedAt'
	sortOrder?: 'asc' | 'desc'
	includeProfile?: boolean      // Include profile data
	includePreferences?: boolean  // Include preferences data
}

export interface PaginatedResponse<T> {
	data: T[]
	pagination: {
		total: number
		limit: number
		offset: number
		hasNext: boolean
		hasPrev: boolean
	}
	filters?: Record<string, any>
}

export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: {
		code: string
		message: string
		details?: any
	}
	timestamp: string
}

// Nested query parameters for complex filtering
export interface AdvancedSearchQuery {
	user?: {
		name?: string
		email?: string
		location?: {
			city?: string
			country?: string
		}
	}
	preferences?: {
		theme?: 'light' | 'dark' | 'auto'
		language?: string
	}
	dateRange?: {
		from?: string
		to?: string
	}
	pagination?: {
		limit?: number
		offset?: number
	}
} 