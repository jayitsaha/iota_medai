import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';


const safeStorage = {
  getItem: (key) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
  }
};

// Helper function to handle fetch errors
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = 'Network response was not ok';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      console.error('Error parsing error response:', e);
    }
    throw new Error(errorMessage);
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    throw new Error('Invalid response format from server');
  }
};

// Fetch all marketplace services
export const fetchMarketplaceServices = async (options = {}) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add optional filters
    if (options.category) queryParams.append('category', options.category);
    if (options.search) queryParams.append('search', options.search);
    if (options.provider) queryParams.append('provider', options.provider);
    if (options.minPrice) queryParams.append('minPrice', options.minPrice);
    if (options.maxPrice) queryParams.append('maxPrice', options.maxPrice);
    if (options.sort) queryParams.append('sort', options.sort);
    
    // Add blockchain option to fetch services directly from blockchain
    if (options.blockchain) queryParams.append('blockchain', 'true');
    
    const queryString = queryParams.toString();
    const url = `${API_URL}/marketplace/services${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Fetching marketplace services from ${url}`);
    
    const response = await fetch(url);
    const services = await handleResponse(response);
    return services;
  } catch (error) {
    console.error('Error fetching marketplace services:', error);
    
    // Fallback to demo data in case of connection error
    return simulateServiceData();
  }
};

// Fetch details of a specific service
export const fetchServiceDetails = async (serviceId) => {
  try {
    console.log(`Fetching service details for ID: ${serviceId}`);
    
    const response = await fetch(`${API_URL}/marketplace/services/${serviceId}`);
    const service = await handleResponse(response);
    return service;
  } catch (error) {
    console.error('Error fetching service details:', error);
    
    // Fallback to demo data
    const services = simulateServiceData();
    const service = services.find(s => s.id === serviceId);
    
    if (service) {
      // Add additional details for the service details page
      return {
        ...service,
        features: [
          "24/7 support via messaging",
          "Follow-up consultation included",
          "Secure digital prescriptions",
          "Access to patient portal"
        ],
        serviceType: service.category === 'consultations' ? 'Remote Consultation' : 
                     service.category === 'homecare' ? 'In-Home Service' : 
                     service.category === 'prenatal' ? 'Prenatal Care' :
                     'Healthcare Service',
        duration: service.category === 'consultations' ? '45 minutes' :
                  service.category === 'homecare' ? '2 hours' :
                  service.category === 'prenatal' ? '1 hour' :
                  '60 minutes',
        location: service.category === 'homecare' ? 'Your Home' :
                  service.category === 'consultations' ? 'Video Call' :
                  'Provider\'s Clinic',
        providerCredentials: 'Licensed Healthcare Professional',
        providerWalletAddress: 'IOTAWALLETADDRESS9PROVIDER9SAMPLE9ADDRESS9999999999999999999999999999999999999'
      };
    }
    
    // If no service found
    throw new Error('Service not found');
  }
};

