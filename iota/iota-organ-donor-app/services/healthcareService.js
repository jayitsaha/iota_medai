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

// Add a new healthcare record
export const addHealthcareRecord = async (patientId, recordType, provider, date, details) => {
  try {
    console.log(`Adding healthcare record to ${API_URL}/healthcare-records`);
    
    const response = await fetch(`${API_URL}/healthcare-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        patientId, 
        recordType, 
        provider, 
        date, 
        details 
      }),
    });
    
    const data = await handleResponse(response);
    console.log('Healthcare record published:', data.blockId);
    return data;
  } catch (error) {
    console.error('Error publishing healthcare record:', error);
    throw error;
  }
};

// Fetch all healthcare records
export const fetchHealthcareRecords = async () => {
  try {
    console.log(`Fetching healthcare records from ${API_URL}/healthcare-records`);
    
    const response = await fetch(`${API_URL}/healthcare-records`);
    
    // For debugging network issues
    console.log('Response status:', response.status);
    
    const records = await handleResponse(response);
    console.log(`Fetched ${records.length} healthcare records`);
    return records;
  } catch (error) {
    console.error('Error fetching healthcare records:', error);
    
    // Return empty records instead of throwing error to make the app more resilient
    console.log('Returning empty records array due to error');
    return [];
  }
};

// Fetch healthcare records for a specific patient
export const fetchPatientHealthcareRecords = async (patientId) => {
  try {
    console.log(`Fetching healthcare records for patient ${patientId}`);
    
    const response = await fetch(`${API_URL}/healthcare-records/patient/${patientId}`);
    
    const records = await handleResponse(response);
    console.log(`Fetched ${records.length} records for patient ${patientId}`);
    return records;
  } catch (error) {
    console.error('Error fetching patient healthcare records:', error);
    return [];
  }
};

// Fetch a specific healthcare record
export const fetchHealthcareRecord = async (recordId) => {
  try {
    console.log(`Fetching healthcare record ${recordId}`);
    
    const response = await fetch(`${API_URL}/healthcare-records/${recordId}`);
    
    if (response.status === 404) {
      return null;
    }
    
    const record = await handleResponse(response);
    return record;
  } catch (error) {
    console.error('Error fetching healthcare record:', error);
    throw error;
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
    
    const response = await fetch(`${API_URL}/healthcare-records/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    const result = await handleResponse(response);
    return result;
  } catch (error) {
    console.error('Error updating healthcare record:', error);
    throw error;
  }
};