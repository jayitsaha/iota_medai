use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::fs::{File, OpenOptions};
use std::io::{self, Read};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
struct MedicineRecord {
    serial_number: String,
    name: String,
    manufacturer: String,
    batch_number: String,
    production_date: String,
    expiration_date: String,
    status: String,          // "unactivated", "activated", "recalled"
    activation_timestamp: Option<String>,
    timestamp: String,
}

// The record structure as stored in our local database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct StoredMedicineRecord {
    id: String,
    serial_number: String,
    name: String,
    manufacturer: String,
    batch_number: String,
    production_date: String,
    expiration_date: String,
    status: String,          // "unactivated", "activated", "recalled"
    activation_timestamp: Option<String>,
    timestamp: String,
}

// Local database file path for medicines
const MEDICINE_DB_FILE: &str = "medicine_records.json";

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Get the serial number from the first argument
    let serial_number = match env::args().nth(1) {
        Some(s) => s,
        None => {
            println!("Error: Serial number must be provided as the first argument");
            return Err(anyhow::anyhow!("Missing serial number argument"));
        }
    };
    
    // First, check if this medicine exists and if it's already activated
    let existing_records = fetch_from_local_db()?;
    
    let mut found_medicine: Option<StoredMedicineRecord> = None;
    
    for record in existing_records.iter() {
        if record.serial_number == serial_number {
            found_medicine = Some(record.clone());
            break;
        }
    }
    
    let medicine = match found_medicine {
        Some(m) => {
            if m.status == "activated" {
                println!("{{\"error\": \"Medicine already activated\", \"medicine\": {}}}", 
                    serde_json::to_string(&m)?);
                return Ok(());
            }
            m
        },
        None => {
            println!("{{\"error\": \"Medicine not found\", \"serial_number\": \"{}\"}}", 
                serial_number);
            return Ok(());
        }
    };
    
    // Create updated medicine record
    let activation_time = chrono::Utc::now().to_rfc3339();
    
    let updated_medicine = MedicineRecord {
        serial_number: medicine.serial_number.clone(),
        name: medicine.name.clone(),
        manufacturer: medicine.manufacturer.clone(),
        batch_number: medicine.batch_number.clone(),
        production_date: medicine.production_date.clone(),
        expiration_date: medicine.expiration_date.clone(),
        status: "activated".to_string(),
        activation_timestamp: Some(activation_time.clone()),
        timestamp: medicine.timestamp.clone(),
    };
    
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
    let data_json = serde_json::to_string(&updated_medicine)?;
    
    // Create a TaggedData transaction
    println!("Submitting updated medicine data to IOTA tangle...");
    let block = client.block()
        .with_tag("MEDICINE_AUTH_REGISTRY".as_bytes().to_vec())
        .with_data(data_json.as_bytes().to_vec())
        .finish()
        .await?;
    
    let block_id = block.id();
    
    // Also update local database
    println!("Updating medicine record in local database...");
    
    // Create a stored record with the block ID
    let stored_record = StoredMedicineRecord {
        id: block_id.to_string(),
        serial_number: updated_medicine.serial_number,
        name: updated_medicine.name,
        manufacturer: updated_medicine.manufacturer,
        batch_number: updated_medicine.batch_number,
        production_date: updated_medicine.production_date,
        expiration_date: updated_medicine.expiration_date,
        status: updated_medicine.status,
        activation_timestamp: updated_medicine.activation_timestamp,
        timestamp: updated_medicine.timestamp,
    };
    
    // Add to local database
    update_medicine_in_local_db(&stored_record)?;
    
    // Output the updated medicine as JSON
    println!("{{\"success\": true, \"medicine\": {}, \"blockId\": \"{}\"}}", 
        serde_json::to_string(&stored_record)?,
        block_id);
    
    Ok(())
}

fn fetch_from_local_db() -> Result<Vec<StoredMedicineRecord>> {
    // Check if file exists
    if !Path::new(MEDICINE_DB_FILE).exists() {
        return Ok(Vec::new());
    }
    
    // Read file
    let file = match File::open(MEDICINE_DB_FILE) {
        Ok(f) => f,
        Err(_) => return Ok(Vec::new()),
    };
    
    // Parse JSON
    match serde_json::from_reader(file) {
        Ok(records) => {
            let records: Vec<StoredMedicineRecord> = records;
            Ok(records)
        },
        Err(_) => Ok(Vec::new())
    }
}

fn update_medicine_in_local_db(updated_record: &StoredMedicineRecord) -> Result<()> {
    // Read existing records if the file exists
    let mut records: Vec<StoredMedicineRecord> = if Path::new(MEDICINE_DB_FILE).exists() {
        let file = File::open(MEDICINE_DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_records) => existing_records,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Create a new list with existing records except the one we're updating
    let mut updated_records: Vec<StoredMedicineRecord> = Vec::new();
    let mut found = false;
    
    for record in records {
        if record.serial_number == updated_record.serial_number {
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
        .open(MEDICINE_DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &updated_records)?;
    
    if found {
        println!("Updated existing medicine record in local database");
    } else {
        println!("Added new medicine record to local database");
    }
    
    Ok(())
}