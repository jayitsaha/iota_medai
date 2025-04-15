const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const router = express.Router();

// Tag for healthcare records
const TAG = 'HEALTHCARE_RECORDS_REGISTRY';

// Register a new healthcare record in the blockchain
router.post('/healthcare-records', async (req, res) => {
  try {
    const { 
      patientId, 
      recordType, 
      provider, 
      date, 
      details, 
      status 
    } = req.body;
    
    if (!patientId || !recordType || !provider || !date || !details) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('Creating new healthcare record:', req.body);
    
    // Create a record with proper field names for the Rust program
    const record = {
      record_id: generateUniqueId(),
      patient_id: patientId,
      record_type: recordType,
      provider: provider,
      date: date,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      status: status || "Active",
      timestamp: new Date().toISOString()
    };
    
    // Generate a temporary ID for immediate response
    const tempId = generateTempId();
    
    // Submit to IOTA in the background (non-blocking)
    submitToIOTARust(record)
      .then(blockId => {
        console.log('Healthcare record block successfully published to IOTA:', blockId);
      })
      .catch(error => {
        console.error('Failed to publish healthcare record to IOTA:', error);
      });
    
    // Return success with temporary ID
    res.status(201).json({ 
      message: 'Healthcare record submitted for blockchain processing',
      blockId: tempId,
      record: record
    });
  } catch (error) {
    console.error('Error handling healthcare record request:', error);
    res.status(500).json({ error: `Failed to process healthcare record: ${error.message}` });
  }
});

// Fetch all healthcare records
router.get('/healthcare-records', async (req, res) => {
  try {
    console.log('Fetching healthcare records from IOTA tangle...');
    
    // Call the Rust binary to fetch records from tangle
    const rustFetchBinaryPath = './iota_healthcare_fetch';
    
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
      console.log(`Found ${records.length} healthcare records`);
    } catch (parseError) {
      console.error('Error parsing Rust output:', parseError);
      console.log('Raw output:', jsonOutput);
      
      // If parsing fails, return empty records
      records = [];
    }
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching healthcare records:', error);
    res.status(500).json({ 
      error: `Failed to fetch healthcare records: ${error.message}`,
      records: [] // Return empty array on error
    });
  }
});

// Fetch healthcare records for a specific patient
router.get('/healthcare-records/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    
    console.log(`Fetching healthcare records for patient: ${patientId}`);
    
    // Call the Rust binary to fetch records for this patient
    const rustFetchBinaryPath = './iota_healthcare_fetch';
    
    const { stdout, stderr } = await execAsync(`${rustFetchBinaryPath} '${patientId}'`);
    
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
      console.log(`Found ${records.length} healthcare records for patient ${patientId}`);
    } catch (parseError) {
      console.error('Error parsing Rust output:', parseError);
      console.log('Raw output:', jsonOutput);
      
      // If parsing fails, return empty records
      records = [];
    }
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching patient healthcare records:', error);
    res.status(500).json({ 
      error: `Failed to fetch healthcare records: ${error.message}`,
      records: [] 
    });
  }
});

// Update a healthcare record (e.g., change status)
router.put('/healthcare-records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { status, details } = req.body;
    
    if (!recordId || !status) {
      return res.status(400).json({ error: 'Record ID and new status are required' });
    }
    
    console.log(`Updating healthcare record ${recordId} with status: ${status}`);
    
    // Call the Rust binary to update the record
    const rustUpdateBinaryPath = './iota_healthcare_update';
    
    let command = `${rustUpdateBinaryPath} '${recordId}' '${status}'`;
    
    // Add details if provided
    if (details) {
      const detailsJson = typeof details === 'object' 
        ? JSON.stringify(details) 
        : details;
      command += ` '${detailsJson}'`;
    }
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && stderr.trim() !== '') {
      console.log('Output from Rust update program:', stderr);
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
      console.error('Error parsing update response:', parseError);
      return res.status(500).json({ error: 'Error processing update response' });
    }
  } catch (error) {
    console.error('Error updating healthcare record:', error);
    res.status(500).json({ error: `Failed to update healthcare record: ${error.message}` });
  }
});

// Get a specific healthcare record by ID
router.get('/healthcare-records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    console.log(`Fetching healthcare record with ID: ${recordId}`);
    
    // Call the Rust binary to fetch all records
    const rustFetchBinaryPath = './iota_healthcare_fetch';
    
    const { stdout, stderr } = await execAsync(rustFetchBinaryPath);
    
    if (stderr && stderr.trim() !== '') {
      console.log('Output from Rust fetch program:', stderr);
    }
    
    // Extract the actual JSON data (last line of output)
    const outputLines = stdout.trim().split('\n');
    const jsonOutput = outputLines[outputLines.length - 1];
    
    // Parse the JSON output from the Rust program and find the specific record
    try {
      const records = JSON.parse(jsonOutput);
      const record = records.find(r => r.record_id === recordId);
      
      if (!record) {
        return res.status(404).json({ 
          error: 'Healthcare record not found', 
          recordId 
        });
      }
      
      return res.json(record);
    } catch (parseError) {
      console.error('Error parsing Rust output:', parseError);
      return res.status(500).json({ error: 'Error processing healthcare data' });
    }
  } catch (error) {
    console.error('Error fetching healthcare record:', error);
    res.status(500).json({ error: `Failed to fetch healthcare record: ${error.message}` });
  }
});

// Generate a random temporary ID for immediate response
function generateTempId() {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Generate a unique ID for the record
function generateUniqueId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomStr}`;
}

// Submit data to IOTA using the Rust binary
async function submitToIOTARust(data) {
  try {
    console.log('Submitting healthcare record to IOTA via Rust binary...');
    
    // Convert the data to a JSON string
    const jsonData = JSON.stringify(data);
    
    // Path to the compiled Rust binary
    const rustBinaryPath = './iota_healthcare_submit';
    
    // Execute the Rust binary, passing the JSON data as an argument
    const { stdout, stderr } = await execAsync(`${rustBinaryPath} '${jsonData}'`);
    
    if (stderr && stderr.trim() !== '') {
      // Note: Rust prints logs to stderr, so these aren't necessarily errors
      console.log('Output from Rust submit program:', stderr);
    }
    
    // The Rust program prints the block ID to stdout (last line)
    const outputLines = stdout.trim().split('\n');
    const blockId = outputLines[outputLines.length - 1];
    
    console.log('Received healthcare block ID from Rust:', blockId);
    
    return blockId;
  } catch (error) {
    console.error('Error executing Rust healthcare binary:', error);
    throw new Error(`Failed to submit healthcare record to IOTA: ${error.message}`);
  }
}

module.exports = router;