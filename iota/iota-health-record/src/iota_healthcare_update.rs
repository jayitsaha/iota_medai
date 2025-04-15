use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::fs::{File, OpenOptions};
use std::io::{self, Read};
use std::path::Path;

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

// Local database file path
const DB_FILE: &str = "healthcare_records.json";

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Get the record ID and new status from arguments
    let record_id = match env::args().nth(1) {
        Some(s) => s,
        None => {
            println!("{{\"error\": \"Record ID must be provided as the first argument\"}}");
            return Err(anyhow::anyhow!("Missing record ID argument"));
        }
    };
    
    let new_status = match env::args().nth(2) {
        Some(s) => s,
        None => {
            println!("{{\"error\": \"New status must be provided as the second argument\"}}");
            return Err(anyhow::anyhow!("Missing new status argument"));
        }
    };
    
    // Optionally get updated details as the third argument
    let updated_details = env::args().nth(3);
    
    // First, check if this record exists
    let existing_records = fetch_from_local_db()?;
    
    let mut found_record: Option<StoredHealthcareRecord> = None;
    
    for record in existing_records.iter() {
        if record.record_id == record_id {
            found_record = Some(record.clone());
            break;
        }
    }
    
    let record = match found_record {
        Some(r) => r,
        None => {
            println!("{{\"error\": \"Healthcare record not found\", \"record_id\": \"{}\"}}",
                record_id);
            return Ok(());
        }
    };
    
    // Create updated record
    let update_time = chrono::Utc::now().to_rfc3339();
    
    let mut updated_record = HealthcareRecord {
        record_id: record.record_id.clone(),
        patient_id: record.patient_id.clone(),
        record_type: record.record_type.clone(),
        provider: record.provider.clone(),
        date: record.date.clone(),
        details: record.details.clone(),
        status: new_status.clone(),
        timestamp: update_time.clone(),
    };
    
    // Update details if provided
    if let Some(details) = updated_details {
        updated_record.details = details;
    }
    
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
    let data_json = serde_json::to_string(&updated_record)?;
    
    // Create a TaggedData transaction
    println!("Submitting updated healthcare record to IOTA tangle...");
    let block = client.block()
        .with_tag("HEALTHCARE_RECORDS_REGISTRY".as_bytes().to_vec())
        .with_data(data_json.as_bytes().to_vec())
        .finish()
        .await?;
    
    let block_id = block.id();
    
    // Also update local database
    println!("Updating healthcare record in local database...");
    
    // Create a stored record with the block ID
    let stored_record = StoredHealthcareRecord {
        id: block_id.to_string(),
        record_id: updated_record.record_id,
        patient_id: updated_record.patient_id,
        record_type: updated_record.record_type,
        provider: updated_record.provider,
        date: updated_record.date,
        details: updated_record.details,
        status: updated_record.status,
        timestamp: updated_record.timestamp,
    };
    
    // Update local database
    update_record_in_local_db(&stored_record)?;
    
    // Output the updated record as JSON
    println!("{{\"success\": true, \"record\": {}, \"blockId\": \"{}\"}}",
        serde_json::to_string(&stored_record)?,
        block_id);
    
    Ok(())
}

fn fetch_from_local_db() -> Result<Vec<StoredHealthcareRecord>> {
    // Check if file exists
    if !Path::new(DB_FILE).exists() {
        return Ok(Vec::new());
    }
    
    // Read file
    let file = match File::open(DB_FILE) {
        Ok(f) => f,
        Err(_) => return Ok(Vec::new()),
    };
    
    // Parse JSON
    match serde_json::from_reader(file) {
        Ok(records) => {
            let records: Vec<StoredHealthcareRecord> = records;
            Ok(records)
        },
        Err(_) => Ok(Vec::new())
    }
}

fn update_record_in_local_db(updated_record: &StoredHealthcareRecord) -> Result<()> {
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
    
    // Create a new list with existing records except the one we're updating
    let mut updated_records: Vec<StoredHealthcareRecord> = Vec::new();
    let mut found = false;
    
    for record in records {
        if record.record_id == updated_record.record_id {
            // Skip the old record (we'll add the updated one later)
            found = true;
        } else {
            updated_records.push(record);
        }
    }
    
    // Add the updated record
    updated_records.push(updated_record.clone());
    
    // Write the updated records back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &updated_records)?;
    
    if found {
        println!("Updated existing healthcare record in local database");
    } else {
        println!("Added new healthcare record to local database");
    }
    
    Ok(())
}