use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{File, OpenOptions};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ServiceRegistration {
    service_id: String,
    provider_id: String,
    title: String,
    category: String, 
    description: String,
    price: u32,
    provider_credentials: String,
    verification_status: String,
    timestamp: String,
}

// Local database file path
const DB_FILE: &str = "blockchain_services.json";

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
    let service: ServiceRegistration = match serde_json::from_str(&data) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Error parsing JSON: {}", e);
            eprintln!("Input data was: {}", data);
            return Err(anyhow::anyhow!("Failed to parse JSON: {}", e));
        }
    };
    
    println!("Received service registration: {:?}", service);
    
    // Set up IOTA client
    let client = Client::builder()
    .with_node("https://api.testnet.iotaledger.net")?  // Use IOTA testnet only
    .with_ignore_node_health() // Bypass health check
    .finish()?;
    
    // Serialize to JSON
    let data_json = serde_json::to_string(&service)?;
    
    // Create a tagged data payload
    let tag = "HEALTHCARE_SERVICE_REGISTRY".as_bytes().to_vec();
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
    println!("Service registration published to IOTA blockchain: {}", block_id);
    
    // Save to local database for caching
    save_to_local_db(&service, &block_id)?;
    
    // Output block ID
    println!("{}", block_id);
    
    Ok(())
}

// Save to local database for caching
fn save_to_local_db(service: &ServiceRegistration, _block_id: &str) -> Result<()> {
    // Read existing services if the file exists
    let mut services: Vec<ServiceRegistration> = if Path::new(DB_FILE).exists() {
        let file = File::open(DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_services) => existing_services,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Add the new service
    services.push(service.clone());
    
    // Write the updated services back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &services)?;
    println!("Service saved to local database");
    
    Ok(())
}