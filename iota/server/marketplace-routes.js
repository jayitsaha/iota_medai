const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
// Fix: Import both fs versions - Promise-based and regular
const fsPromises = require('fs').promises;
const fs = require('fs');  // Regular fs for synchronous operations
const { v4: uuidv4 } = require('uuid');

// Import file storage utilities
const {
  findById,
  findMany,
  create,
  update,
  remove,
  query
} = require('./utils/fileStorage');

// Import authentication middleware
const { authenticate, isProvider } = require('./middleware/authenticate');

const router = express.Router();

// Tag for marketplace transactions
const TAG = 'HEALTHCARE_MARKETPLACE';

// Path to compiled Rust binaries
const RUST_BIN_PATH = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../bin') 
  : path.join(__dirname, '../target/release');

// Verify binary paths exist
const checkBinaries = () => {
  const submitPath = './iota_marketplace_submit';
  const fetchPath = './iota_marketplace_fetch';
  const paymentPath = './iota_marketplace_payment';
  const serviceRegisterPath = './iota_service_register';
  const serviceVerifyPath = './iota_service_verify';
  const serviceFetchPath = './iota_service_fetch';

  
  if (!fs.existsSync(submitPath)) {
    console.error(`Missing binary: ${submitPath}`);
    throw new Error('Missing IOTA marketplace submit binary');
  }
  
  if (!fs.existsSync(fetchPath)) {
    console.error(`Missing binary: ${fetchPath}`);
    throw new Error('Missing IOTA marketplace fetch binary');
  }
  
  if (!fs.existsSync(paymentPath)) {
    console.error(`Missing binary: ${paymentPath}`);
    throw new Error('Missing IOTA marketplace payment binary');
  }

  if (!fs.existsSync(serviceRegisterPath)) {
    console.error(`Missing binary: ${serviceRegisterPath}`);
    throw new Error('Missing IOTA marketplace service binary');
  }
  
  if (!fs.existsSync(serviceVerifyPath)) {
    console.error(`Missing binary: ${serviceVerifyPath}`);
    console.warn('Service verification on blockchain will be unavailable');
    // Not throwing an error for this one, as it's not critical
  }
  
  if (!fs.existsSync(serviceFetchPath)) {
    console.error(`Missing binary: ${serviceFetchPath}`);
    console.warn('Service fetching from blockchain will be unavailable');
    // Not throwing an error for this one, as it's not critical
  }
  
  return {
    submitPath,
    fetchPath,
    paymentPath,
    serviceRegisterPath,
    serviceVerifyPath,
    serviceFetchPath
  };
};

// Check binaries on startup
let binaries;
try {
  binaries = checkBinaries();
  console.log('IOTA marketplace binaries found and verified');
} catch (error) {
  console.error('IOTA binary verification failed:', error.message);
  // Continue anyway, we'll check again when the endpoints are hit
}

