use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{File, OpenOptions};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
struct MarketplaceBooking {
    booking_id: String,         // Unique identifier for the booking
    service_id: String,         // Service being booked
    user_id: String,            // User making the booking
    appointment_date: String,   // Scheduled appointment date
    price: u32,                 // Price in MEDAI tokens
    provider_address: String,   // IOTA address of the service provider
    status: String,             // "Scheduled", "Completed", "Cancelled"
    timestamp: String,          // Booking creation timestamp
}

// The record structure as stored in our local database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct StoredMarketplaceBooking {
    id: String,                 // IOTA block ID
    booking_id: String,         // Unique identifier for the booking
    service_id: String,         // Service being booked
    user_id: String,            // User making the booking
    appointment_date: String,   // Scheduled appointment date
    price: u32,                 // Price in MEDAI tokens
    provider_address: String,   // IOTA address of the service provider
    status: String,             // "Scheduled", "Completed", "Cancelled"
    timestamp: String,          // Booking creation timestamp
}

// Local database file path
const DB_FILE: &str = "marketplace_bookings.json";

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Check if data is passed as an argument or should be read from stdin
    let data = if let Some(arg) = env::args().nth(1) {
        // Check if argument looks like a file path
        if Path::new(&arg).exists() {
            // Read from file
            println!("Reading JSON from file: {}", arg);
            let mut file = File::open(&arg)?;
            let mut buffer = String::new();
            file.read_to_string(&mut buffer)?;
            buffer
        } else {
            // Treat as raw JSON data
            arg
        }
    } else {
        // Read from stdin if no argument provided
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        buffer
    };
    
    // Parse the JSON input
    println!("Parsing JSON data: {}", data);
    let booking: MarketplaceBooking = serde_json::from_str(&data)?;
    println!("Received marketplace booking data: {:?}", booking);
    
    // Set up IOTA client - USING ONLY IOTA TESTNET NODES
    println!("Initializing IOTA client...");
    let client = Client::builder()
        .with_node("https://api.testnet.iotaledger.net")?  // Use IOTA testnet only
        .with_ignore_node_health() // Bypass health check
        .finish()?;
    
    println!("IOTA client initialized successfully");
    
    // Serialize to JSON
    let data_json = serde_json::to_string(&booking)?;
    
    // Create a TaggedData transaction with a unique tag for marketplace bookings
    println!("Submitting marketplace booking to IOTA tangle...");
    let block = client.block()
        .with_tag("HEALTHCARE_MARKETPLACE".as_bytes().to_vec())
        .with_data(data_json.as_bytes().to_vec())
        .finish()
        .await?;
    
    let block_id = block.id();
    
    // Also save to local database for faster retrieval
    println!("Saving marketplace booking to local database...");
    
    // Create a stored record with the block ID
    let stored_booking = StoredMarketplaceBooking {
        id: block_id.to_string(),
        booking_id: booking.booking_id,
        service_id: booking.service_id,
        user_id: booking.user_id,
        appointment_date: booking.appointment_date,
        price: booking.price,
        provider_address: booking.provider_address,
        status: booking.status,
        timestamp: booking.timestamp,
    };
    
    // Add to local database
    save_to_local_db(&stored_booking)?;
    
    // Output the block ID to stdout for the Node.js server
    println!("Marketplace booking transaction published successfully!");
    println!("{}", block_id);
    
    Ok(())
}

// Function to save a booking to our local database
fn save_to_local_db(new_booking: &StoredMarketplaceBooking) -> Result<()> {
    // Read existing bookings if the file exists
    let mut bookings: Vec<StoredMarketplaceBooking> = if Path::new(DB_FILE).exists() {
        let file = File::open(DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_bookings) => existing_bookings,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Add the new booking
    bookings.push(new_booking.clone());
    
    // Write the updated bookings back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &bookings)?;
    println!("Marketplace booking saved to local database");
    
    Ok(())
}