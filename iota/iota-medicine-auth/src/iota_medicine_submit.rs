use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{File, OpenOptions};
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
    let medicine: MedicineRecord = serde_json::from_str(&data)?;
    println!("Received medicine data: {:?}", medicine);
    
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
    let data_json = serde_json::to_string(&medicine)?;
    
    // Create a TaggedData transaction
    println!("Submitting medicine data to IOTA tangle...");
    let block = client.block()
        .with_tag("MEDICINE_AUTH_REGISTRY".as_bytes().to_vec())
        .with_data(data_json.as_bytes().to_vec())
        .finish()
        .await?;
    
    let block_id = block.id();
    
    // Also save to local database for faster retrieval
    println!("Saving medicine record to local database...");
    
    // Create a stored record with the block ID
    let stored_record = StoredMedicineRecord {
        id: block_id.to_string(),
        serial_number: medicine.serial_number,
        name: medicine.name,
        manufacturer: medicine.manufacturer,
        batch_number: medicine.batch_number,
        production_date: medicine.production_date,
        expiration_date: medicine.expiration_date,
        status: medicine.status,
        activation_timestamp: medicine.activation_timestamp,
        timestamp: medicine.timestamp,
    };
    
    // Add to local database
    save_to_local_db(&stored_record)?;
    
    // Output just the block ID to stdout for the Node.js server
    println!("Medicine transaction published successfully!");
    println!("{}", block_id);
    
    Ok(())
}

// Function to save a record to our local database
fn save_to_local_db(new_record: &StoredMedicineRecord) -> Result<()> {
    // Read existing records if the file exists
    let mut records = if Path::new(MEDICINE_DB_FILE).exists() {
        let file = File::open(MEDICINE_DB_FILE)?;
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
        .open(MEDICINE_DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &records)?;
    println!("Medicine record saved to local database");
    
    Ok(())
}