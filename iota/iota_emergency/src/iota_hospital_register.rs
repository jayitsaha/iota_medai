use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{File, OpenOptions};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct HospitalRegistration {
    hospital_id: String,
    name: String,
    location: HospitalLocation,
    contact: ContactInfo,
    services: Vec<String>,
    emergency_capacity: u32,
    verification_status: String,
    timestamp: String,
    admin_id: Option<String>, // Optional admin ID who registered this hospital
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct HospitalLocation {
    latitude: f64,
    longitude: f64,
    address: String,
    city: String,
    state: String,
    country: String,
    postal_code: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ContactInfo {
    phone: String,
    email: String,
    website: String,
    emergency_phone: String,
}

// Local database file path
const DB_FILE: &str = "blockchain_hospitals.json";

#[tokio::main]
async fn main() -> Result<()> {
    // Parse input data
    let data = if let Some(arg) = env::args().nth(1) {
        // Check if the argument is a file path
        if Path::new(&arg).exists() {
            // Read from file
            let mut file = File::open(&arg)?;
            let mut buffer = String::new();
            file.read_to_string(&mut buffer)?;
            buffer
        } else {
            // Treat the argument as direct JSON data
            arg
        }
    } else {
        // No argument, read from stdin
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        buffer
    };
    
    // Parse JSON input
    let hospital: HospitalRegistration = match serde_json::from_str(&data) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("Error parsing JSON: {}", e);
            eprintln!("Input data was: {}", data);
            return Err(anyhow::anyhow!("Failed to parse JSON: {}", e));
        }
    };
    
    println!("Received hospital registration: {:?}", hospital);
    
    // Set up IOTA client
    let client = Client::builder()
    .with_node("https://api.testnet.iotaledger.net")?  // Use IOTA testnet only
    .with_ignore_node_health() // Bypass health check
    .finish()?;
    
    // Serialize to JSON
    let data_json = serde_json::to_string(&hospital)?;
    
    // Create a tagged data payload
    let tag = "HEALTHCARE_HOSPITAL_REGISTRY".as_bytes().to_vec();
    let data = data_json.as_bytes().to_vec();
    
    // Submit data to the blockchain using the correct methods for your client version
    // For IOTA client 2.0.1-rc.7, use the block builder API correctly
    let block = client.block()
        .with_tag(tag)
        .with_data(data)
        .finish()
        .await?;
    
    // Get the block ID
    let block_id = block.id().to_string();
    println!("Hospital registration published to IOTA blockchain: {}", block_id);
    
    // Save to local database for caching
    save_to_local_db(&hospital, &block_id)?;
    
    // Output block ID
    println!("{}", block_id);
    
    Ok(())
}

// Save to local database for caching
fn save_to_local_db(hospital: &HospitalRegistration, block_id: &str) -> Result<()> {
    // Add metadata including block ID
    let stored_hospital = HospitalWithBlock {
        hospital: hospital.clone(),
        block_id: block_id.to_string(),
        timestamp: hospital.timestamp.clone(),
    };

    // Read existing hospitals if the file exists
    let mut hospitals: Vec<HospitalWithBlock> = if Path::new(DB_FILE).exists() {
        let file = File::open(DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_hospitals) => existing_hospitals,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Check if updating an existing hospital
    let mut updated = false;
    for existing in hospitals.iter_mut() {
        if existing.hospital.hospital_id == hospital.hospital_id {
            *existing = stored_hospital.clone();
            updated = true;
            break;
        }
    }
    
    // Add new hospital if not updating
    if !updated {
        hospitals.push(stored_hospital);
    }
    
    // Write the updated hospitals back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &hospitals)?;
    println!("Hospital saved to local database");
    
    Ok(())
}

// Structure to store in the database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct HospitalWithBlock {
    hospital: HospitalRegistration,
    block_id: String,
    timestamp: String,
}