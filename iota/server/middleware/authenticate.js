const jwt = require('jsonwebtoken');
const { findById } = require('../utils/fileStorage');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Basic authentication middleware - in a real implementation, you would use JWT tokens
// This simplified version just gets the user ID from the request headers
const authenticate = (req, res, next) => {
  // For development/testing, allow User-ID header as fallback


  console.log('Headers:', req.headers);
  
  if (req.headers['user-id']) {
    // Simplified authentication for testing
    req.user = {
      id: req.headers['user-id'] || 'demo-user',
      role: req.headers['user-role'] || 'admin' // Default to regular user
    };
    
    return next();
  }

  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // In a real app, you'd verify the token here
    // For demo purposes, we'll just assume it's valid
    // and extract the user ID from it
    
    // For demo, set a user object based on the token
    req.user = {
      id: token.substring(0, 10) || 'demo-user', // Just use part of token as ID
      role: 'provider' // Grant provider access for testing
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is a provider
const isProvider = (req, res, next) => {
  // For testing purposes, accept a user-role header
  if (req.headers['user-role'] === 'provider') {
    return next();
  }
  
  // Check if user exists and has provider role
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // For development, accept any authenticated user as a provider
  // In production, you'd check a proper role field
  if (req.user.role === 'provider') {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied. Providers only.' });
};

// NEW: Middleware to check if user is a hospital admin
const isHospitalAdmin = async (req, res, next) => {
  // For testing purposes, accept a user-role header
  if (req.headers['user-role'] === 'hospital_admin' || req.headers['user-role'] === 'admin') {
    return next();
  }
  
  // Check if user exists
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check for hospital admin role
  if (req.user.role === 'hospital_admin' || req.user.role === 'admin') {
    // If a specific hospital ID is provided in the params, check if this admin has access
    if (req.params.hospitalId) {
      try {
        const hospital = await findById('hospitals.json', req.params.hospitalId);
        
        // If user is system admin, allow access to any hospital
        if (req.user.role === 'admin') {
          return next();
        }
        
        // Check if this admin is authorized for this hospital
        if (!hospital || hospital.adminId !== req.user.id) {
          return res.status(403).json({ 
            error: 'Access denied. Not authorized for this hospital.' 
          });
        }
      } catch (error) {
        return res.status(500).json({ error: 'Error checking hospital authorization' });
      }
    }
    
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied. Hospital admins only.' });
};

// NEW: Middleware to check if user is a system admin
const isAdmin = (req, res, next) => {
  // For testing purposes, accept a user-role header
  if (req.headers['user-role'] === 'admin') {
    return next();
  }
  
  // Check if user exists and has admin role
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied. Admins only.' });
};

module.exports = {
  authenticate,
  isProvider,
  isHospitalAdmin, // Export new middleware
  isAdmin          // Export new middleware
};