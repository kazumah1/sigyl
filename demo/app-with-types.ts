import express from 'express'
import { User, CreateUserRequest, UpdateUserRequest, QueryParams } from './types'

const app = express()

app.use(express.json())

// Sample routes for testing with proper TypeScript types
app.get('/api/users', (req, res) => {
	const query: QueryParams = req.query
	res.json([
		{ id: 1, name: 'John Doe', email: 'john@example.com' },
		{ id: 2, name: 'Jane Smith', email: 'jane@example.com' }
	])
})

app.get('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id)
	const user: User = { id, name: `User ${id}`, email: `user${id}@example.com` }
	res.json(user)
})

app.post('/api/users', (req, res) => {
	const newUserData: CreateUserRequest = req.body
	const newUser: User = {
		id: Date.now(),
		name: newUserData.name,
		email: newUserData.email
	}
	res.status(201).json(newUser)
})

app.put('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id)
	const updateData: UpdateUserRequest = req.body
	const updatedUser: User = {
		id,
		name: updateData.name || `User ${id}`,
		email: updateData.email || `user${id}@example.com`
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