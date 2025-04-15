use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{File, OpenOptions};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct AmbulanceRegistration {
    ambulance_id: String,
    hospital_id: String,
    registration_number: String,
    vehicle_type: String,  // Basic, Advanced Life Support, etc.
    capacity: u32,
    equipment: Vec<String>,
    current_status: String, // Available, Dispatched, Maintenance
    current_location: Option<Location>,
    last_updated: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Location {
    latitude: f64,
    longitude: f64,
}

// Local database file path
const DB_FILE: &str = "blockchain_ambulances.json";

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
    let ambulance: AmbulanceRegistration = match serde_json::from_str(&data) {
        Ok(a) => a,
        Err(e) => {
            eprintln!("Error parsing JSON: {}", e);
            eprintln!("Input data was: {}", data);
            return Err(anyhow::anyhow!("Failed to parse JSON: {}", e));
        }
    };
    
    println!("Received ambulance registration: {:?}", ambulance);
    
    // Set up IOTA client
    let client = Client::builder()
    .with_node("https://api.testnet.iotaledger.net")?  // Use IOTA testnet only
    .with_ignore_node_health() // Bypass health check
    .finish()?;
    
    // Serialize to JSON
    let data_json = serde_json::to_string(&ambulance)?;
    
    // Create a tagged data payload
    let tag = "HEALTHCARE_AMBULANCE_REGISTRY".as_bytes().to_vec();
    let data = data_json.as_bytes().to_vec();
    
    // Submit data to the blockchain
    let block = client.block()
        .with_tag(tag)
        .with_data(data)
        .finish()
        .await?;
    
    // Get the block ID
    let block_id = block.id().to_string();
    println!("Ambulance registration published to IOTA blockchain: {}", block_id);
    
    // Save to local database for caching
    save_to_local_db(&ambulance, &block_id)?;
    
    // Output block ID
    println!("{}", block_id);
    
    Ok(())
}

// Save to local database for caching
fn save_to_local_db(ambulance: &AmbulanceRegistration, block_id: &str) -> Result<()> {
    // Add metadata including block ID
    let stored_ambulance = AmbulanceWithBlock {
        ambulance: ambulance.clone(),
        block_id: block_id.to_string(),
        timestamp: ambulance.last_updated.clone(),
    };

    // Read existing ambulances if the file exists
    let mut ambulances: Vec<AmbulanceWithBlock> = if Path::new(DB_FILE).exists() {
        let file = File::open(DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_ambulances) => existing_ambulances,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Check if updating an existing ambulance
    let mut updated = false;
    for existing in ambulances.iter_mut() {
        if existing.ambulance.ambulance_id == ambulance.ambulance_id {
            *existing = stored_ambulance.clone();
            updated = true;
            break;
        }
    }
    
    // Add new ambulance if not updating
    if !updated {
        ambulances.push(stored_ambulance);
    }
    
    // Write the updated ambulances back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &ambulances)?;
    println!("Ambulance saved to local database");
    
    Ok(())
}

// Structure to store in the database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct AmbulanceWithBlock {
    ambulance: AmbulanceRegistration,
    block_id: String,
    timestamp: String,
}