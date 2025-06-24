const express = require('express')
const app = express()

app.use(express.json())

// Sample routes for testing
app.get('/api/users', (req, res) => {
  // Extract query parameters
  const { limit, offset, search } = req.query
  
  // Mock database of users
  const allUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com' }
  ]
  
  let filteredUsers = allUsers
  
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
  
  res.json(paginatedUsers)
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
    email: req.body.email
  }
  res.status(201).json(newUser)
})

app.put('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const updatedUser = {
    id,
    name: req.body.name,
    email: req.body.email
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