// GET /api/marketplace/services - Get all services
router.get('/marketplace/services', async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { category, search, provider, minPrice, maxPrice, sort } = req.query;
    
    // Check if we should try blockchain first
    const useBlockchain = req.query.blockchain === 'true';
    
    if (useBlockchain && binaries && binaries.serviceFetchPath) {
      try {
        // Add: Use iota_service_fetch binary to get services from blockchain
        // Determine parameters to pass to the Rust binary
        let providerParam = provider || '';
        let categoryParam = category || '';
        
        // Call the Rust binary to fetch services from blockchain
        const { stdout, stderr } = await execAsync(
          `${binaries.serviceFetchPath} ${providerParam} ${categoryParam}`
        );
        
        if (stderr && stderr.trim() !== '') {
          console.log('Output from blockchain service fetch:', stderr);
        }
        
        // Parse the blockchain results
        const blockchainServices = JSON.parse(stdout.trim());
        
        // Return the blockchain services
        if (blockchainServices && blockchainServices.length > 0) {
          const mappedServices = blockchainServices.map(service => ({
            id: service.service_id,
            title: service.title,
            provider: service.provider_id,
            providerCredentials: service.provider_credentials,
            category: service.category,
            categoryName: getCategoryName(service.category),
            description: service.description,
            price: service.price,
            rating: 0, // Default as blockchain doesn't have ratings
            reviewCount: 0,
            available: true,
            blockchainVerified: true,
            transactionId: service.transaction_id
          }));
          
          return res.json(mappedServices);
        }
        // If no blockchain services found, fall back to local database
      } catch (blockchainError) {
        console.error('Error fetching services from blockchain:', blockchainError);
        // Continue with local database
      }
    }
    
    // Build query options
    const queryOptions = {
      filters: {},
      searchFields: ['title', 'description', 'provider'],
      sort: sort || 'createdAt:desc'
    };
    
    if (category) {
      queryOptions.filters.category = category;
    }
    
    if (provider) {
      queryOptions.filters.provider = provider;
    }
    
    if (search) {
      queryOptions.search = search;
    }
    
    // Price range
    if (minPrice || maxPrice) {
      queryOptions.filters.price = {};
      if (minPrice) queryOptions.filters.price.$gte = parseInt(minPrice);
      if (maxPrice) queryOptions.filters.price.$lte = parseInt(maxPrice);
    }
    
    // Fetch services from JSON file
    const result = await query('services.json', queryOptions);
    
    // Get provider details for each service
    const services = await Promise.all(result.data.map(async (service) => {
      // Get provider details
      const provider = await findById('users.json', service.provider);
      
      return {
        id: service.id,
        title: service.title,
        provider: provider ? provider.name : 'Unknown Provider',
        providerCredentials: provider ? provider.credentials : '',
        category: service.category,
        categoryName: getCategoryName(service.category),
        description: service.description,
        price: service.price,
        rating: service.averageRating || 0,
        reviewCount: service.reviewCount || 0,
        available: service.available !== false // Default to true if not specified
      };
    }));
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching marketplace services:', error);
    res.status(500).json({ 
      error: `Failed to fetch marketplace services: ${error.message}`,
      services: [] // Return empty array on error
    });
  }
});

