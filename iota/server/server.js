const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
require('dotenv').config();
const healthcareRoutes = require('./healthcare-routes');

// Import wallet manager (instead of lock manager)
const walletManager = require('./walletManager');

// Import route handlers
const medicineRoutes = require('./medicine-routes');
const marketplaceRoutes = require('./marketplace-routes');
const walletRoutes = require('./wallet-routes');
const authRoutes = require('./auth-routes');
const hospitalRoutes = require('./hospitalRoutes'); // New hospital routes

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


// Tags for our applications
const ORGAN_TAG = 'ORGAN_DONOR_REGISTRY';
const MEDICINE_TAG = 'MEDICINE_AUTH_REGISTRY';
const HEALTHCARE_TAG = 'HEALTHCARE_RECORD_REGISTRY';

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'IOTA Blockchain Registry API',
    endpoints: [
      '/api/organ-records',
      '/api/medicines',
      '/api/healthcare-records',
      '/api/marketplace/services',
      '/api/wallet',
      '/api/hospitals' // New endpoint
    ] 
  });
});

// Register routes
app.use('/api', authRoutes);
app.use('/api', medicineRoutes);
app.use('/api', healthcareRoutes);
app.use('/api', marketplaceRoutes);
app.use('/api', walletRoutes);
app.use('/api', hospitalRoutes); // New hospital routes


// Create a new organ donor record
app.post('/api/organ-records', async (req, res) => {
  try {
    const { donorId, organType, status } = req.body;
    
    if (!donorId || !organType || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('Creating new organ record:', { donorId, organType, status });
    
    // Create a record
    const organ = {
      donor_id: donorId,
      organ_type: organType,
      status: status,
      timestamp: new Date().toISOString()
    };
    
    // Generate a temporary ID for immediate response
    const tempId = generateTempId();
    
    // Submit to IOTA in the background (non-blocking)
    submitToIOTARust(organ)
      .then(blockId => {
        console.log('Block successfully published to IOTA:', blockId);
      })
      .catch(error => {
        console.error('Failed to publish to IOTA:', error);
      });
    
    // Return success with temporary ID
    res.status(201).json({ 
      message: 'Organ record submitted for blockchain processing',
      blockId: tempId,
      record: organ
    });
  } catch (error) {
    console.error('Error handling organ record request:', error);
    res.status(500).json({ error: `Failed to process organ record: ${error.message}` });
  }
});

// Fetch organ records from IOTA tangle
app.get('/api/organ-records', async (req, res) => {
  try {
    console.log('Fetching organ records from IOTA tangle...');
    
    // Call the Rust binary to fetch records from tangle
    const rustFetchBinaryPath = './iota_fetch';
    
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
      console.log(`Found ${records.length} donor records`);
    } catch (parseError) {
      console.error('Error parsing Rust output:', parseError);
      console.log('Raw output:', jsonOutput);
      
      // If parsing fails, return empty records
      records = [];
    }
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching organ records:', error);
    res.status(500).json({ 
      error: `Failed to fetch organ records: ${error.message}`,
      records: [] // Return empty array on error
    });
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
    console.log('Submitting to IOTA via Rust binary...');
    
    // Convert the data to a JSON string
    const jsonData = JSON.stringify(data);
    
    // Path to the compiled Rust binary
    const rustBinaryPath = './iota_submit';
    
    // Execute the Rust binary, passing the JSON data as an argument
    const { stdout, stderr } = await execAsync(`${rustBinaryPath} '${jsonData}'`);
    
    if (stderr && stderr.trim() !== '') {
      // Note: Rust prints logs to stderr, so these aren't necessarily errors
      console.log('Output from Rust submit program:', stderr);
    }
    
    // The Rust program prints the block ID to stdout (last line)
    const outputLines = stdout.trim().split('\n');
    const blockId = outputLines[outputLines.length - 1];
    
    console.log('Received block ID from Rust:', blockId);
    
    return blockId;
  } catch (error) {
    console.error('Error executing Rust binary:', error);
    throw new Error(`Failed to submit to IOTA: ${error.message}`);
  }
}

// Initialize the wallet manager, then start the server
async function startServer() {
  try {
    // Initialize wallet manager
    console.log('Initializing wallet manager...');
    await walletManager.initialize();
    console.log('Wallet manager initialized successfully');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on('uncaughtException', (error) => {
      console.error('\n!!! UNCAUGHT EXCEPTION !!!');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      
      // Log to a file for further analysis
      fs.appendFileSync('error.log', `\n[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}\n`);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('\n!!! UNHANDLED REJECTION !!!');
      console.error('Reason:', reason);
      
      // Try to get more details
      if (reason instanceof Error) {
        console.error('Stack:', reason.stack);
      }
      
      // Log to a file for further analysis
      fs.appendFileSync('error.log', `\n[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`);
      
      // Try to get the promise details
      promise.catch(err => {
        console.error('Promise details:', err);
        fs.appendFileSync('error.log', `Promise details: ${err}\n`);
      });
    });
    
    // Setup cleanup on exit
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await walletManager.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Shutting down server...');
      await walletManager.cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during server startup:', error);
    process.exit(1);
  }
}

// Start the server
startServer();