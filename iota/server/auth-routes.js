const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const {
  findMany,
  findById,
  create,
  update
} = require('./utils/fileStorage');

const router = express.Router();

// POST /api/auth/register - Register a new user
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'patient' } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    
    // Check if email already exists
    const existingUsers = await findMany('users.json', user => user.email === email);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = hashPassword(password);
    
    // Create user
    const user = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await create('users.json', user);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login - User login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const users = await findMany('users.json', user => user.email === email);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = users[0];
    
    // Check password
    const isPasswordValid = verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // In a real implementation, we would generate a JWT token here
    // For simplicity, we'll just return the user ID
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// GET /api/auth/users/me - Get current user
router.get('/auth/users/me', async (req, res) => {
  try {
    // Get user ID from request headers (simplified for demo)
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Find user by ID
    const user = await findById('users.json', userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/auth/users/me - Update current user
router.put('/auth/users/me', async (req, res) => {
  try {
    // Get user ID from request headers
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Find user by ID
    const user = await findById('users.json', userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Extract updateable fields
    const { name, email, password } = req.body;
    
    // Prepare updates
    const updates = {};
    
    if (name) updates.name = name;
    
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUsers = await findMany('users.json', u => u.email === email && u.id !== userId);
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      
      updates.email = email;
    }
    
    if (password) {
      updates.password = hashPassword(password);
    }
    
    // Update user
    if (Object.keys(updates).length > 0) {
      const updatedUser = await update('users.json', userId, updates);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      res.json({
        message: 'User updated successfully',
        user: userWithoutPassword
      });
    } else {
      // No updates provided
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        message: 'No changes made',
        user: userWithoutPassword
      });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Helper function to hash passwords
function hashPassword(password) {
  // In a real implementation, you would use bcrypt or similar
  // This is a simple hash for demonstration
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

// Helper function to verify passwords
function verifyPassword(password, hashedPassword) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex') === hashedPassword;
}

module.exports = router;