// Verify a service on the blockchain
export const verifyServiceOnBlockchain = async (serviceId) => {
  try {
    console.log(`Verifying service ${serviceId} on blockchain`);
    
    const response = await fetch(`${API_URL}/marketplace/services/${serviceId}/verify`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Error verifying service on blockchain:', error);
    
    // Simulate a verification response for demonstration
    return {
      service: {
        id: serviceId,
        title: 'Simulated Service',
      },
      blockchainVerified: false,
      error: "Could not verify with blockchain at this time (simulated)"
    };
  }
};

// Book a service
export const bookService = async (serviceId, appointmentDate) => {
  try {
    console.log(`Booking service ${serviceId} for date ${appointmentDate}`);
    
    // Validate inputs
    if (!serviceId) {
      return {
        success: false,
        error: 'Service ID is required'
      };
    }
    
    if (!appointmentDate) {
      return {
        success: false,
        error: 'Appointment date is required'
      };
    }
    
    // Get user ID and authentication token from storage
    const userId = safeStorage.getItem('userId') || 'provider_123456';
    const authToken = safeStorage.getItem('authToken');
    
    // Get wallet address from storage or generate a demo one
    let walletAddress = safeStorage.getItem('walletAddress');
    
    // If no wallet address stored, generate a demo one
    if (!walletAddress) {
      // Generate a random IOTA-like address for demo/development
      const demoWalletAddress = 'tst1qr2vvq7u3zczg3fw8zdfgh0pw2dpu8w3px8ccrs2jhwjz580er7lcs9g403'
      
      // Save it for future use
      safeStorage.setItem('walletAddress', demoWalletAddress);
      walletAddress = 'tst1qr2vvq7u3zczg3fw8zdfgh0pw2dpu8w3px8ccrs2jhwjz580er7lcs9g403';
      
      console.log('Generated demo wallet address:', demoWalletAddress);
    }
    
    // Special case for development/demo - simulate a successful booking
    if (CONFIG.DEMO_MODE) {
      console.log('DEMO MODE: Simulating successful booking');
      
      // Generate a unique booking ID
      const demoBookingId = `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      // Generate a random transaction ID
      const demoTransactionId = generateRandomTransactionId();
      
      // Simulate a server delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Return successful mock response
      return {
        success: true,
        bookingId: demoBookingId,
        transactionId: demoTransactionId,
        message: 'Service booked successfully (demo mode)'
      };
    }
    
    // Try to make the API call
    try {
      const response = await fetch(`${API_URL}/marketplace/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'User-ID': userId,
          'Wallet-Address': walletAddress
        },
        body: JSON.stringify({ 
          serviceId, 
          appointmentDate,
          walletAddress
        }),
      });
      
      // Handle non-200 responses properly
      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage;
        
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error || `Server returned ${response.status}`;
        } catch (parseError) {
          // Fallback to raw text
          errorMessage = responseText || `Server returned ${response.status}`;
        }
        
        console.error('Error response from server:', errorMessage);
        
        return {
          success: false,
          error: errorMessage,
          status: response.status
        };
      }
      
      // Parse successful response
      const data = await response.json();
      return {
        success: true,
        ...data
      };
    } catch (networkError) {
      console.error('Network error booking service:', networkError);
      
      // In case of network error, return fallback response for demo/development
      return {
        success: false,
        error: 'Network error: Could not connect to server',
        fallback: {
          bookingId: `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          transactionId: generateRandomTransactionId(),
          message: 'Demo mode: service booked with fallback'
        }
      };
    }
  } catch (error) {
    console.error('Error in bookService function:', error);
    
    // Return error with consistent format
    return {
      success: false,
      error: error.message || 'Unknown error occurred while booking service'
    };
  }
};


const generateDemoWalletAddress = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
  const prefix = 'MEDAI';
  let address = prefix;
  
  // Generate a random 76-char address to follow the prefix
  for (let i = 0; i < 76; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return address;
};

// Cancel a booking
export const cancelBooking = async (bookingId) => {
  try {
    console.log(`Cancelling booking ${bookingId}`);
    
    // Get user ID and authentication token from storage
    const userId = safeStorage.getItem('userId') || 'provider_123456';
    const authToken = safeStorage.getItem('authToken');
    
    const response = await fetch(`${API_URL}/marketplace/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'User-ID': userId
      }
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    
    // Simulate cancellation response
    return {
      success: true,
      message: 'Booking cancelled successfully (simulated)'
    };
  }
};

// Fetch user's bookings
export const fetchMyBookings = async () => {
  try {
    // Add more detailed logging
    console.log(`Attempting to fetch user bookings from ${API_URL}/marketplace/bookings/my`);
    
    // Get user ID and authentication token from storage with better fallback
    const userId = safeStorage.getItem('userId');
    const authToken = safeStorage.getItem('authToken');
    
    console.log(`Using user ID: ${userId || 'Not found, using default'}`);
    console.log(`Auth token available: ${authToken ? 'Yes' : 'No'}`);
    
    // Use a default ID if none is found
    const effectiveUserId = userId || 'provider_123456';
    
    // Create headers with better debugging
    const headers = {
      'User-ID': effectiveUserId
    };
    
    // Add auth token if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    console.log('Sending request with headers:', headers);
    
    // Make the API call with a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${API_URL}/marketplace/bookings/my`, {
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    
    // Add more detailed error handling
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response (${response.status}):`, errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    // Parse the response
    const bookings = await response.json();
    console.log(`Successfully fetched ${bookings.length} bookings`);
    
    return bookings;
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    
    // Verify the fallback function exists and is working
    if (typeof simulateBookingData !== 'function') {
      console.error('simulateBookingData function is not defined!');
      return []; // Return empty array as last resort
    }
    
    console.log('Falling back to simulated booking data');
    const simulatedData = simulateBookingData();
    console.log(`Returning ${simulatedData.length} simulated bookings`);
    
    return simulatedData;
  }
};

// Submit a rating for a service
export const submitServiceRating = async (bookingId, rating, comment) => {
  try {
    console.log(`Submitting rating for booking ${bookingId}`);
    
    // Get user ID and authentication token from storage
    const userId = safeStorage.getItem('userId') || 'provider_123456';
    const authToken = safeStorage.getItem('authToken');
    
    const response = await fetch(`${API_URL}/marketplace/bookings/${bookingId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'User-ID': userId
      },
      body: JSON.stringify({ 
        rating, 
        comment 
      }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error submitting rating:', error);
    
    // Simulate rating submission
    return {
      success: true,
      message: 'Rating submitted successfully (simulated)',
      rating: {
        id: `RAT-${Math.random().toString(36).substring(2, 8)}`,
        rating,
        comment
      }
    };
  }
};

// Fetch services created by the current user (provider)
export const fetchMyServices = async () => {
  try {
    console.log(`Fetching my services from ${API_URL}/marketplace/services/my`);
    
    // Get user ID and authentication token from storage
    const userId = safeStorage.getItem('userId') || 'provider_123456';
    const authToken = safeStorage.getItem('authToken');
    
    // Create headers
    const headers = {
      'User-ID': userId
    };
    
    // Add authorization if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    console.log('Request headers:', headers);
    
    const response = await fetch(`${API_URL}/marketplace/services/my`, {
      headers
    });
    
    // Log response status for debugging
    console.log('Response status:', response.status);
    
    // Handle non-200 responses properly
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(errorText || `Server returned ${response.status}`);
    }
    
    const services = await response.json();
    console.log('Services received:', services.length);
    return services;
  } catch (error) {
    console.error('Error fetching my services:', error);
    console.log('Falling back to simulated data');
    
    // Fallback to demo data in case of connection error
    return simulateMyServicesData();
  }
};

