const express = require('express')
const app = express()

app.use(express.json())

// Basic CRUD routes without query parameters
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ])
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