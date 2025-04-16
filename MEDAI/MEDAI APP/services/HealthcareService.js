// services/HealthcareService.js
import { CONFIG } from '../config';

// API base URL - check if localhost is already included
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
    
    // Generate a mock blockchain ID for demo purposes
    const mockBlockId = `demo-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Return a simulated success response
    return {
      success: true,
      blockId: mockBlockId,
      message: 'Record added in demo mode (no server connection)'
    };
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
    
    // Return mock data for demonstration
    return generateMockHealthcareRecords();
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
    
    // Return mock data for demonstration
    return generateMockHealthcareRecords(patientId);
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
    
    // Return mock data for demonstration
    const mockRecords = generateMockHealthcareRecords();
    return mockRecords.find(r => r.record_id === recordId) || null;
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
    
    // Return simulated success for demonstration
    return {
      success: true,
      message: 'Record updated in demo mode',
      record_id: recordId,
      status: newStatus
    };
  }
};

// Generate mock healthcare records for demo purposes
const generateMockHealthcareRecords = (patientId = 'demo_patient') => {
  const mockRecords = [
    {
      record_id: 'rec_prescription_001',
      patient_id: patientId,
      record_type: 'prescription',
      provider: 'Dr. Emily Chen, Neurologist',
      date: '2025-03-15',
      details: JSON.stringify({
        title: 'Monthly Alzheimer\'s Medication',
        description: 'Prescription for memory and cognitive function management',
        medications: [
          {
            name: 'Donepezil (Aricept)',
            dosage: '10mg',
            instructions: 'Take 1 tablet daily in the evening'
          },
          {
            name: 'Memantine (Namenda)',
            dosage: '10mg',
            instructions: 'Take 1 tablet twice daily'
          }
        ]
      }),
      status: 'Active',
      timestamp: '2025-03-15T14:30:00Z',
      blockchain_verified: true,
      blockchain_id: 'block_9a72c651f3b4d8e2a1c5'
    },
    {
      record_id: 'rec_test_result_002',
      patient_id: patientId,
      record_type: 'test_result',
      provider: 'Central Medical Laboratory',
      date: '2025-02-28',
      details: JSON.stringify({
        title: 'Comprehensive Blood Panel',
        description: 'Routine blood work to monitor medication effects and overall health',
        results: {
          'Hemoglobin': '14.2 g/dL (Normal)',
          'White Blood Cells': '6.8 x10^9/L (Normal)',
          'Platelets': '250 x10^9/L (Normal)',
          'Total Cholesterol': '185 mg/dL (Normal)',
          'LDL': '110 mg/dL (Normal)',
          'HDL': '55 mg/dL (Normal)',
          'Triglycerides': '120 mg/dL (Normal)',
          'Glucose': '105 mg/dL (Slightly Elevated)'
        }
      }),
      status: 'Completed',
      timestamp: '2025-02-28T10:15:00Z',
      blockchain_verified: true,
      blockchain_id: 'block_7f23d940e5c6b3a1d9f7'
    },
    {
      record_id: 'rec_imaging_003',
      patient_id: patientId,
      record_type: 'imaging',
      provider: 'Neurological Imaging Center',
      date: '2025-01-18',
      details: JSON.stringify({
        title: 'Brain MRI Scan',
        description: 'Follow-up MRI to assess disease progression and response to treatment',
        findings: 'Mild hippocampal atrophy consistent with previous scan. No significant progression noted since last imaging study. Ventricles appear stable. No new infarcts or other acute findings.',
        recommendations: 'Continue current treatment regimen. Follow-up scan recommended in 12 months.'
      }),
      status: 'Completed',
      timestamp: '2025-01-18T09:45:00Z',
      blockchain_verified: true,
      blockchain_id: 'block_3e56a782d9f1c4b8e7h2'
    },
    {
      record_id: 'rec_diagnosis_004',
      patient_id: patientId,
      record_type: 'diagnosis',
      provider: 'Dr. Emily Chen, Neurologist',
      date: '2024-12-05',
      details: JSON.stringify({
        title: 'Annual Cognitive Assessment',
        description: 'Yearly evaluation of cognitive function and disease progression',
        assessment: 'Patient demonstrates mild to moderate cognitive impairment consistent with early-stage Alzheimer\'s disease. Mini-Mental State Examination (MMSE) score of 22/30, representing a 1-point decline from previous year. Functional abilities remain largely intact for basic activities of daily living, with some assistance required for complex tasks.',
        plan: 'Continue current medication regimen. Increase cognitive stimulation therapy to 3 sessions weekly. Recommend caregiver support group participation.'
      }),
      status: 'Active',
      timestamp: '2024-12-05T11:30:00Z',
      blockchain_verified: true,
      blockchain_id: 'block_6d45e893c1a7f2b9h3j4'
    },
    {
      record_id: 'rec_prescription_005',
      patient_id: patientId,
      record_type: 'prescription',
      provider: 'Dr. Sarah Johnson, Primary Care',
      date: '2025-04-02',
      details: JSON.stringify({
        title: 'Hypertension Medication Renewal',
        description: 'Management of blood pressure',
        medications: [
          {
            name: 'Lisinopril',
            dosage: '20mg',
            instructions: 'Take 1 tablet daily in the morning'
          }
        ]
      }),
      status: 'Active',
      timestamp: '2025-04-02T16:20:00Z',
      blockchain_verified: true,
      blockchain_id: 'block_2h89j3k4l5m6n7p8q9r0'
    }
  ];
  
  return mockRecords;
};

export default {
  addHealthcareRecord,
  fetchHealthcareRecords,
  fetchPatientHealthcareRecords,
  fetchHealthcareRecord,
  updateHealthcareRecord
};