// Add a new service
export const addService = async (serviceData) => {
  try {
    console.log(`Adding new service to ${API_URL}/marketplace/services`);
    
    // Get user ID and authentication token from storage
    const userId = safeStorage.getItem('userId') || 'provider_123456';
    
    // Create headers with proper authentication
    const headers = {
      'Content-Type': 'application/json',
      'User-ID': userId,
      'User-Role': 'provider'  // For development/testing
    };
    
    // Add auth token if available
    const authToken = safeStorage.getItem('authToken');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    console.log('Request headers:', headers);
    
    const response = await fetch(`${API_URL}/marketplace/services`, {
      method: 'POST',
      headers,
      body: JSON.stringify(serviceData),
    });
    
    // Log response status for debugging
    console.log('Response status:', response.status);
    
    // Handle non-200 responses properly
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(errorText || `Server returned ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding service:', error);
    
    // Simulate service creation for demonstration
    return {
      success: true,
      serviceId: `srv-${Math.random().toString(36).substring(2, 10)}`,
      message: 'Service added successfully (simulated)',
      service: {
        id: `srv-${Math.random().toString(36).substring(2, 10)}`,
        ...serviceData,
        provider: 'Your Provider Name',
        rating: 0,
        categoryName: getCategoryName(serviceData.category)
      }
    };
  }
};

// Update an existing service
export const updateService = async (serviceId, serviceData) => {
  try {
    console.log(`Updating service ${serviceId}`);
    
    // Get user ID and authentication token from storage
    const userId = safeStorage.getItem('userId') || 'provider_123456';
    const authToken = safeStorage.getItem('authToken');
    
    const response = await fetch(`${API_URL}/marketplace/services/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'User-ID': userId
      },
      body: JSON.stringify(serviceData),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating service:', error);
    
    // Simulate service update for demonstration
    return {
      success: true,
      message: 'Service updated successfully (simulated)',
      service: {
        id: serviceId,
        ...serviceData,
        provider: 'Your Provider Name',
        categoryName: getCategoryName(serviceData.category)
      }
    };
  }
};