// POST /api/marketplace/services - Create a new service (providers only)
router.post('/marketplace/services', authenticate, isProvider, async (req, res) => {
  try {
    const { 
      title, 
      category, 
      description, 
      price, 
      duration, 
      location, 
      features,
      serviceType 
    } = req.body;
    
    // Validate required fields
    if (!title || !category || !description || !price) {
      return res.status(400).json({ 
        error: 'Title, category, description, and price are required' 
      });
    }
    
    // Get provider details
    const provider = await findById('users.json', req.user.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    // Generate service ID
    const serviceId = uuidv4();
    
    // Prepare service data for blockchain
    const serviceData = {
      service_id: serviceId,
      provider_id: req.user.id,
      title,
      category,
      description,
      price: parseInt(price),
      provider_credentials: provider.credentials || '',
      verification_status: 'verified', // Or 'pending' if requiring admin approval
      timestamp: new Date().toISOString()
    };
    
    // Make sure binaries exist
    if (!binaries) {
      binaries = checkBinaries();
    }
    
    try {
      // Fix: Improved JSON handling to prevent quote issues
      // Write the JSON to a temporary file instead of passing directly
      const tempFilePath = path.join(require('os').tmpdir(), `service_${serviceId}.json`);
      await fsPromises.writeFile(tempFilePath, JSON.stringify(serviceData));
      
      // Submit to blockchain using the file
      const { stdout, stderr } = await execAsync(`${binaries.serviceRegisterPath} "${tempFilePath}"`);
      
      // Clean up temp file
      await fsPromises.unlink(tempFilePath).catch(e => console.warn('Could not delete temp file:', e));
      
      if (stderr && stderr.trim() !== '') {
        console.log('Output from service registration:', stderr);
      }
      
      // Get blockchain transaction ID
      const outputLines = stdout.trim().split('\n');
      const blockId = outputLines[outputLines.length - 1];
      
      // Create service in local database
      const service = {
        id: serviceId,
        title,
        provider: req.user.id,
        category,
        description,
        price: parseInt(price),
        duration: duration || '60 minutes',
        location: location || getCategoryLocation(category),
        features: features || [],
        serviceType: serviceType || getCategoryServiceType(category),
        available: true,
        averageRating: 0,
        reviewCount: 0,
        blockchainTransactionId: blockId,
        blockchainStatus: 'Confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await create('services.json', service);

      console.log(blockId)
      
      res.status(201).json({
        success: true,
        service,
        blockchainTransactionId: blockId
      });
    } catch (rustError) {
      console.error('Error registering service on blockchain:', rustError);
      
      // Create service in database with pending blockchain status
      const service = {
        id: serviceId,
        title,
        provider: req.user.id,
        category,
        description,
        price: parseInt(price),
        duration: duration || '60 minutes',
        location: location || getCategoryLocation(category),
        features: features || [],
        serviceType: serviceType || getCategoryServiceType(category),
        available: true,
        averageRating: 0,
        reviewCount: 0,
        blockchainStatus: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await create('services.json', service);
      
      res.status(201).json({
        success: true,
        warning: 'Service created but blockchain verification is pending',
        service
      });
    }
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ 
      error: `Failed to create service: ${error.message}`
    });
  }
});

router.get('/marketplace/services/my', async (req, res) => {
  // Log to confirm this route is being hit
  console.log('GET /marketplace/services/my endpoint hit');
  
  try {
    // Check authentication - for troubleshooting, let's make this optional
    // Get provider ID either from the user object or from the headers
    const providerId = req.user?.id || req.headers['user-id'] || 'default-provider';
    console.log('Provider ID:', providerId);
    
    // Find all services where the current user is the provider
    // For testing, let's return all services if no provider ID
    let services;
    try {
      if (providerId === 'default-provider') {
        // If no provider ID, just return all services for testing
        services = await findMany('services.json', () => true);
      } else {
        services = await findMany('services.json', service => service.provider === providerId);
      }
      
      console.log(`Found ${services.length} services for provider ${providerId}`);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // If file doesn't exist or other issue, return empty array
      services = [];
    }
    
    // Sort by creation date (descending)
    services.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    // Transform data for the client
    const transformedServices = services.map(service => ({
      id: service.id,
      title: service.title,
      category: service.category,
      categoryName: getCategoryName(service.category),
      description: service.description,
      price: service.price,
      rating: service.averageRating || 0,
      reviewCount: service.reviewCount || 0,
      available: service.available !== false, // Default to true if not specified
      isOwner: true,
      blockchainTransactionId: service.blockchainTransactionId || null,
      blockchainStatus: service.blockchainStatus || 'Pending',
      createdAt: service.createdAt
    }));
    
    console.log(`Returning ${transformedServices.length} services`);
    
    // If no services found, return empty array rather than 404
    res.json(transformedServices);
  } catch (error) {
    console.error('Error in /marketplace/services/my route:', error);
    res.status(500).json({ 
      error: `Failed to fetch your services: ${error.message}`,
      services: [] // Return empty array on error
    });
  }
});

router.get('/marketplace/services/:serviceId/verify', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Find the service in local storage
    const service = await findById('services.json', serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Make sure binaries exist
    if (!binaries) {
      binaries = checkBinaries();
    }
    
    // Call Rust binary to fetch service from blockchain
    try {
      // Fix: Improved input handling
      const tempFilePath = path.join(require('os').tmpdir(), `verify_${serviceId}.txt`);
      await fsPromises.writeFile(tempFilePath, serviceId);
      
      const { stdout, stderr } = await execAsync(`${binaries.serviceVerifyPath} "${tempFilePath}"`);
      
      // Clean up temp file
      await fsPromises.unlink(tempFilePath).catch(e => console.warn('Could not delete temp file:', e));
      
      if (stderr && stderr.trim() !== '') {
        console.log('Output from service verification:', stderr);
      }
      
      // Parse the output
      const outputLines = stdout.trim().split('\n');
      const jsonOutput = outputLines[outputLines.length - 1];
      const blockchainData = JSON.parse(jsonOutput);
      
      // Check if service exists on blockchain
      if (blockchainData.found) {
        // Validate service data matches blockchain
        const isAuthentic = blockchainData.service_id === serviceId &&
                           blockchainData.title === service.title &&
                           blockchainData.provider_id === service.provider;
        
        res.json({
          service: service,
          blockchainVerified: true,
          isAuthentic,
          blockchainTransaction: blockchainData.transaction_id,
          verificationTime: blockchainData.timestamp
        });
      } else {
        res.json({
          service: service,
          blockchainVerified: false,
          warning: "This service is not found on the blockchain and may not be authentic"
        });
      }
    } catch (rustError) {
      console.error('Error verifying service on blockchain:', rustError);
      res.json({
        service: service,
        blockchainVerified: false,
        error: "Could not verify with blockchain at this time"
      });
    }
  } catch (error) {
    console.error('Error verifying service:', error);
    res.status(500).json({ 
      error: `Failed to verify service: ${error.message}`
    });
  }
});



