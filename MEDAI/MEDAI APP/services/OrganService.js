// services/OrganService.js
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

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

// Publish an organ record via the API
export const publishOrganRecord = async (donorId, organType, status) => {
  try {
    console.log(`Publishing record to ${API_URL}/organ-records`);
    
    const response = await fetch(`${API_URL}/organ-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ donorId, organType, status }),
    });
    
    const data = await handleResponse(response);
    console.log('Transaction published:', data.blockId);
    return data.blockId;
  } catch (error) {
    console.error('Error publishing organ record:', error);
    
    // For demo purposes, generate a mock block ID
    return `mock-block-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
};

// Fetch organ records from the API
export const fetchOrganRecords = async () => {
  try {
    console.log(`Fetching records from ${API_URL}/organ-records`);
    
    const response = await fetch(`${API_URL}/organ-records`);
    
    // For debugging network issues
    const contentType = response.headers.get('content-type');
    console.log('Response content type:', contentType);
    
    const records = await handleResponse(response);
    console.log('Fetched records:', records);
    return records;
  } catch (error) {
    console.error('Error fetching organ records:', error);
    
    // For demo, return mock organ records
    return generateMockOrganRecords();
  }
};

// Register a user as an organ donor
export const registerAsDonor = async (patientId) => {
  try {
    console.log(`Registering donor with ID: ${patientId}`);
    
    // Define the organs that the donor wishes to donate
    const organs = ['heart', 'kidney', 'liver', 'lung', 'cornea'];
    
    // Publish a record for each organ
    const transactions = [];
    for (const organ of organs) {
      const blockId = await publishOrganRecord(patientId, organ, 'available');
      transactions.push({ organ, blockId });
    }
    
    // Return success with donor information
    return {
      success: true,
      donorInfo: {
        id: patientId,
        registrationDate: new Date().toISOString(),
        organs: organs,
        blockchainRecords: transactions
      }
    };
  } catch (error) {
    console.error('Error registering as donor:', error);
    return {
      success: false,
      error: error.message || 'Failed to register as donor'
    };
  }
};

// Fetch donor information
export const getDonorInfo = async (patientId) => {
  try {
    console.log(`Fetching donor info for patient: ${patientId}`);
    
    // In a real app, you would fetch this from the server
    // For demo, we'll check if the patient ID is in our mock data
    
    const mockDonors = [
      {
        id: 'patient_1234567',
        registrationDate: '2024-03-15T09:30:00Z',
        organs: ['heart', 'kidney', 'liver', 'lung', 'cornea'],
        blockchainRecords: [
          { organ: 'heart', blockId: 'block_heart_1234567' },
          { organ: 'kidney', blockId: 'block_kidney_1234567' },
          { organ: 'liver', blockId: 'block_liver_1234567' },
          { organ: 'lung', blockId: 'block_lung_1234567' },
          { organ: 'cornea', blockId: 'block_cornea_1234567' }
        ]
      }
    ];
    
    const donor = mockDonors.find(d => d.id === patientId);
    return donor || null;
  } catch (error) {
    console.error('Error fetching donor info:', error);
    return null;
  }
};

// Check if user has an active donation
export const checkActiveDonation = async (patientId) => {
  try {
    console.log(`Checking active donation for patient: ${patientId}`);
    
    // In a real app, this would check the blockchain
    // For demo, return false
    return false;
  } catch (error) {
    console.error('Error checking active donation:', error);
    return false;
  }
};

// Fetch organ statistics
export const fetchOrganStatistics = async () => {
  try {
    console.log(`Fetching organ statistics from ${API_URL}/organ-statistics`);
    
    // In a real app, you would fetch this from the server
    // For demo, return mock statistics
    return {
      waitingPatients: 106023,
      transplantsDone: 41354,
      registeredDonors: 169384,
      monthlyTransplants: [2350, 2780, 3100, 3580, 4200, 3950],
      organTypeBreakdown: {
        kidney: 84,
        liver: 11,
        heart: 3,
        lung: 2
      }
    };
  } catch (error) {
    console.error('Error fetching organ statistics:', error);
    
    // Return mock data on error
    return {
      waitingPatients: 106000,
      transplantsDone: 41000,
      registeredDonors: 169000,
      monthlyTransplants: [2300, 2700, 3100, 3500, 4200, 3900]
    };
  }
};

// Fetch available organs
export const fetchAvailableOrgans = async () => {
  try {
    console.log(`Fetching available organs from ${API_URL}/available-organs`);
    
    // In a real app, you would fetch this from the server
    // For demo, return mock available organs
    return generateMockAvailableOrgans();
  } catch (error) {
    console.error('Error fetching available organs:', error);
    
    // Return mock data on error
    return generateMockAvailableOrgans();
  }
};

// Fetch user's organ requests
export const fetchUserOrganRequests = async (patientId) => {
  try {
    console.log(`Fetching organ requests for patient: ${patientId}`);
    
    // In a real app, you would fetch this from the server
    // For demo, return mock organ requests
    return generateMockOrganRequests(patientId);
  } catch (error) {
    console.error('Error fetching user organ requests:', error);
    
    // Return mock data on error
    return generateMockOrganRequests(patientId);
  }
};

// Submit an organ request
export const submitOrganRequest = async (patientId, organType, urgency, additionalInfo) => {
  try {
    console.log(`Submitting organ request for patient: ${patientId}, organ: ${organType}`);
    
    // In a real app, you would submit this to the server
    // For demo, create a mock request
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const blockchainId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    const request = {
      id: requestId,
      patientId: patientId,
      organType: organType,
      urgency: urgency || 'medium',
      additionalInfo: additionalInfo || '',
      status: 'pending',
      requestDate: new Date().toISOString(),
      blockchainId: blockchainId
    };
    
    return {
      success: true,
      request: request
    };
  } catch (error) {
    console.error('Error submitting organ request:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to submit organ request'
    };
  }
};

// Generate mock organ records for demo
const generateMockOrganRecords = () => {
  return [
    {
      id: 'record_1',
      donor_id: 'donor_123',
      organ_type: 'kidney',
      status: 'available',
      timestamp: '2024-09-01T12:00:00Z'
    },
    {
      id: 'record_2',
      donor_id: 'donor_456',
      organ_type: 'liver',
      status: 'matched',
      timestamp: '2024-08-15T09:30:00Z'
    },
    {
      id: 'record_3',
      donor_id: 'donor_789',
      organ_type: 'heart',
      status: 'transplanted',
      timestamp: '2024-07-20T14:45:00Z'
    }
  ];
};

// Generate mock available organs for demo
const generateMockAvailableOrgans = () => {
  return [
    {
      id: 'organ_1',
      organType: 'kidney',
      bloodType: 'A+',
      location: 'Memorial Hospital, New York',
      availableSince: '2025-04-14T08:30:00Z',
      preservationHours: 48,
      distance: 12.5,
      transportTime: 22,
      matchScore: 85,
      donorAge: 42,
      bloodTypeCompatible: true,
      tissueTypeScore: 78,
      sizeMatch: true
    },
    {
      id: 'organ_2',
      organType: 'liver',
      bloodType: 'O+',
      location: 'University Medical Center, Boston',
      availableSince: '2025-04-15T10:15:00Z',
      preservationHours: 24,
      distance: 180.2,
      transportTime: 110,
      matchScore: 62,
      donorAge: 36,
      bloodTypeCompatible: true,
      tissueTypeScore: 58,
      sizeMatch: false
    },
    {
      id: 'organ_3',
      organType: 'lung',
      bloodType: 'B+',
      location: 'City General Hospital, Chicago',
      availableSince: '2025-04-15T14:45:00Z',
      preservationHours: 12,
      distance: 290.8,
      transportTime: 180,
      matchScore: 71,
      donorAge: 29,
      bloodTypeCompatible: true,
      tissueTypeScore: 65,
      sizeMatch: true
    },
    {
      id: 'organ_4',
      organType: 'kidney',
      bloodType: 'O-',
      location: 'Riverside Medical Center, Los Angeles',
      availableSince: '2025-04-14T18:20:00Z',
      preservationHours: 36,
      distance: 420.5,
      transportTime: 240,
      matchScore: 91,
      donorAge: 31,
      bloodTypeCompatible: true,
      tissueTypeScore: 88,
      sizeMatch: true
    },
    {
      id: 'organ_5',
      organType: 'cornea',
      bloodType: 'Any',
      location: 'Eye Institute, Philadelphia',
      availableSince: '2025-04-13T09:10:00Z',
      preservationHours: 96,
      distance: 90.3,
      transportTime: 65,
      matchScore: 95,
      donorAge: 27,
      bloodTypeCompatible: true,
      tissueTypeScore: 92,
      sizeMatch: true
    }
  ];
};

// Generate mock organ requests for demo
const generateMockOrganRequests = (patientId) => {
  // For some patient IDs, return an empty array to simulate no requests
  if (patientId.includes('new') || Math.random() < 0.3) {
    return [];
  }
  
  return [
    {
      id: 'request_1',
      patientId: patientId,
      organType: 'kidney',
      urgency: 'high',
      status: 'pending',
      requestDate: '2025-03-20T15:30:00Z',
      additionalInfo: 'Patient is diabetic and has been on dialysis for 3 years',
      blockchainId: 'block_request_1'
    },
    {
      id: 'request_2',
      patientId: patientId,
      organType: 'liver',
      urgency: 'medium',
      status: 'matched',
      requestDate: '2025-02-10T09:45:00Z',
      matchDate: '2025-04-05T11:20:00Z',
      additionalInfo: '',
      blockchainId: 'block_request_2'
    }
  ];
};

export default {
  publishOrganRecord,
  fetchOrganRecords,
  registerAsDonor,
  getDonorInfo,
  checkActiveDonation,
  fetchOrganStatistics,
  fetchAvailableOrgans,
  fetchUserOrganRequests,
  submitOrganRequest
};