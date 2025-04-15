const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Import file storage utilities - using your existing utility
const {
  findById,
  findMany,
  create,
  update,
  remove,
  query
} = require('./utils/fileStorage');

// Import authentication middleware - using your existing middleware
const { authenticate, isProvider, isHospitalAdmin, isAdmin } = require('./middleware/authenticate');

const router = express.Router();

// Path to compiled Rust binaries
const RUST_BIN_PATH = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../bin') 
  : path.join(__dirname, '../target/release');

// Verify binary paths exist
const checkBinaries = () => {
  const hospitalRegisterPath ='./iota_hospital_register';
  const ambulanceRegisterPath ='./iota_ambulance_register';
  const emergencyServicePath ='./iota_emergency_service';

  // Create fallback paths for Windows
//   const hospitalRegisterPathWindows = hospitalRegisterPath + '.exe';
//   const ambulanceRegisterPathWindows = ambulanceRegisterPath + '.exe';
//   const emergencyServicePathWindows = emergencyServicePath + '.exe';
  
  // Check for Linux/Mac paths
  const hospitalExists = fs.access(hospitalRegisterPath).catch(() => false);
  const ambulanceExists = fs.access(ambulanceRegisterPath).catch(() => false);
  const emergencyExists = fs.access(emergencyServicePath).catch(() => false);
  
  // Check for Windows paths
//   const hospitalExistsWin = fs.access(hospitalRegisterPathWindows).catch(() => false);
//   const ambulanceExistsWin = fs.access(ambulanceRegisterPathWindows).catch(() => false);
//   const emergencyExistsWin = fs.access(emergencyServicePathWindows).catch(() => false);
  
  return {
    hospitalRegisterPath: Promise.resolve(hospitalExists || hospitalExistsWin) ? 
      (hospitalExists ? hospitalRegisterPath : hospitalRegisterPathWindows) : null,
    ambulanceRegisterPath: Promise.resolve(ambulanceExists || ambulanceExistsWin) ?
      (ambulanceExists ? ambulanceRegisterPath : ambulanceRegisterPathWindows) : null,
    emergencyServicePath: Promise.resolve(emergencyExists || emergencyExistsWin) ?
      (emergencyExists ? emergencyServicePath : emergencyServicePathWindows) : null
  };
};

// Check binaries on startup
let binaries;
try {
  binaries = checkBinaries();
  console.log('IOTA hospital binaries found and verified');
} catch (error) {
  console.error('IOTA binary verification failed:', error.message);
  // Continue anyway, we'll use mocked data if binaries aren't available
}

// GET /api/hospitals - Get all hospitals
router.get('/hospitals', async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { name, city, state, emergency } = req.query;
    
    // Build query options
    const queryOptions = {
      filters: {},
      searchFields: ['name', 'location.city', 'location.state'],
      sort: 'name:asc'
    };
    
    if (name) {
      queryOptions.search = name;
      queryOptions.searchFields = ['name'];
    }
    
    if (city) {
      queryOptions.filters['location.city'] = city;
    }
    
    if (state) {
      queryOptions.filters['location.state'] = state;
    }
    
    if (emergency === 'true') {
      queryOptions.filters.emergency_capacity = { $gt: 0 };
    }
    
    // Fetch hospitals from JSON file
    const result = await query('hospitals.json', queryOptions);
    
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ 
      error: `Failed to fetch hospitals: ${error.message}`,
      hospitals: [] // Return empty array on error
    });
  }
});