// GET /api/marketplace/services/:serviceId - Get service details
router.get('/marketplace/services/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Fetch service from JSON file
    const service = await findById('services.json', serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Get provider details
    const provider = await findById('users.json', service.provider);
    
    // Get recent ratings for this service
    const allRatings = await findMany('ratings.json', rating => rating.service === serviceId);
    
    // Sort by creation date descending and take the 5 most recent
    const ratings = allRatings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    // Transform ratings to include user names
    const enhancedRatings = await Promise.all(ratings.map(async (rating) => {
      const user = await findById('users.json', rating.user);
      return {
        id: rating.id,
        user: user ? user.name : 'Anonymous',
        rating: rating.rating,
        comment: rating.comment,
        date: rating.createdAt
      };
    }));
    
    // Transform data for the client
    const serviceDetails = {
      id: service.id,
      title: service.title,
      provider: provider ? provider.name : 'Unknown Provider',
      providerCredentials: provider ? provider.credentials : '',
      providerWalletAddress: provider ? provider.walletAddress : '',
      category: service.category,
      categoryName: getCategoryName(service.category),
      description: service.description,
      price: service.price,
      rating: service.averageRating || 0,
      reviewCount: service.reviewCount || 0,
      available: service.available !== false, // Default to true if not specified
      features: service.features || [],
      serviceType: service.serviceType || getCategoryServiceType(service.category),
      duration: service.duration || '60 minutes',
      location: service.location || getCategoryLocation(service.category),
      ratings: enhancedRatings
    };
    
    res.json(serviceDetails);
  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({ 
      error: `Failed to fetch service details: ${error.message}`
    });
  }
});



