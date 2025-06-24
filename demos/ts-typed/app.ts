import express from 'express'
import { User, CreateUserRequest, UpdateUserRequest, UserQueryParams, Product, ProductQueryParams } from './types'

const app = express()

app.use(express.json())

// Typed routes with proper query parameter interfaces
app.get('/api/users', (req, res) => {
	const query: UserQueryParams = req.query
	
	// Mock database of users
	const allUsers: User[] = [
		{ id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
		{ id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active' },
		{ id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive' },
		{ id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active' },
		{ id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'pending' }
	]
	
	let filteredUsers = allUsers
	
	// Apply status filter
	if (query.status) {
		filteredUsers = filteredUsers.filter(user => user.status === query.status)
	}
	
	// Apply search filter
	if (query.search) {
		const searchTerm = query.search.toLowerCase()
		filteredUsers = filteredUsers.filter(user => 
			user.name.toLowerCase().includes(searchTerm) || 
			user.email.toLowerCase().includes(searchTerm)
		)
	}
	
	// Apply pagination
	const offset = query.offset ? parseInt(query.offset.toString()) : 0
	const limit = query.limit ? parseInt(query.limit.toString()) : filteredUsers.length
	
	const paginatedUsers = filteredUsers.slice(offset, offset + limit)
	
	res.json({
		users: paginatedUsers,
		total: filteredUsers.length,
		offset,
		limit
	})
})

app.get('/api/products', (req, res) => {
	const query: ProductQueryParams = req.query
	
	const products: Product[] = [
		{ id: 1, name: 'Laptop', category: 'electronics', price: 999, inStock: true },
		{ id: 2, name: 'Book', category: 'books', price: 25, inStock: true },
		{ id: 3, name: 'Phone', category: 'electronics', price: 599, inStock: false },
		{ id: 4, name: 'Tablet', category: 'electronics', price: 399, inStock: true }
	]
	
	let filtered = products
	
	if (query.category) {
		filtered = filtered.filter(p => p.category === query.category)
	}
	
	if (query.minPrice) {
		filtered = filtered.filter(p => p.price >= query.minPrice!)
	}
	
	if (query.maxPrice) {
		filtered = filtered.filter(p => p.price <= query.maxPrice!)
	}
	
	if (query.inStock !== undefined) {
		filtered = filtered.filter(p => p.inStock === query.inStock)
	}
	
	if (query.sortBy === 'price') {
		filtered.sort((a, b) => a.price - b.price)
	} else if (query.sortBy === 'name') {
		filtered.sort((a, b) => a.name.localeCompare(b.name))
	} else if (query.sortBy === 'category') {
		filtered.sort((a, b) => a.category.localeCompare(b.category))
	}
	
	res.json(filtered)
})

app.get('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id)
	const user: User = { id, name: `User ${id}`, email: `user${id}@example.com`, status: 'active' }
	res.json(user)
})

app.post('/api/users', (req, res) => {
	const newUserData: CreateUserRequest = req.body
	const newUser: User = {
		id: Date.now(),
		name: newUserData.name,
		email: newUserData.email,
		status: newUserData.status || 'active'
	}
	res.status(201).json(newUser)
})

app.put('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id)
	const updateData: UpdateUserRequest = req.body
	const updatedUser: User = {
		id,
		name: updateData.name || `User ${id}`,
		email: updateData.email || `user${id}@example.com`,
		status: updateData.status || 'active'
	}
	res.json(updatedUser)
})

app.delete('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id)
	res.json({ message: `User ${id} deleted` })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Server running on port ${port}`)
}) 