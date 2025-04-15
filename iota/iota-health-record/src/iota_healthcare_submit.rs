use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{File, OpenOptions};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
struct HealthcareRecord {
    record_id: String,             // Unique identifier for the record
    patient_id: String,            // Patient identifier
    record_type: String,           // "Prescription", "BloodTest", "Vaccination", etc.
    provider: String,              // Healthcare provider name
    date: String,                  // Date of the record
    details: String,               // JSON string containing record details
    status: String,                // "Active", "Completed", "Cancelled", etc.
    timestamp: String,             // Creation timestamp
}

// The record structure as stored in our local database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct StoredHealthcareRecord {
    id: String,                    // IOTA block ID
    record_id: String,             // Unique identifier for the record
    patient_id: String,            // Patient identifier
    record_type: String,           // "Prescription", "BloodTest", "Vaccination", etc.
    provider: String,              // Healthcare provider name
    date: String,                  // Date of the record
    details: String,               // JSON string containing record details
    status: String,                // "Active", "Completed", "Cancelled", etc.
    timestamp: String,             // Creation timestamp
}

// Local database file path
const DB_FILE: &str = "healthcare_records.json";

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Check if data is passed as an argument or should be read from stdin
    let data = if let Some(arg) = env::args().nth(1) {
        arg
    } else {
        // Read from stdin if no argument provided
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        buffer
    };
    
    // Parse the JSON input
    let record: HealthcareRecord = serde_json::from_str(&data)?;
    println!("Received healthcare record data: {:?}", record);
    
    // Set up IOTA client
    println!("Initializing IOTA client...");
    let client = Client::builder()
        .with_node("https://api.testnet.shimmer.network")?
        .with_node("https://api.testnet.iota.org")?
        .with_node("https://api.shimmer.network")?
        .with_ignore_node_health() // Bypass health check
        .finish()?;
    
    println!("IOTA client initialized successfully");
    
    // Serialize to JSON
    let data_json = serde_json::to_string(&record)?;
    
    // Create a TaggedData transaction with a unique tag for healthcare records
    println!("Submitting healthcare record data to IOTA tangle...");
    let block = client.block()
        .with_tag("HEALTHCARE_RECORDS_REGISTRY".as_bytes().to_vec())
        .with_data(data_json.as_bytes().to_vec())
        .finish()
        .await?;
    
    let block_id = block.id();
    
    // Also save to local database for faster retrieval
    println!("Saving healthcare record to local database...");
    
    // Create a stored record with the block ID
    let stored_record = StoredHealthcareRecord {
        id: block_id.to_string(),
        record_id: record.record_id,
        patient_id: record.patient_id,
        record_type: record.record_type,
        provider: record.provider,
        date: record.date,
        details: record.details,
        status: record.status,
        timestamp: record.timestamp,
    };
    
    // Add to local database
    save_to_local_db(&stored_record)?;
    
    // Output the block ID to stdout for the Node.js server
    println!("Healthcare record transaction published successfully!");
    println!("{}", block_id);
    
    Ok(())
}

// Function to save a record to our local database
fn save_to_local_db(new_record: &StoredHealthcareRecord) -> Result<()> {
    // Read existing records if the file exists
    let mut records: Vec<StoredHealthcareRecord> = if Path::new(DB_FILE).exists() {
        let file = File::open(DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_records) => existing_records,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Add the new record
    records.push(new_record.clone());
    
    // Write the updated records back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &records)?;
    println!("Healthcare record saved to local database");
    
    Ok(())
}