// Remaining code remains the same...
// POST /api/marketplace/bookings - Book a service
router.post('/marketplace/bookings', async (req, res) => {
  try {
    const { serviceId, appointmentDate, walletAddress: clientWalletAddress } = req.body;
    
    // Get user ID from request
    const userId = req.user?.id || req.headers['user-id'] || 'demo-user';
    
    if (!serviceId || !appointmentDate) {
      return res.status(400).json({ error: 'Service ID and appointment date are required' });
    }
    
    // Validate appointment date is in the future
    const appointmentDateTime = new Date(appointmentDate);
    if (appointmentDateTime < new Date()) {
      return res.status(400).json({ error: 'Appointment date must be in the future' });
    }
    
    // Get service details
    const service = await findById('services.json', serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (service.available === false) {
      return res.status(400).json({ error: 'This service is currently unavailable' });
    }
    
    // Get user information
    const user = await findById('users.json', userId);
    
    // Get or create wallet address
    let userWalletAddress = null;
    
    // Check if we have a wallet address from the client
    if (clientWalletAddress) {
      userWalletAddress = clientWalletAddress;
      
      // If user exists but doesn't have a wallet, update their record
      if (user && !user.walletAddress) {
        user.walletAddress = clientWalletAddress;
        await update('users.json', userId, user);
      }
    } 
    // Otherwise get from user record or create a demo one
    else {
      if (user && user.walletAddress) {
        userWalletAddress = user.walletAddress;
      } else {
        // Create a demo wallet address
        userWalletAddress = generateDemoWalletAddress();
        
        // Update user if they exist
        if (user) {
          user.walletAddress = userWalletAddress;
          await update('users.json', userId, user);
        }
      }
    }
    
    // If still no wallet address, return error
    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User does not have a wallet address configured' });
    }
    
    // Get provider details
    const provider = await findById('users.json', service.provider);
    let providerWalletAddress = provider?.walletAddress;
    
    // If provider doesn't have a wallet, create a demo one
    if (!providerWalletAddress) {
      providerWalletAddress = generateDemoWalletAddress('PROVIDER');
      
      // Update provider if they exist
      if (provider) {
        provider.walletAddress = providerWalletAddress;
        await update('users.json', service.provider, provider);
      }
    }
    
    // Generate a unique booking ID
    const bookingId = uuidv4();
    
    // Create a booking record for IOTA tangle
    const bookingData = {
      booking_id: bookingId,
      service_id: serviceId,
      user_id: userId,
      appointment_date: appointmentDate,
      price: service.price,
      provider_address: 'tst1qr2vvq7u3zczg3fw8zdfgh0pw2dpu8w3px8ccrs2jhwjz580er7lcs9g403',
      status: 'Scheduled',
      timestamp: new Date().toISOString()
    };
    
    // Make sure binaries exist
    if (!binaries) {
      binaries = checkBinaries();
    }
    
    // Fix: Improved JSON handling
    const tempFilePath = path.join(require('os').tmpdir(), `booking_${bookingId}.json`);
    await fsPromises.writeFile(tempFilePath, JSON.stringify(bookingData));
    
    try {
      // Execute the Rust binary to submit to IOTA
      const { stdout, stderr } = await execAsync(`${binaries.submitPath} "${tempFilePath}"`);
      
      // Clean up temp file
      await fsPromises.unlink(tempFilePath).catch(e => console.warn('Could not delete temp file:', e));
      
      if (stderr && stderr.trim() !== '') {
        console.log('Output from Rust submit program:', stderr);
      }
      
      // The Rust program prints the block ID to stdout (last line)
      const outputLines = stdout.trim().split('\n');
      const blockId = outputLines[outputLines.length - 1];
      
      console.log('Booking transaction published to IOTA:', blockId);
      
      // Create booking in file system
      const booking = {
        id: bookingId,
        service: serviceId,
        user: userId,
        userWalletAddress: userWalletAddress,  // Store the wallet address used
        providerWalletAddress: providerWalletAddress, // Store provider wallet
        appointmentDate: appointmentDateTime.toISOString(),
        price: service.price,
        status: 'Scheduled',
        paymentStatus: 'Pending',  // Changed from 'Unpaid' to 'Pending'
        transactionId: blockId,
        blockchainStatus: 'Confirmed',
        createdAt: new Date().toISOString()
      };
      
      await create('bookings.json', booking);
      
      // Return success with booking details and transaction ID
      res.status(201).json({
        success: true,
        bookingId,
        transactionId: blockId,
        providerWalletAddress,  // Include provider wallet for payment
        message: 'Service booked successfully'
      });
    } catch (rustError) {
      console.error('Error executing Rust binary:', rustError);
      
      // Create booking in file system even if IOTA transaction fails
      // We'll retry the blockchain submission later
      const booking = {
        id: bookingId,
        service: serviceId,
        user: userId,
        userWalletAddress: userWalletAddress,
        providerWalletAddress: providerWalletAddress,
        appointmentDate: appointmentDateTime.toISOString(),
        price: service.price,
        status: 'Pending',
        paymentStatus: 'Pending',
        blockchainStatus: 'Failed',
        createdAt: new Date().toISOString()
      };
      
      await create('bookings.json', booking);
      
      // Return a partial success to the client
      res.status(201).json({
        success: true,
        warning: 'Blockchain verification pending',
        bookingId,
        providerWalletAddress,  // Include provider wallet for payment
        message: 'Service booked but blockchain verification is pending. Please check your bookings later.'
      });
    }
  } catch (error) {
    console.error('Error booking service:', error);
    res.status(500).json({ 
      error: `Failed to book service: ${error.message}`
    });
  }
});


