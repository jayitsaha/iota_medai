import { CONFIG } from '../config';

// OrganRecord structure matching the backend
export class OrganRecord {
  constructor(donorId, organType, status) {
    this.donor_id = donorId;
    this.organ_type = organType;
    this.status = status;
  }
}

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
    console.log('Data:', { donorId, organType, status });
    
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
    throw error;
  }
};

// Fetch organ records from the API
export const fetchOrganRecords = async () => {
  try {
    console.log(`Fetching records from ${API_URL}/organ-records`);
    
    const response = await fetch(`${API_URL}/organ-records`);
    
    // For debugging network issues
    console.log('Response status:', response.status);
    const contentType = response.headers.get('content-type');
    console.log('Content type:', contentType);
    
    const records = await handleResponse(response);
    console.log('Fetched records:', records);
    return records;
  } catch (error) {
    console.error('Error fetching organ records:', error);
    
    // Return empty records instead of throwing error to make the app more resilient
    console.log('Returning empty records array due to error');
    return [];
  }
};