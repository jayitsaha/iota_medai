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
const API_URL = CONFIG.API_URL || 'http://localhost:5000/api';

// Publish an organ record via the API
export const publishOrganRecord = async (donorId, organType, status) => {
  try {
    const response = await fetch(`${API_URL}/organ-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ donorId, organType, status }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to publish record');
    }
    
    const data = await response.json();
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
    const response = await fetch(`${API_URL}/organ-records`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch records');
    }
    
    const records = await response.json();
    return records;
  } catch (error) {
    console.error('Error fetching organ records:', error);
    throw error;
  }
};