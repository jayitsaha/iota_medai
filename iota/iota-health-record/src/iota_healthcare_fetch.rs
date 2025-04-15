use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::fs::{File, OpenOptions};
use std::path::Path;
use std::env;

// The record structure as stored in our local database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct StoredHealthcareRecord {
    id: String,
    record_id: String,
    patient_id: String,
    record_type: String,
    provider: String,
    date: String,
    details: String,
    status: String,
    timestamp: String,
}

// The record structure from the IOTA tangle
#[derive(Serialize, Deserialize, Debug)]
struct HealthcareRecord {
    record_id: String,
    patient_id: String,
    record_type: String,
    provider: String,
    date: String,
    details: String,
    status: String,
    timestamp: String,
}

// Local database file path (fallback for when tangle search fails)
const DB_FILE: &str = "healthcare_records.json";

// Our tag
const TAG: &str = "HEALTHCARE_RECORDS_REGISTRY";

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Check if we need to look up specific records by patient ID
    let patient_id = env::args().nth(1);
    if let Some(id) = &patient_id {
        println!("Looking up healthcare records for patient: {}", id);
    }
    
    // Get the records (first try tangle, then fall back to local)
    let records = match fetch_from_tangle().await {
        Ok(tangle_records) => {
            println!("Successfully fetched {} healthcare records from the tangle", tangle_records.len());
            if !tangle_records.is_empty() {
                // Save to local DB as cache
                update_local_db(&tangle_records)?;
                tangle_records
            } else {
                println!("No records found on tangle, checking local DB...");
                fetch_from_local_db()?
            }
        },
        Err(e) => {
            println!("Error fetching from tangle: {}", e);
            println!("Falling back to local database");
            fetch_from_local_db()?
        }
    };
    
    // Filter by patient ID if provided
    let filtered_records = if let Some(id) = patient_id {
        records.into_iter()
            .filter(|r| r.patient_id == id)
            .collect::<Vec<_>>()
    } else {
        records
    };
    
    // Output as JSON for Node.js to read
    let json = serde_json::to_string(&filtered_records)?;
    println!("{}", json);
    
    Ok(())
}

async fn fetch_from_tangle() -> Result<Vec<StoredHealthcareRecord>> {
    // Initialize results vector
    let mut results = Vec::new();
    
    // Set up IOTA client with improved error handling and debug output
    println!("Initializing IOTA client...");
    
    let client = match Client::builder()
        .with_node("https://api.testnet.shimmer.network")?
        .with_node("https://api.testnet.iota.org")?
        .with_node("https://api.shimmer.network")?
        .with_ignore_node_health() // Very important: ignore node health checks
        .finish() {
            Ok(c) => {
                println!("IOTA client initialized successfully");
                c
            },
            Err(e) => {
                println!("Error initializing IOTA client: {}", e);
                return Err(anyhow::anyhow!("Failed to initialize IOTA client"));
            }
        };
    
    // Debug: Print tag information
    println!("Our tag is: {}", TAG);
    let tag_bytes = TAG.as_bytes().to_vec();
    println!("Tag bytes: {:?}", tag_bytes);
    let tag_hex = hex::encode(&tag_bytes);
    println!("Tag as hex: {}", tag_hex);
    
    // Get some tip blocks to check
    let tips = match client.get_tips().await {
        Ok(t) => {
            println!("Fetched {} tip blocks", t.len());
            t
        },
        Err(e) => {
            println!("Error fetching tips: {}", e);
            Vec::new()
        }
    };
    
    // Process each tip block
    for block_id in tips {
        println!("Checking block: {}", block_id);
        
        match client.get_block(&block_id).await {
            Ok(block) => {
                if let Some(payload) = block.payload() {
                    // Check if it's tagged data
                    if let iota_client::block::payload::Payload::TaggedData(tagged_data) = payload {
                        let block_tag_bytes = tagged_data.tag();
                        let block_tag_hex = hex::encode(block_tag_bytes);
                        
                        // Compare tags
                        let tags_match = block_tag_bytes == tag_bytes.as_slice() || 
                                         block_tag_hex == tag_hex;
                        
                        if tags_match {
                            println!("Found matching tag!");
                            
                            // Try to extract the data
                            match std::str::from_utf8(tagged_data.data()) {
                                Ok(data_str) => {
                                    // Parse as JSON
                                    match serde_json::from_str::<HealthcareRecord>(data_str) {
                                        Ok(record) => {
                                            println!("Successfully parsed healthcare record: {}", record.record_id);
                                            
                                            // Add to results
                                            results.push(StoredHealthcareRecord {
                                                id: block_id.to_string(),
                                                record_id: record.record_id,
                                                patient_id: record.patient_id,
                                                record_type: record.record_type,
                                                provider: record.provider,
                                                date: record.date,
                                                details: record.details,
                                                status: record.status,
                                                timestamp: record.timestamp,
                                            });
                                        },
                                        Err(e) => println!("Error parsing record JSON: {}", e)
                                    }
                                },
                                Err(e) => println!("Error decoding data: {}", e)
                            }
                        }
                    }
                }
            },
            Err(e) => println!("Error fetching block {}: {}", block_id, e)
        }
    }
    
    println!("Found {} healthcare records on the tangle", results.len());
    
    Ok(results)
}

fn fetch_from_local_db() -> Result<Vec<StoredHealthcareRecord>> {
    println!("Fetching from local DB file: {}", DB_FILE);
    
    // Check if file exists
    if !Path::new(DB_FILE).exists() {
        println!("Local database file does not exist");
        return Ok(Vec::new());
    }
    
    // Read file
    let file = match File::open(DB_FILE) {
        Ok(f) => f,
        Err(e) => {
            println!("Error opening database file: {}", e);
            return Ok(Vec::new());
        }
    };
    
    // Parse JSON
    match serde_json::from_reader(file) {
        Ok(records) => {
            let records: Vec<StoredHealthcareRecord> = records;
            println!("Read {} healthcare records from local database", records.len());
            Ok(records)
        },
        Err(e) => {
            println!("Error parsing database file: {}", e);
            Ok(Vec::new())
        }
    }
}

fn update_local_db(records: &[StoredHealthcareRecord]) -> Result<()> {
    // Create or overwrite file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    // Write JSON
    serde_json::to_writer_pretty(file, records)?;
    
    println!("Updated local database with {} healthcare records", records.len());
    
    Ok(())
}