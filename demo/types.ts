export interface User {
	id: number
	name: string
	email: string
	createdAt?: Date
}

export interface CreateUserRequest {
	name: string
	email: string
}

export interface UpdateUserRequest {
	name?: string
	email?: string
}

export interface QueryParams {
	limit?: number
	offset?: number
	search?: string
} 