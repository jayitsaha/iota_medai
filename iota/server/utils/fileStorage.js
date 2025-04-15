const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Base directory for all data files
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

// Ensure data directory exists
const initStorage = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`Data directory ensured at: ${DATA_DIR}`);
    
    // Initialize all required files with empty arrays if they don't exist
    const requiredFiles = [
      'users.json',
      'services.json',
      'bookings.json',
      'ratings.json',
      'wallets.json',
      'transactions.json',
      'payments.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(DATA_DIR, file);
      try {
        await fs.access(filePath);
        console.log(`File exists: ${file}`);
      } catch (error) {
        // File doesn't exist, create it with empty array
        await fs.writeFile(filePath, '[]');
        console.log(`Created empty file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
};

// Read data from a JSON file
const readData = async (filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return [];
    }
    console.error(`Error reading file ${filename}:`, error);
    throw error;
  }
};

// Write data to a JSON file
const writeData = async (filename, data) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to file ${filename}:`, error);
    throw error;
  }
};

// Find an entity by ID in a file
const findById = async (filename, id, idField = 'id') => {
  const data = await readData(filename);
  return data.find(item => item[idField] === id);
};

// Find entities matching a predicate
const findMany = async (filename, predicate = null) => {
  const data = await readData(filename);
  if (!predicate) return data;
  return data.filter(predicate);
};

// Create a new entity
const create = async (filename, entity, idField = 'id') => {
  const data = await readData(filename);
  
  // Generate ID if not provided
  if (!entity[idField]) {
    entity[idField] = uuidv4();
  }
  
  // Add timestamps
  entity.createdAt = entity.createdAt || new Date().toISOString();
  entity.updatedAt = new Date().toISOString();
  
  data.push(entity);
  await writeData(filename, data);
  return entity;
};

// Update an entity
const update = async (filename, id, updates, idField = 'id') => {
  const data = await readData(filename);
  const index = data.findIndex(item => item[idField] === id);
  
  if (index === -1) {
    throw new Error(`Entity with ID ${id} not found in ${filename}`);
  }
  
  // Update timestamps
  updates.updatedAt = new Date().toISOString();
  
  // Merge updates with existing entity
  data[index] = { ...data[index], ...updates };
  
  await writeData(filename, data);
  return data[index];
};

// Remove an entity
const remove = async (filename, id, idField = 'id') => {
  const data = await readData(filename);
  const filtered = data.filter(item => item[idField] !== id);
  
  if (filtered.length === data.length) {
    throw new Error(`Entity with ID ${id} not found in ${filename}`);
  }
  
  await writeData(filename, filtered);
  return true;
};

// Query entities with filtering, sorting, and pagination
const query = async (filename, options = {}) => {
  let data = await readData(filename);
  
  // Apply filters
  if (options.filters) {
    data = data.filter(item => {
      for (const [key, value] of Object.entries(options.filters)) {
        // Handle $or operator
        if (key === '$or' && Array.isArray(value)) {
          const orResult = value.some(condition => {
            for (const [orKey, orValue] of Object.entries(condition)) {
              if (item[orKey] === orValue) return true;
            }
            return false;
          });
          if (!orResult) return false;
          continue;
        }
        
        // Handle special filter operators
        if (typeof value === 'object' && value !== null) {
          if (value.$eq !== undefined && item[key] !== value.$eq) return false;
          if (value.$gt !== undefined && item[key] <= value.$gt) return false;
          if (value.$lt !== undefined && item[key] >= value.$lt) return false;
          if (value.$gte !== undefined && item[key] < value.$gte) return false;
          if (value.$lte !== undefined && item[key] > value.$lte) return false;
          if (value.$in !== undefined && !value.$in.includes(item[key])) return false;
        } else if (item[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }
  
  // Apply text search
  if (options.search && options.searchFields && options.searchFields.length > 0) {
    const searchTerm = options.search.toLowerCase();
    data = data.filter(item => {
      return options.searchFields.some(field => {
        if (!item[field]) return false;
        return item[field].toString().toLowerCase().includes(searchTerm);
      });
    });
  }
  
  // Get total count before pagination
  const total = data.length;
  
  // Apply sorting
  if (options.sort) {
    const [field, order] = options.sort.split(':');
    data.sort((a, b) => {
      if (a[field] < b[field]) return order === 'desc' ? 1 : -1;
      if (a[field] > b[field]) return order === 'desc' ? -1 : 1;
      return 0;
    });
  }
  
  // Apply pagination
  if (options.limit !== undefined) {
    const offset = options.offset || 0;
    data = data.slice(offset, offset + options.limit);
  }
  
  return {
    data,
    total,
    limit: options.limit,
    offset: options.offset || 0
  };
};

module.exports = {
  initStorage,
  readData,
  writeData,
  findById,
  findMany,
  create,
  update,
  remove,
  query
};