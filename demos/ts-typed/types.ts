export interface User {
	id: number
	name: string
	email: string
	status: 'active' | 'inactive' | 'pending'
	createdAt?: Date
}

export interface CreateUserRequest {
	name: string
	email: string
	status?: 'active' | 'inactive' | 'pending'
}

export interface UpdateUserRequest {
	name?: string
	email?: string
	status?: 'active' | 'inactive' | 'pending'
}

export interface UserQueryParams {
	limit?: number
	offset?: number
	search?: string
	status?: 'active' | 'inactive' | 'pending'
}

export interface Product {
	id: number
	name: string
	category: string
	price: number
	inStock: boolean
}

export interface ProductQueryParams {
	category?: string
	minPrice?: number
	maxPrice?: number
	sortBy?: 'name' | 'price' | 'category'
	inStock?: boolean
} 