use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{File, OpenOptions};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
struct MarketplacePayment {
    payment_id: String,         // Unique identifier for the payment
    booking_id: String,         // Associated booking
    sender_id: String,          // User making the payment
    sender_address: String,     // IOTA address of the sender
    recipient_address: String,  // IOTA address of the recipient (provider)
    amount: u32,                // Amount in MEDAI tokens
    status: String,             // "pending", "confirmed", "failed"
    timestamp: String,          // Payment timestamp
}

// The record structure as stored in our local database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct StoredMarketplacePayment {
    id: String,                 // IOTA block ID
    payment_id: String,         // Unique identifier for the payment
    booking_id: String,         // Associated booking
    sender_id: String,          // User making the payment
    sender_address: String,     // IOTA address of the sender
    recipient_address: String,  // IOTA address of the recipient (provider)
    amount: u32,                // Amount in MEDAI tokens
    status: String,             // "pending", "confirmed", "failed"
    timestamp: String,          // Payment timestamp
}

// Local database file path
const DB_FILE: &str = "marketplace_payments.json";

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
    let payment: MarketplacePayment = serde_json::from_str(&data)?;
    println!("Received marketplace payment data: {:?}", payment);
    
    // Set up IOTA client - USING ONLY IOTA TESTNET NODES
    println!("Initializing IOTA client...");
    let client = Client::builder()
        .with_node("https://api.testnet.iotaledger.net")?  // Use IOTA testnet only
        .with_ignore_node_health() // Bypass health check
        .finish()?;
    
    println!("IOTA client initialized successfully");
    
    // Serialize to JSON
    let data_json = serde_json::to_string(&payment)?;
    
    // Create a TaggedData transaction with a unique tag for marketplace payments
    println!("Submitting marketplace payment to IOTA tangle...");
    let block = client.block()
        .with_tag("HEALTHCARE_MARKETPLACE_PAYMENT".as_bytes().to_vec())
        .with_data(data_json.as_bytes().to_vec())
        .finish()
        .await?;
    
    let block_id = block.id();
    
    // Also save to local database for faster retrieval
    println!("Saving marketplace payment to local database...");
    
    // Create a stored record with the block ID
    let stored_payment = StoredMarketplacePayment {
        id: block_id.to_string(),
        payment_id: payment.payment_id,
        booking_id: payment.booking_id,
        sender_id: payment.sender_id,
        sender_address: payment.sender_address,
        recipient_address: payment.recipient_address,
        amount: payment.amount,
        status: payment.status,
        timestamp: payment.timestamp,
    };
    
    // Add to local database
    save_to_local_db(&stored_payment)?;
    
    // Output the block ID to stdout for the Node.js server
    println!("Marketplace payment transaction published successfully!");
    println!("{}", block_id);
    
    Ok(())
}

// Function to save a payment to our local database
fn save_to_local_db(new_payment: &StoredMarketplacePayment) -> Result<()> {
    // Read existing payments if the file exists
    let mut payments: Vec<StoredMarketplacePayment> = if Path::new(DB_FILE).exists() {
        let file = File::open(DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_payments) => existing_payments,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Add the new payment
    payments.push(new_payment.clone());
    
    // Write the updated payments back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &payments)?;
    println!("Marketplace payment saved to local database");
    
    Ok(())
}