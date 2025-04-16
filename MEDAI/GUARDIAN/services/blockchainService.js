import axios from 'axios';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG?.API_URL || 'http://localhost:3000/api';

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

// Helper function to handle axios errors
const handleAxiosResponse = (response) => {
  return response.data;
};

const handleAxiosError = (error) => {
  console.error('API Error:', error);
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('Error data:', error.response.data);
    console.error('Error status:', error.response.status);
    throw new Error(error.response.data.error || 'API Error');
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received:', error.request);
    throw new Error('No response from server');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Request error:', error.message);
    throw new Error('Request error: ' + error.message);
  }
};

// HEALTHCARE RECORDS API

// Add a new healthcare record
export const addHealthcareRecord = async (patientId, recordType, provider, date, details) => {
  try {
    console.log(`Adding healthcare record to ${API_URL}/healthcare-records`);
    
    const response = await axios.post(`${API_URL}/healthcare-records`, {
      patientId, 
      recordType, 
      provider, 
      date, 
      details 
    });
    
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error);
  }
};

// Fetch all healthcare records
export const fetchHealthcareRecords = async () => {
  try {
    console.log(`Fetching healthcare records from ${API_URL}/healthcare-records`);
    
    const response = await axios.get(`${API_URL}/healthcare-records`);
    return handleAxiosResponse(response);
  } catch (error) {
    console.error('Error fetching healthcare records:', error);
    // Return empty records instead of throwing error to make the app more resilient
    return [];
  }
};

// Fetch healthcare records for a specific patient
export const fetchPatientHealthcareRecords = async (patientId) => {
  try {
    console.log(`Fetching healthcare records for patient ${patientId}`);
    
    const response = await axios.get(`${API_URL}/healthcare-records/patient/${patientId}`);
    return handleAxiosResponse(response);
  } catch (error) {
    console.error('Error fetching patient healthcare records:', error);
    return [];
  }
};

// Fetch a specific healthcare record
export const fetchHealthcareRecord = async (recordId) => {
  try {
    console.log(`Fetching healthcare record ${recordId}`);
    
    const response = await axios.get(`${API_URL}/healthcare-records/${recordId}`);
    return handleAxiosResponse(response);
  } catch (error) {
    console.error('Error fetching healthcare record:', error);
    return null;
  }
};

// Update a healthcare record's status
export const updateHealthcareRecord = async (recordId, newStatus, updatedDetails = null) => {
  try {
    console.log(`Updating healthcare record ${recordId} to status ${newStatus}`);
    
    const updateData = { status: newStatus };
    
    // Add details if provided
    if (updatedDetails) {
      updateData.details = updatedDetails;
    }
    
    const response = await axios.put(`${API_URL}/healthcare-records/${recordId}`, updateData);
    return handleAxiosResponse(response);
  } catch (error) {
    return handleAxiosError(error);
  }
};

// MEDICINE AUTHENTICATION API

// Register a new medicine
export const registerMedicine = async (serialNumber, name, manufacturer, batchNumber, productionDate, expirationDate) => {
  try {
    console.log(`Registering medicine to ${API_URL}/medicines`);
    
    const response = await axios.post(`${API_URL}/medicines`, {
      serialNumber, 
      name, 
      manufacturer, 
      batchNumber, 
      productionDate, 
      expirationDate 
    });
    
    return response.data.blockId;
  } catch (error) {
    return handleAxiosError(error);
  }
};

// Fetch all medicines
export const fetchAllMedicines = async () => {
  try {
    console.log(`Fetching medicines from ${API_URL}/medicines`);
    
    const response = await axios.get(`${API_URL}/medicines`);
    return handleAxiosResponse(response);
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return [];
  }
};

// Verify a medicine by serial number
export const verifyMedicine = async (serialNumber) => {
  try {
    console.log(`Verifying medicine with serial number: ${serialNumber}`);
    
    const response = await axios.get(`${API_URL}/medicines/${serialNumber}`);
    
    // Check medicine status
    if (response.data) {
      if (response.data.status === 'recalled') {
        return {
          verified: true,
          recalled: true,
          data: response.data
        };
      }
      
      if (response.data.status === 'activated') {
        return {
          verified: true,
          alreadyActivated: true,
          activationTime: response.data.activation_timestamp,
          data: response.data
        };
      }
      
      return {
        verified: true,
        alreadyActivated: false,
        data: response.data
      };
    }
    
    return { 
      verified: false, 
      error: 'Unable to verify this medicine'
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { 
        verified: false, 
        error: 'Medicine not found in the blockchain registry'
      };
    }
    
    console.error('Error verifying medicine:', error);
    return { 
      verified: false, 
      error: error.message || 'Error verifying medicine'
    };
  }
};

// Activate a medicine
export const activateMedicine = async (serialNumber) => {
  try {
    console.log(`Activating medicine with serial number: ${serialNumber}`);
    
    const response = await axios.post(`${API_URL}/medicines/${serialNumber}/activate`);
    return handleAxiosResponse(response);
  } catch (error) {
    console.error('Error activating medicine:', error);
    return { 
      success: false, 
      error: error.message || 'Error activating medicine'
    };
  }
};

// ORGAN DONOR API

// Create a new organ donor record
export const publishOrganRecord = async (donorId, organType, status) => {
  try {
    console.log(`Creating new organ record for donor: ${donorId}`);
    
    const response = await axios.post(`${API_URL}/organ-records`, {
      donorId,
      organType,
      status
    });
    
    return response.data.blockId;
  } catch (error) {
    return handleAxiosError(error);
  }
};

// Fetch all organ donor records
export const fetchOrganRecords = async () => {
  try {
    console.log(`Fetching organ records from ${API_URL}/organ-records`);
    
    const response = await axios.get(`${API_URL}/organ-records`);
    return handleAxiosResponse(response);
  } catch (error) {
    console.error('Error fetching organ records:', error);
    return [];
  }
};

// Additional utility functions for the blockchain integration

// Check if blockchain is operational
export const checkBlockchainStatus = async () => {
  try {
    const response = await axios.get(`${API_URL}/`);
    return {
      operational: true,
      message: response.data.message,
      endpoints: response.data.endpoints
    };
  } catch (error) {
    console.error('Error checking blockchain status:', error);
    return {
      operational: false,
      message: 'Blockchain service is not available',
      error: error.message
    };
  }
};