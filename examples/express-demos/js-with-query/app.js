const express = require('express')
const app = express()

app.use(express.json())

// Routes with query parameter usage
app.get('/api/users', (req, res) => {
  // Extract query parameters using destructuring
  const { limit, offset, search, status } = req.query
  
  // Mock database of users
  const allUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'pending' }
  ]
  
  let filteredUsers = allUsers
  
  // Apply status filter
  if (status) {
    filteredUsers = filteredUsers.filter(user => user.status === status)
  }
  
  // Apply search filter
  if (search) {
    const searchTerm = search.toLowerCase()
    filteredUsers = filteredUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) || 
      user.email.toLowerCase().includes(searchTerm)
    )
  }
  
  // Apply pagination
  const parsedOffset = offset ? parseInt(offset) : 0
  const parsedLimit = limit ? parseInt(limit) : filteredUsers.length
  
  const paginatedUsers = filteredUsers.slice(parsedOffset, parsedOffset + parsedLimit)
  
  res.json({
    users: paginatedUsers,
    total: filteredUsers.length,
    offset: parsedOffset,
    limit: parsedLimit
  })
})

app.get('/api/products', (req, res) => {
  // Different query parameter pattern
  const { category, minPrice, maxPrice, sortBy } = req.query
  
  const products = [
    { id: 1, name: 'Laptop', category: 'electronics', price: 999 },
    { id: 2, name: 'Book', category: 'books', price: 25 },
    { id: 3, name: 'Phone', category: 'electronics', price: 599 }
  ]
  
  let filtered = products
  
  if (category) {
    filtered = filtered.filter(p => p.category === category)
  }
  
  if (minPrice) {
    const min = parseFloat(minPrice)
    filtered = filtered.filter(p => p.price >= min)
  }
  
  if (maxPrice) {
    const max = parseFloat(maxPrice)
    filtered = filtered.filter(p => p.price <= max)
  }
  
  if (sortBy === 'price') {
    filtered.sort((a, b) => a.price - b.price)
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  }
  
  res.json(filtered)
})

app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const user = { id, name: `User ${id}`, email: `user${id}@example.com` }
  res.json(user)
})

app.post('/api/users', (req, res) => {
  const newUser = {
    id: Date.now(),
    name: req.body.name,
    email: req.body.email,
    status: req.body.status || 'active'
  }
  res.status(201).json(newUser)
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
}) 