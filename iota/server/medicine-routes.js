const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const router = express.Router();

// Tag for medicine authentication
const TAG = 'MEDICINE_AUTH_REGISTRY';

// Register a new medicine in the blockchain
router.post('/medicines', async (req, res) => {
  try {
    const { serialNumber, name, manufacturer, batchNumber, productionDate, expirationDate } = req.body;
    
    if (!serialNumber || !name || !manufacturer || !batchNumber || !productionDate || !expirationDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('Creating new medicine record:', req.body);
    
    // Create a record with proper field names for the Rust program
    const medicine = {
      serial_number: serialNumber,
      name: name,
      manufacturer: manufacturer,
      batch_number: batchNumber,
      production_date: productionDate,
      expiration_date: expirationDate,
      status: "unactivated",
      activation_timestamp: null,
      timestamp: new Date().toISOString()
    };
    
    // Generate a temporary ID for immediate response
    const tempId = generateTempId();
    
    // Submit to IOTA in the background (non-blocking)
    submitToIOTARust(medicine)
      .then(blockId => {
        console.log('Medicine block successfully published to IOTA:', blockId);
      })
      .catch(error => {
        console.error('Failed to publish medicine to IOTA:', error);
      });
    
    // Return success with temporary ID
    res.status(201).json({ 
      message: 'Medicine record submitted for blockchain processing',
      blockId: tempId,
      record: medicine
    });
  } catch (error) {
    console.error('Error handling medicine record request:', error);
    res.status(500).json({ error: `Failed to process medicine record: ${error.message}` });
  }
});

// Fetch all medicine records
router.get('/medicines', async (req, res) => {
  try {
    console.log('Fetching medicine records from IOTA tangle...');
    
    // Call the Rust binary to fetch records from tangle
    const rustFetchBinaryPath = './iota_medicine_fetch';
    
    const { stdout, stderr } = await execAsync(rustFetchBinaryPath);
    
    if (stderr && stderr.trim() !== '') {
      // Note: in Rust, some logs go to stderr even if they're not errors
      console.log('Output from Rust fetch program:', stderr);
    }
    
    // Extract the actual JSON data (last line of output)
    const outputLines = stdout.trim().split('\n');
    const jsonOutput = outputLines[outputLines.length - 1];
    
    // Parse the JSON output from the Rust program
    let records;
    try {
      records = JSON.parse(jsonOutput);
      console.log(`Found ${records.length} medicine records`);
    } catch (parseError) {
      console.error('Error parsing Rust output:', parseError);
      console.log('Raw output:', jsonOutput);
      
      // If parsing fails, return empty records
      records = [];
    }
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching medicine records:', error);
    res.status(500).json({ 
      error: `Failed to fetch medicine records: ${error.message}`,
      records: [] // Return empty array on error
    });
  }
});

// Verify and activate a specific medicine by serial number
router.post('/medicines/:serialNumber/activate', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    if (!serialNumber) {
      return res.status(400).json({ error: 'Serial number is required' });
    }
    
    console.log(`Activating medicine with serial number: ${serialNumber}`);
    
    // Call the Rust binary to activate the medicine
    const rustActivateBinaryPath = './iota_medicine_activate';
    
    const { stdout, stderr } = await execAsync(`${rustActivateBinaryPath} '${serialNumber}'`);
    
    if (stderr && stderr.trim() !== '') {
      console.log('Output from Rust activate program:', stderr);
    }
    
    // Parse the JSON response
    try {
      // Get the last line from stdout which should contain our JSON
      const outputLines = stdout.trim().split('\n');
      const jsonOutput = outputLines[outputLines.length - 1];
      const result = JSON.parse(jsonOutput);
      
      if (result.error) {
        return res.status(400).json(result);
      }
      
      return res.status(200).json(result);
    } catch (parseError) {
      console.error('Error parsing activation response:', parseError);
      return res.status(500).json({ error: 'Error processing activation response' });
    }
  } catch (error) {
    console.error('Error activating medicine:', error);
    res.status(500).json({ error: `Failed to activate medicine: ${error.message}` });
  }
});

// Verify a medicine by serial number (without activating)
router.get('/medicines/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    if (!serialNumber) {
      return res.status(400).json({ error: 'Serial number is required' });
    }
    
    console.log(`Verifying medicine with serial number: ${serialNumber}`);
    
    // Call the Rust binary to fetch the specific medicine
    const rustFetchBinaryPath = './iota_medicine_fetch';
    
    const { stdout, stderr } = await execAsync(`${rustFetchBinaryPath} '${serialNumber}'`);
    
    if (stderr && stderr.trim() !== '') {
      console.log('Output from Rust fetch program:', stderr);
    }
    
    // Extract the actual JSON data (last line of output)
    const outputLines = stdout.trim().split('\n');
    const jsonOutput = outputLines[outputLines.length - 1];
    
    // Parse the JSON output from the Rust program
    let records;
    try {
      records = JSON.parse(jsonOutput);
      console.log(`Found ${records.length} matching medicine records`);
      
      if (records.length === 0) {
        return res.status(404).json({ error: 'Medicine not found', serialNumber });
      }
      
      // Return the most recent record (in case there are multiple with the same serial)
      const latestRecord = records.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      res.json(latestRecord);
    } catch (parseError) {
      console.error('Error parsing Rust output:', parseError);
      console.log('Raw output:', jsonOutput);
      
      return res.status(500).json({ error: 'Error processing medicine data' });
    }
  } catch (error) {
    console.error('Error verifying medicine:', error);
    res.status(500).json({ error: `Failed to verify medicine: ${error.message}` });
  }
});

// Generate a random temporary ID
function generateTempId() {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Submit data to IOTA using the Rust binary
async function submitToIOTARust(data) {
  try {
    console.log('Submitting medicine to IOTA via Rust binary...');
    
    // Convert the data to a JSON string
    const jsonData = JSON.stringify(data);
    
    // Path to the compiled Rust binary
    const rustBinaryPath = './iota_medicine_submit';
    
    // Execute the Rust binary, passing the JSON data as an argument
    const { stdout, stderr } = await execAsync(`${rustBinaryPath} '${jsonData}'`);
    
    if (stderr && stderr.trim() !== '') {
      // Note: Rust prints logs to stderr, so these aren't necessarily errors
      console.log('Output from Rust submit program:', stderr);
    }
    
    // The Rust program prints the block ID to stdout (last line)
    const outputLines = stdout.trim().split('\n');
    const blockId = outputLines[outputLines.length - 1];
    
    console.log('Received medicine block ID from Rust:', blockId);
    
    return blockId;
  } catch (error) {
    console.error('Error executing Rust medicine binary:', error);
    throw new Error(`Failed to submit medicine to IOTA: ${error.message}`);
  }
}

module.exports = router;