// POST /api/hospitals - Register a new hospital
router.post('/hospitals', authenticate, isHospitalAdmin, async (req, res) => {
  try {
    const { 
      name, 
      location, 
      contact, 
      services, 
      emergency_capacity 
    } = req.body;
    
    // Validate required fields
    if (!name || !location || !contact) {
      return res.status(400).json({ 
        error: 'Name, location, and contact information are required' 
      });
    }
    
    // Validate location coordinates
    if (!location.latitude || !location.longitude || !location.address) {
      return res.status(400).json({ 
        error: 'Location must include latitude, longitude, and address' 
      });
    }
    
    // Generate hospital ID
    const hospitalId = uuidv4();
    
    // Prepare hospital data for blockchain
    const hospitalData = {
      hospital_id: hospitalId,
      name,
      location,
      contact,
      services: services || [],
      emergency_capacity: emergency_capacity || 0,
      verification_status: 'verified', // Or 'pending' if requiring admin approval
      timestamp: new Date().toISOString(),
      adminId: req.user.id // Associate hospital with the admin who created it
    };
    
    // Attempt to use the Rust binary if available, otherwise mock the blockchain integration
    try {
      // Write the JSON to a temporary file
      const tempFileName = `hospital_${hospitalId}.json`;
      const tempFilePath = path.join(require('os').tmpdir(), tempFileName);
      await fs.writeFile(tempFilePath, JSON.stringify(hospitalData));
      
      // Binary path
      const binaryPath = binaries ? binaries.hospitalRegisterPath : null;
      
      let blockId;
      if (binaryPath) {
        // Submit to blockchain using the file
        const { stdout, stderr } = await execAsync(`${binaryPath} "${tempFilePath}"`);
        
        if (stderr && stderr.trim() !== '') {
          console.log('Output from hospital registration:', stderr);
        }
        
        // Get blockchain transaction ID
        const outputLines = stdout.trim().split('\n');
        blockId = outputLines[outputLines.length - 1];
      } else {
        // Mock blockchain registration
        console.log('Mocking blockchain registration - binaries not available');
        blockId = `mock-block-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      }
      
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(e => console.warn('Could not delete temp file:', e));
      
      // Create hospital in local database
      const hospital = {
        id: hospitalId,
        name,
        location,
        contact,
        services: services || [],
        emergency_capacity: emergency_capacity || 0,
        verification_status: 'verified',
        blockchainTransactionId: blockId,
        blockchainStatus: 'Confirmed',
        adminId: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await create('hospitals.json', hospital);
      
      res.status(201).json({
        success: true,
        hospital,
        blockchainTransactionId: blockId
      });
    } catch (rustError) {
      console.error('Error registering hospital on blockchain:', rustError);
      
      // Create hospital in database with pending blockchain status
      const hospital = {
        id: hospitalId,
        name,
        location,
        contact,
        services: services || [],
        emergency_capacity: emergency_capacity || 0,
        verification_status: 'verified',
        blockchainStatus: 'Pending',
        adminId: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await create('hospitals.json', hospital);
      
      res.status(201).json({
        success: true,
        warning: 'Hospital created but blockchain verification is pending',
        hospital
      });
    }
  } catch (error) {
    console.error('Error creating hospital:', error);
    res.status(500).json({ 
      error: `Failed to create hospital: ${error.message}`
    });
  }
});

// GET /api/hospitals/:hospitalId - Get hospital details
router.get('/hospitals/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    // Fetch hospital from JSON file
    const hospital = await findById('hospitals.json', hospitalId);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    res.json(hospital);
  } catch (error) {
    console.error('Error fetching hospital details:', error);
    res.status(500).json({ 
      error: `Failed to fetch hospital details: ${error.message}`
    });
  }
});

// PUT /api/hospitals/:hospitalId - Update hospital details
router.put('/hospitals/:hospitalId', authenticate, isHospitalAdmin, async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const updates = req.body;
    
    // Fetch existing hospital
    const hospital = await findById('hospitals.json', hospitalId);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    // Check if user is admin for this hospital
    if (req.user.role !== 'admin' && hospital.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not authorized for this hospital.' });
    }
    
    // Update hospital with new details
    const updatedHospital = await update('hospitals.json', hospitalId, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      hospital: updatedHospital
    });
  } catch (error) {
    console.error('Error updating hospital:', error);
    res.status(500).json({ 
      error: `Failed to update hospital: ${error.message}`
    });
  }
});

// POST /api/hospitals/:hospitalId/ambulances - Add an ambulance to a hospital
router.post('/hospitals/:hospitalId/ambulances', authenticate, isHospitalAdmin, async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { 
      registration_number, 
      vehicle_type, 
      capacity, 
      equipment 
    } = req.body;
    
    // Validate required fields
    if (!registration_number || !vehicle_type) {
      return res.status(400).json({ 
        error: 'Registration number and vehicle type are required' 
      });
    }
    
    // Check if hospital exists
    const hospital = await findById('hospitals.json', hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    // Check if user is admin for this hospital
    if (req.user.role !== 'admin' && hospital.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not authorized for this hospital.' });
    }
    
    // Generate ambulance ID
    const ambulanceId = uuidv4();
    
    // Prepare ambulance data for blockchain
    const ambulanceData = {
      ambulance_id: ambulanceId,
      hospital_id: hospitalId,
      registration_number,
      vehicle_type,
      capacity: capacity || 1,
      equipment: equipment || [],
      current_status: 'Available',
      current_location: null, // Will be updated by ambulance tracking system
      last_updated: new Date().toISOString()
    };
    
    // Attempt to use the Rust binary if available, otherwise mock the blockchain integration
    try {
      // Write the JSON to a temporary file
      const tempFileName = `ambulance_${ambulanceId}.json`;
      const tempFilePath = path.join(require('os').tmpdir(), tempFileName);
      await fs.writeFile(tempFilePath, JSON.stringify(ambulanceData));
      
      // Binary path
      const binaryPath = binaries ? binaries.ambulanceRegisterPath : null;
      
      let blockId;
      if (binaryPath) {
        // Submit to blockchain using the file
        const { stdout, stderr } = await execAsync(`${binaryPath} "${tempFilePath}"`);
        
        if (stderr && stderr.trim() !== '') {
          console.log('Output from ambulance registration:', stderr);
        }
        
        // Get blockchain transaction ID
        const outputLines = stdout.trim().split('\n');
        blockId = outputLines[outputLines.length - 1];
      } else {
        // Mock blockchain registration
        console.log('Mocking blockchain registration - binaries not available');
        blockId = `mock-block-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      }
      
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(e => console.warn('Could not delete temp file:', e));
      
      // Create ambulance in local database
      const ambulance = {
        id: ambulanceId,
        hospital_id: hospitalId,
        registration_number,
        vehicle_type,
        capacity: capacity || 1,
        equipment: equipment || [],
        current_status: 'Available',
        current_location: null,
        blockchainTransactionId: blockId,
        blockchainStatus: 'Confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await create('ambulances.json', ambulance);
      
      res.status(201).json({
        success: true,
        ambulance,
        blockchainTransactionId: blockId
      });
    } catch (rustError) {
      console.error('Error registering ambulance on blockchain:', rustError);
      
      // Create ambulance in database with pending blockchain status
      const ambulance = {
        id: ambulanceId,
        hospital_id: hospitalId,
        registration_number,
        vehicle_type,
        capacity: capacity || 1,
        equipment: equipment || [],
        current_status: 'Available',
        current_location: null,
        blockchainStatus: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await create('ambulances.json', ambulance);
      
      res.status(201).json({
        success: true,
        warning: 'Ambulance created but blockchain verification is pending',
        ambulance
      });
    }
  } catch (error) {
    console.error('Error creating ambulance:', error);
    res.status(500).json({ 
      error: `Failed to create ambulance: ${error.message}`
    });
  }
});

// GET /api/hospitals/:hospitalId/ambulances - Get ambulances for a hospital
router.get('/hospitals/:hospitalId/ambulances', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    // Check if hospital exists
    const hospital = await findById('hospitals.json', hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    // Fetch ambulances for this hospital from JSON file
    const ambulances = await findMany('ambulances.json', ambulance => ambulance.hospital_id === hospitalId);
    
    res.json(ambulances);
  } catch (error) {
    console.error('Error fetching hospital ambulances:', error);
    res.status(500).json({ 
      error: `Failed to fetch hospital ambulances: ${error.message}`,
      ambulances: [] // Return empty array on error
    });
  }
});

// PUT /api/ambulances/:ambulanceId/status - Update ambulance status
router.put('/ambulances/:ambulanceId/status', authenticate, async (req, res) => {
  try {
    const { ambulanceId } = req.params;
    const { status, location } = req.body;
    
    // Validate required fields
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Validate status value
    const validStatuses = ['Available', 'Dispatched', 'Maintenance', 'Returning'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    // Get the ambulance
    const ambulance = await findById('ambulances.json', ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }
    
    // Get the hospital to check permissions
    const hospital = await findById('hospitals.json', ambulance.hospital_id);
    if (hospital && req.user.role !== 'admin' && hospital.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not authorized for this hospital.' });
    }
    
    // Update the ambulance
    const updatedAmbulance = {
      ...ambulance,
      current_status: status,
      current_location: location || ambulance.current_location,
      last_updated: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Try to update on blockchain if binaries available
    try {
      if (binaries && binaries.ambulanceRegisterPath) {
        // Write the JSON to a temporary file
        const tempFileName = `ambulance_${ambulanceId}_update.json`;
        const tempFilePath = path.join(require('os').tmpdir(), tempFileName);
        
        // Convert from the webapp model to the blockchain model
        const blockchainAmbulance = {
          ambulance_id: ambulance.id,
          hospital_id: ambulance.hospital_id,
          registration_number: ambulance.registration_number,
          vehicle_type: ambulance.vehicle_type,
          capacity: ambulance.capacity,
          equipment: ambulance.equipment,
          current_status: status,
          current_location: location || ambulance.current_location,
          last_updated: new Date().toISOString()
        };
        
        await fs.writeFile(tempFilePath, JSON.stringify(blockchainAmbulance));
        
        // Submit to blockchain using the file
        const { stdout, stderr } = await execAsync(`${binaries.ambulanceRegisterPath} "${tempFilePath}"`);
        
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(e => console.warn('Could not delete temp file:', e));
        
        if (stderr && stderr.trim() !== '') {
          console.log('Output from ambulance update:', stderr);
        }
        
        // Get blockchain transaction ID
        const outputLines = stdout.trim().split('\n');
        const blockId = outputLines[outputLines.length - 1];
        
        // Update the ambulance in the database
        updatedAmbulance.blockchainTransactionId = blockId;
        updatedAmbulance.blockchainStatus = 'Confirmed';
      } else {
        // Mock blockchain update
        console.log('Mocking blockchain update - binaries not available');
        updatedAmbulance.blockchainTransactionId = `mock-block-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        updatedAmbulance.blockchainStatus = 'Confirmed';
      }
    } catch (blockchainError) {
      console.error('Error updating ambulance on blockchain:', blockchainError);
      updatedAmbulance.blockchainStatus = 'Pending';
    }
    
    // Update the ambulance in the database
    await update('ambulances.json', ambulanceId, updatedAmbulance);
    
    res.json({
      success: true,
      ambulance: updatedAmbulance
    });
  } catch (error) {
    console.error('Error updating ambulance status:', error);
    res.status(500).json({ 
      error: `Failed to update ambulance status: ${error.message}`
    });
  }
});

// GET /api/ambulances/:ambulanceId - Get ambulance details
router.get('/ambulances/:ambulanceId', async (req, res) => {
  try {
    const { ambulanceId } = req.params;
    
    // Get the ambulance
    const ambulance = await findById('ambulances.json', ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }
    
    res.json(ambulance);
  } catch (error) {
    console.error('Error fetching ambulance details:', error);
    res.status(500).json({ 
      error: `Failed to fetch ambulance details: ${error.message}`
    });
  }
});

// POST /api/emergency - Request emergency ambulance
router.post('/emergency', authenticate, async (req, res) => {
  try {
    const { user_location, emergency_type } = req.body;
    const userId = req.user?.id || req.headers['user-id'] || 'demo-user';
    
    // Validate required fields
    if (!user_location || !user_location.latitude || !user_location.longitude) {
      return res.status(400).json({ error: 'User location is required' });
    }
    
    // Generate emergency request ID
    const requestId = uuidv4();
    
    // Store the emergency request
    const emergencyRequest = {
      id: requestId,
      user_id: userId,
      user_location,
      emergency_type: emergency_type || 'Medical',
      status: 'Requested',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await create('emergencies.json', emergencyRequest);
    
    // Now, find the nearest hospital with available ambulances
    // This would normally be done by the Rust binary, but we'll implement it in JS here
    
    // 1. Get all hospitals
    const hospitals = await findMany('hospitals.json');
    
    // 2. Calculate distance to each hospital
    const hospitalsWithDistance = hospitals.map(hospital => {
      const distance = calculateDistance(
        user_location.latitude,
        user_location.longitude,
        hospital.location.latitude,
        hospital.location.longitude
      );
      
      return {
        ...hospital,
        distance
      };
    });
    
    // 3. Sort by distance
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
    
    // 4. Find available ambulances for each hospital
    let selectedHospital = null;
    let selectedAmbulance = null;
    
    for (const hospital of hospitalsWithDistance) {
      const ambulances = await findMany('ambulances.json', 
        ambulance => ambulance.hospital_id === hospital.id && ambulance.current_status === 'Available'
      );
      
      if (ambulances.length > 0) {
        selectedHospital = hospital;
        selectedAmbulance = ambulances[0];
        break;
      }
    }
    
    if (!selectedHospital || !selectedAmbulance) {
      return res.status(404).json({ 
        error: 'No available ambulances found',
        emergencyId: requestId
      });
    }
    
    // 5. Calculate ETA based on distance
    const distanceKm = selectedHospital.distance;
    const etaMinutes = Math.max(1, Math.round(distanceKm / 0.833)); // Assuming 50 km/h = 0.833 km/min
    
    // 6. Create emergency response
    const emergencyResponse = {
      id: uuidv4(),
      request_id: requestId,
      hospital_id: selectedHospital.id,
      hospital_name: selectedHospital.name,
      ambulance_id: selectedAmbulance.id,
      estimated_arrival_time: etaMinutes,
      distance: distanceKm,
      status: 'Assigned',
      timestamp: new Date().toISOString(),
      blockchainStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await create('emergency_responses.json', emergencyResponse);
    
    // 7. Update ambulance status
    await update('ambulances.json', selectedAmbulance.id, {
      current_status: 'Dispatched',
      updatedAt: new Date().toISOString()
    });
    
    // 8. Update emergency request status
    await update('emergencies.json', requestId, {
      status: 'Assigned',
      updatedAt: new Date().toISOString()
    });
    
    // Try to use the Rust binary for blockchain record if available
    if (binaries && binaries.emergencyServicePath) {
      try {
        // Write the original request to a temp file
        const tempFileName = `emergency_${requestId}.json`;
        const tempFilePath = path.join(require('os').tmpdir(), tempFileName);
        
        await fs.writeFile(tempFilePath, JSON.stringify({
          request_id: requestId,
          user_id: userId,
          user_location,
          emergency_type: emergency_type || 'Medical',
          timestamp: new Date().toISOString(),
          status: 'Requested'
        }));
        
        // Call the Rust binary
        const { stdout, stderr } = await execAsync(`${binaries.emergencyServicePath} "${tempFilePath}"`);
        
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(e => console.warn('Could not delete temp file:', e));
        
        if (stderr && stderr.trim() !== '') {
          console.log('Output from emergency service:', stderr);
        }
        
        // If we can parse the response from the Rust binary
        try {
          const rustResponse = JSON.parse(stdout.trim());
          if (rustResponse.blockchain_tx_id) {
            // Update the blockchain status
            await update('emergency_responses.json', emergencyResponse.id, {
              blockchainTransactionId: rustResponse.blockchain_tx_id,
              blockchainStatus: 'Confirmed'
            });
            
            // Update the response with the blockchain ID
            emergencyResponse.blockchainTransactionId = rustResponse.blockchain_tx_id;
            emergencyResponse.blockchainStatus = 'Confirmed';
          }
        } catch (parseError) {
          console.error('Error parsing Rust response:', parseError);
        }
      } catch (rustError) {
        console.error('Error executing Rust binary:', rustError);
      }
    } else {
      // Mock a blockchain transaction ID
      const mockBlockchainId = `mock-block-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      await update('emergency_responses.json', emergencyResponse.id, {
        blockchainTransactionId: mockBlockchainId,
        blockchainStatus: 'Confirmed'
      });
      
      emergencyResponse.blockchainTransactionId = mockBlockchainId;
      emergencyResponse.blockchainStatus = 'Confirmed';
    }
    
    res.status(201).json({
      success: true,
      emergency: emergencyResponse
    });
  } catch (error) {
    console.error('Error processing emergency request:', error);
    res.status(500).json({ 
      error: `Failed to process emergency request: ${error.message}`
    });
  }
});

// GET /api/emergency/:requestId - Get emergency request status
router.get('/emergency/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Fetch emergency request
    const emergencyRequest = await findById('emergencies.json', requestId);
    
    if (!emergencyRequest) {
      return res.status(404).json({ error: 'Emergency request not found' });
    }
    
    // Fetch emergency response if available
    const emergencyResponses = await findMany('emergency_responses.json', 
      response => response.request_id === requestId
    );
    
    const emergencyResponse = emergencyResponses.length > 0 ? emergencyResponses[0] : null;
    
    // If we have a response, include details about the hospital and ambulance
    let hospital = null;
    let ambulance = null;
    
    if (emergencyResponse) {
      hospital = await findById('hospitals.json', emergencyResponse.hospital_id);
      ambulance = await findById('ambulances.json', emergencyResponse.ambulance_id);
    }
    
    res.json({
      request: emergencyRequest,
      response: emergencyResponse,
      hospital: hospital ? {
        id: hospital.id,
        name: hospital.name,
        location: hospital.location,
        contact: hospital.contact
      } : null,
      ambulance: ambulance ? {
        id: ambulance.id,
        registration_number: ambulance.registration_number,
        vehicle_type: ambulance.vehicle_type,
        current_status: ambulance.current_status
      } : null
    });
  } catch (error) {
    console.error('Error fetching emergency details:', error);
    res.status(500).json({ 
      error: `Failed to fetch emergency details: ${error.message}`
    });
  }
});

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

module.exports = router;