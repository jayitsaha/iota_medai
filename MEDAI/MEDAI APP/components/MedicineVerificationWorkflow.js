// src/components/MedicineVerificationWorkflow.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import services
import MedicineService from '../services/MedicineService';
import HealthcareService from '../services/HealthcareService';

// Create context for medicine verification
const MedicineVerificationContext = createContext();

export const MedicineVerificationProvider = ({ children }) => {
  const [scannedMedicine, setScannedMedicine] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  
  // Load prescriptions on mount
  useEffect(() => {
    loadPrescriptions();
  }, []);
  
  // Load prescriptions from healthcare records
  const loadPrescriptions = async () => {
    try {
      const patientId = await AsyncStorage.getItem('user_id');
      if (patientId) {
        const records = await HealthcareService.fetchPatientHealthcareRecords(patientId);
        // Filter for prescription records
        const prescriptionRecords = records.filter(record => record.record_type === 'prescription');
        setPrescriptions(prescriptionRecords);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };
  
  // Add a scanned medicine to the user's list without verification
  const addScannedMedicineToList = async (medicineData) => {
    try {
      // Get existing medications
      const medicinesJson = await AsyncStorage.getItem('medicines');
      let medicines = medicinesJson ? JSON.parse(medicinesJson) : [];
      
      // Check if this medicine exists or should be added
      const existingIndex = medicines.findIndex(med => 
        med.name.toLowerCase() === medicineData.name.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update existing medicine
        medicines[existingIndex] = {
          ...medicines[existingIndex],
          // Update relevant fields from the scanned medicine
          imageUri: medicineData.imageUri || medicines[existingIndex].imageUri,
          description: medicineData.description || medicines[existingIndex].description,
          expiryDate: medicineData.expiryDate || medicines[existingIndex].expiryDate,
          lastRefill: new Date().toISOString().split('T')[0],
          // Keep verification status as is
          blockchain_verified: medicines[existingIndex].blockchain_verified || false
        };
      } else {
        // Check if it matches a prescription
        const { matched, prescription } = checkPrescriptionMatch(medicineData.name);
        
        // Generate new medicine object
        const newMedicine = {
          id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: medicineData.name,
          dosage: medicineData.dosage || '10mg',
          frequency: medicineData.frequency || 'Once daily',
          quantity: medicineData.pillCount || 30,
          pillsPerDay: medicineData.pillsPerDay || 1,
          remainingPills: medicineData.pillCount || 30,
          startDate: new Date().toISOString().split('T')[0],
          lastRefill: new Date().toISOString().split('T')[0],
          refillSchedule: '30',
          imageUri: medicineData.imageUri,
          description: medicineData.description,
          expiryDate: medicineData.expiryDate,
          // Set as unverified initially
          blockchain_verified: false,
          verifiedDate: null,
          dateAdded: new Date().toISOString(),
          // Link to prescription if matched
          prescriptionId: matched ? prescription.record_id : null,
          // Add serial number if available
          serialNumber: medicineData.serialNumber || `SN${Date.now()}`
        };
        
        // Add new medicine
        medicines.push(newMedicine);
      }
      
      // Save updated medicines
      await AsyncStorage.setItem('medicines', JSON.stringify(medicines));
      
      return true;
    } catch (error) {
      console.error('Error adding scanned medicine:', error);
      return false;
    }
  };
  
  // Navigate to verification screen with medicine data
  const handleMedicineVerification = (medicineData, navigation) => {
    setScannedMedicine(medicineData);
    setVerificationResult(null);
    // Navigate to verification screen
    navigation.navigate('MedicineAuth', { medicineData });
  };
  
  // Verify medicine with blockchain
  const verifyMedicine = async (serialNumber) => {
    try {
      setLoading(true);
      
      // Call the blockchain verification service
      const result = await MedicineService.verifyMedicine(serialNumber);
      setVerificationResult(result);
      
      setLoading(false);
      return result;
    } catch (error) {
      console.error('Error verifying medicine:', error);
      setLoading(false);
      setVerificationResult({
        verified: false,
        error: error.message || 'Failed to verify medicine'
      });
      return {
        verified: false,
        error: error.message || 'Failed to verify medicine'
      };
    }
  };
  
  // Check if medicine matches a prescription
  const checkPrescriptionMatch = (medicineName) => {
    if (!medicineName || !prescriptions || prescriptions.length === 0) {
      return { matched: false };
    }
    
    // Look through each prescription
    for (const prescription of prescriptions) {
      let details;
      
      // Parse details if they're stored as a string
      if (typeof prescription.details === 'string') {
        try {
          details = JSON.parse(prescription.details);
        } catch (e) {
          console.error('Error parsing prescription details:', e);
          continue;
        }
      } else {
        details = prescription.details;
      }
      
      // Check if the medicine is in this prescription
      if (details && details.medications) {
        const match = details.medications.some(med => 
          med.name.toLowerCase().includes(medicineName.toLowerCase()) ||
          medicineName.toLowerCase().includes(med.name.toLowerCase())
        );
        
        if (match) {
          return { matched: true, prescription };
        }
      }
    }
    
    return { matched: false };
  };
  
  // Update medicine to verified status
  const updateMedicineVerificationStatus = async (medicineId, verificationData) => {
    try {
      // Get existing medications
      const medicinesJson = await AsyncStorage.getItem('medicines');
      if (!medicinesJson) return false;
      
      let medicines = JSON.parse(medicinesJson);
      
      // Find the medicine to update
      const index = medicines.findIndex(med => med.id === medicineId);
      if (index === -1) return false;
      
      // Update verification status
      medicines[index] = {
        ...medicines[index],
        blockchain_verified: true,
        verifiedDate: new Date().toISOString(),
        // Update with verification data if available
        manufacturer: verificationData?.manufacturer || medicines[index].manufacturer,
        batchNumber: verificationData?.batch_number || medicines[index].batchNumber,
        expiryDate: verificationData?.expiration_date || medicines[index].expiryDate,
      };
      
      // Save updated medicines
      await AsyncStorage.setItem('medicines', JSON.stringify(medicines));
      
      // Also save to verified medicines list for MedicineAuthScreen
      await saveToVerifiedMedicines({
        name: medicines[index].name,
        serialNumber: medicines[index].serialNumber,
        manufacturer: medicines[index].manufacturer || 'Unknown Manufacturer',
        batchNumber: medicines[index].batchNumber || 'Unknown',
        expiryDate: medicines[index].expiryDate || 'Unknown'
      });
      
      return true;
    } catch (error) {
      console.error('Error updating medicine verification status:', error);
      return false;
    }
  };
  
  // Save to verified medicines list (for MedicineAuthScreen)
  const saveToVerifiedMedicines = async (medicineData) => {
    try {
      // Get existing verified medicines
      const verifiedMedicinesJson = await AsyncStorage.getItem('verified_medicines');
      let verifiedMedicines = verifiedMedicinesJson ? JSON.parse(verifiedMedicinesJson) : [];
      
      // Create new verified medicine record
      const verifiedMedicine = {
        id: `med_${Date.now()}`,
        serialNumber: medicineData.serialNumber || `SN${Date.now()}`,
        name: medicineData.name,
        manufacturer: medicineData.manufacturer || 'Unknown Manufacturer',
        batchNumber: medicineData.batchNumber || `B${Math.floor(Math.random() * 10000)}`,
        expiryDate: medicineData.expiryDate || '2027-01-01',
        verifiedDate: new Date().toISOString(),
        activationDate: new Date().toISOString(),
        status: 'Verified & Activated'
      };
      
      // Add to list
      verifiedMedicines.push(verifiedMedicine);
      
      // Save back to storage
      await AsyncStorage.setItem('verified_medicines', JSON.stringify(verifiedMedicines));
      
      return true;
    } catch (error) {
      console.error('Error saving to verified medicines:', error);
      return false;
    }
  };
  
  // Function to handle successful verification and update medicine status
  const completeMedicineVerification = async (medicine, navigation) => {
    // Check if we have a medicine ID (for existing medicines)
    if (medicine.id) {
      const updated = await updateMedicineVerificationStatus(
        medicine.id, 
        medicine
      );
      
      if (updated) {
        Alert.alert(
          'Verification Successful',
          'The medicine has been verified on the blockchain and is now ready to use.',
          [{ text: 'OK', onPress: () => navigation.navigate('Medication') }]
        );
        return true;
      } else {
        Alert.alert(
          'Verification Error',
          'The medicine was verified but could not be updated in your list.'
        );
        return false;
      }
    } else {
      // This shouldn't happen in the new flow, but handle it just in case
      Alert.alert(
        'Medicine Not Found',
        'Please scan the medicine again from the Medication screen.',
        [{ text: 'OK', onPress: () => navigation.navigate('Medication') }]
      );
      return false;
    }
  };
  
  return (
    <MedicineVerificationContext.Provider
      value={{
        scannedMedicine,
        verificationResult,
        loading,
        prescriptions,
        addScannedMedicineToList,
        handleMedicineVerification,
        verifyMedicine,
        checkPrescriptionMatch,
        updateMedicineVerificationStatus,
        completeMedicineVerification,
        loadPrescriptions
      }}
    >
      {children}
    </MedicineVerificationContext.Provider>
  );
};

// Custom hook to use the medicine verification context
export const useMedicineVerification = () => {
  const context = useContext(MedicineVerificationContext);
  if (!context) {
    throw new Error('useMedicineVerification must be used within a MedicineVerificationProvider');
  }
  return context;
};

export default MedicineVerificationContext;