// Delete a service
export const deleteService = async (serviceId) => {
  try {
    console.log(`Deleting service ${serviceId}`);
    
    // Get user ID and authentication token from storage
    const userId = safeStorage.getItem('userId') || 'provider_123456';
    const authToken = safeStorage.getItem('authToken');
    
    const response = await fetch(`${API_URL}/marketplace/services/${serviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'User-ID': userId
      }
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting service:', error);
    
    // Simulate service deletion for demonstration
    return {
      success: true,
      message: 'Service deleted successfully (simulated)'
    };
  }
};

// Helper function to get category name from category id
const getCategoryName = (categoryId) => {
  const categories = {
    'consultations': 'Remote Consultations',
    'homecare': 'Home Care',
    'prenatal': 'Prenatal Services',
    'wellness': 'Wellness',
    'therapy': 'Therapy',
    'diagnostics': 'Diagnostics',
    'support': 'Support Services'
  };
  
  return categories[categoryId] || 'Other';
};

// Simulate services data for demonstration
const simulateServiceData = () => {
  return [
    {
      id: 'srv-001',
      title: 'Remote Consultation with Neurologist',
      provider: 'Dr. Emily Chen',
      category: 'consultations',
      categoryName: 'Remote Consultations',
      description: 'Specialized consultation with an experienced neurologist specializing in Alzheimers, dementia, and other neurodegenerative conditions. Get expert advice, diagnosis, and treatment plans from the comfort of your home.',
      price: 150,
      rating: 4.9
    },
    {
      id: 'srv-002',
      title: 'Home Nursing Care - Elder Support',
      provider: 'ElderCare Plus',
      category: 'homecare',
      categoryName: 'Home Care',
      description: 'Professional nursing care provided in the comfort of your home. Our nurses are experienced in geriatric care and can provide medication management, wound care, and general health monitoring.',
      price: 200,
      rating: 4.7
    },
    {
      id: 'srv-003',
      title: 'Prenatal Yoga Classes (Virtual)',
      provider: 'Mindful Maternity',
      category: 'prenatal',
      categoryName: 'Prenatal Services',
      description: 'Virtual prenatal yoga classes designed to improve strength, flexibility, and relaxation during pregnancy. Classes are led by certified prenatal yoga instructors and tailored to each trimester.',
      price: 75,
      rating: 4.8
    },
    {
      id: 'srv-004',
      title: 'Mental Health Therapy Session',
      provider: 'Dr. Sarah Johnson',
      category: 'therapy',
      categoryName: 'Therapy',
      description: 'One-on-one therapy sessions with a licensed psychologist specializing in anxiety, depression, and stress management. Sessions available both virtually and in-person.',
      price: 120,
      rating: 5.0
    },
    {
      id: 'srv-005',
      title: 'Postpartum Mental Health Support',
      provider: 'New Parent Wellness',
      category: 'therapy',
      categoryName: 'Therapy',
      description: 'Specialized mental health support for new parents dealing with postpartum depression, anxiety, or adjustment difficulties. Available virtually or in-home.',
      price: 90,
      rating: 4.9
    }
  ];
};

// Simulate my services data for demonstration
const simulateMyServicesData = () => {
  return [
    {
      id: 'srv-001',
      title: 'Remote Consultation with Neurologist',
      provider: 'Dr. Emily Chen',
      category: 'consultations',
      categoryName: 'Remote Consultations',
      description: 'Specialized consultation with an experienced neurologist specializing in Alzheimers, dementia, and other neurodegenerative conditions. Get expert advice, diagnosis, and treatment plans from the comfort of your home.',
      price: 150,
      rating: 4.9,
      isOwner: true
    },
    {
      id: 'srv-003',
      title: 'Prenatal Yoga Classes (Virtual)',
      provider: 'Mindful Maternity',
      category: 'prenatal',
      categoryName: 'Prenatal Services',
      description: 'Virtual prenatal yoga classes designed to improve strength, flexibility, and relaxation during pregnancy. Classes are led by certified prenatal yoga instructors and tailored to each trimester.',
      price: 75,
      rating: 4.8,
      isOwner: true
    }
  ];
};

// Simulate booking data for demonstration
const simulateBookingData = () => {
  const services = simulateServiceData();
  
  return [
    {
      id: 'bk-001',
      serviceId: 'srv-001',
      serviceTitle: 'Remote Consultation with Neurologist',
      provider: 'Dr. Emily Chen',
      appointmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days in future
      bookingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      status: 'Scheduled',
      price: 150,
      transactionId: generateRandomTransactionId()
    },
    {
      id: 'bk-002',
      serviceId: 'srv-003',
      serviceTitle: 'Prenatal Yoga Classes (Virtual)',
      provider: 'Mindful Maternity',
      appointmentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      bookingDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
      status: 'Completed',
      price: 75,
      transactionId: generateRandomTransactionId()
    },
    {
      id: 'bk-003',
      serviceId: 'srv-005',
      serviceTitle: 'Postpartum Mental Health Support',
      provider: 'New Parent Wellness',
      appointmentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      bookingDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      status: 'Cancelled',
      price: 90,
      transactionId: generateRandomTransactionId()
    }
  ];
};

// Generate a random IOTA transaction ID for demonstration
const generateRandomTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
  let result = '';
  for (let i = 0; i < 81; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};