function generateDemoWalletAddress(prefix = 'USER') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
  let address = prefix;
  
  // Fill the rest of the address to be 81 characters total
  const remaining = 81 - prefix.length;
  for (let i = 0; i < remaining; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return address;
}

// Remaining routes follow same pattern - update all exec calls to use temp files
// GET /api/marketplace/bookings/my - Get bookings for current user
// POST /api/marketplace/bookings/:bookingId/cancel - Cancel a booking
// POST /api/marketplace/bookings/:bookingId/rate - Rate a completed service
// POST /api/marketplace/payments/process - Process a payment

router.get('/marketplace/bookings/my', async (req, res) => {
  try {
    console.log('GET /marketplace/bookings/my endpoint hit');
    
    // Get user ID from request
    const userId = req.user?.id || req.headers['user-id'];
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        bookings: [] // Return empty array instead of error for better client handling
      });
    }
    
    console.log(`Fetching bookings for user: ${userId}`);
    
    // Query bookings from database
    const userBookings = await findMany('bookings.json', booking => booking.user === userId);
    
    // If no bookings found, return empty array
    if (!userBookings || userBookings.length === 0) {
      console.log(`No bookings found for user ${userId}`);
      return res.json([]);
    }
    
    // Sort by appointment date (descending)
    userBookings.sort((a, b) => {
      const dateA = new Date(a.appointmentDate);
      const dateB = new Date(b.appointmentDate);
      return dateB - dateA;
    });
    
    // Enhance bookings with service details
    const enhancedBookings = await Promise.all(userBookings.map(async (booking) => {
      // Get service details
      const service = await findById('services.json', booking.service);
      
      return {
        id: booking.id,
        serviceId: booking.service,
        serviceTitle: service ? service.title : 'Unknown Service',
        provider: service ? service.provider : 'Unknown Provider',
        appointmentDate: booking.appointmentDate,
        bookingDate: booking.createdAt,
        status: booking.status,
        price: booking.price,
        transactionId: booking.transactionId || 'pending'
      };
    }));
    
    console.log(`Returning ${enhancedBookings.length} bookings`);
    res.json(enhancedBookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    
    // Return error with empty bookings array for better client handling
    res.status(500).json({ 
      error: `Failed to fetch bookings: ${error.message}`,
      bookings: []
    });
  }
});


// Helper functions

// Get human-readable category name
function getCategoryName(category) {
  const categories = {
    'consultations': 'Remote Consultations',
    'homecare': 'Home Care',
    'prenatal': 'Prenatal Services',
    'wellness': 'Wellness',
    'therapy': 'Therapy',
    'diagnostics': 'Diagnostics',
    'support': 'Support Services'
  };
  
  return categories[category] || category;
}

// Get default service type based on category
function getCategoryServiceType(category) {
  const types = {
    'consultations': 'Remote Consultation',
    'homecare': 'In-Home Service',
    'prenatal': 'Prenatal Care',
    'wellness': 'Wellness Session',
    'therapy': 'Therapy Session',
    'diagnostics': 'Diagnostic Service',
    'support': 'Support Service'
  };
  
  return types[category] || 'Healthcare Service';
}

// Get default location based on category
function getCategoryLocation(category) {
  const locations = {
    'consultations': 'Video Call',
    'homecare': 'Your Home',
    'prenatal': 'Provider\'s Clinic',
    'wellness': 'Provider\'s Clinic',
    'therapy': 'Provider\'s Office',
    'diagnostics': 'Diagnostic Center',
    'support': 'Provider\'s Location'
  };
  
  return locations[category] || 'Provider\'s Location';
}

module.exports = router;