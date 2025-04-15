import { CONFIG } from '../config';

// MedicineRecord structure matching the backend
export class MedicineRecord {
  constructor(serialNumber, name, manufacturer, batchNumber, productionDate, expirationDate) {
    this.serialNumber = serialNumber;
    this.name = name;
    this.manufacturer = manufacturer;
    this.batchNumber = batchNumber;
    this.productionDate = productionDate;
    this.expirationDate = expirationDate;
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

// Register a new medicine via the API
export const registerMedicine = async (serialNumber, name, manufacturer, batchNumber, productionDate, expirationDate) => {
  try {
    console.log(`Registering medicine to ${API_URL}/medicines`);
    
    const response = await fetch(`${API_URL}/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        serialNumber, 
        name, 
        manufacturer, 
        batchNumber, 
        productionDate, 
        expirationDate 
      }),
    });
    
    const data = await handleResponse(response);
    console.log('Medicine registered:', data.blockId);
    return data.blockId;
  } catch (error) {
    console.error('Error registering medicine:', error);
    throw error;
  }
};

// Verify a medicine by serial number
export const verifyMedicine = async (serialNumber) => {
  try {
    console.log(`Verifying medicine with serial number: ${serialNumber}`);
    
    const response = await fetch(`${API_URL}/medicines/${serialNumber}`);
    
    // Handle 404 (medicine not found) separately
    if (response.status === 404) {
      return { 
        verified: false, 
        error: 'Medicine not found in the blockchain registry'
      };
    }
    
    const data = await handleResponse(response);
    
    // Check medicine status
    if (data) {
      if (data.status === 'recalled') {
        return {
          verified: false,
          error: 'This medicine has been recalled',
          data
        };
      }
      
      if (data.status === 'activated') {
        return {
          verified: true,
          alreadyActivated: true,
          activationTime: data.activation_timestamp,
          data
        };
      }
      
      return {
        verified: true,
        alreadyActivated: false,
        data
      };
    }
    
    return { 
      verified: false, 
      error: 'Unable to verify this medicine'
    };
  } catch (error) {
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
    
    const response = await fetch(`${API_URL}/medicines/${serialNumber}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await handleResponse(response);
    
    if (data.error) {
      return {
        success: false,
        error: data.error
      };
    }
    
    return {
      success: true,
      medicine: data.medicine,
      blockId: data.blockId
    };
  } catch (error) {
    console.error('Error activating medicine:', error);
    return { 
      success: false, 
      error: error.message || 'Error activating medicine'
    };
  }
};

// Fetch all medicines from the API
export const fetchAllMedicines = async () => {
  try {
    console.log(`Fetching medicines from ${API_URL}/medicines`);
    
    const response = await fetch(`${API_URL}/medicines`);
    
    // For debugging network issues
    console.log('Response status:', response.status);
    
    const medicines = await handleResponse(response);
    console.log('Fetched medicines:', medicines);
    return medicines;
  } catch (error) {
    console.error('Error fetching medicines:', error);
    
    // Return empty records instead of throwing error to make the app more resilient
    console.log('Returning empty medicines array due to error');
    return [];
  }
};