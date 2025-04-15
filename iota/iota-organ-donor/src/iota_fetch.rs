use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::fs::{File, OpenOptions};
use std::path::Path;
use std::io;

// The record structure as stored in our local database
#[derive(Serialize, Deserialize, Debug, Clone)]
struct StoredRecord {
    id: String,
    donor_id: String,
    organ_type: String,
    status: String,
    timestamp: String,
}

// The record structure from the IOTA tangle
#[derive(Serialize, Deserialize, Debug)]
struct OrganRecord {
    donor_id: String,
    organ_type: String,
    status: String,
    timestamp: String,
}

// Local database file path (fallback for when tangle search fails)
const DB_FILE: &str = "organ_records.json";

// Our tag
const TAG: &str = "ORGAN_DONOR_REGISTRY";

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Get the records (first try tangle, then fall back to local)
    let records = match fetch_from_tangle().await {
        Ok(tangle_records) => {
            println!("Successfully fetched {} records from the tangle", tangle_records.len());
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
    
    // Output as JSON for Node.js to read
    let json = serde_json::to_string(&records)?;
    println!("{}", json);
    
    Ok(())
}

async fn fetch_from_tangle() -> Result<Vec<StoredRecord>> {
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
    
    // Print out the client and node version
    match client.get_info().await {
        Ok(info) => {
            // println!("Connected to node: {}", info.node_info.url);
            println!("Node version: {}", info.node_info.version);
        },
        Err(e) => {
            println!("Could not get node info: {}", e);
            println!("Continuing anyway...");
        }
    }
    
    // IMPORTANT: Tag must be encoded the same way when submitting and retrieving
    println!("Our tag is: {}", TAG);
    
    // Debug: Print tag bytes to see the exact encoding
    let tag_bytes = TAG.as_bytes().to_vec();
    println!("Tag bytes: {:?}", tag_bytes);
    let tag_hex = hex::encode(&tag_bytes);
    println!("Tag as hex: {}", tag_hex);
    
    // Search approach
    // The IOTA client API doesn't have a direct "search by tag" method
    // We'll need to try several approaches
    
    println!("Approach 1: Getting recent blocks and filtering...");
    
    // Get some tip blocks to check
    // IMPORTANT: This will only find very recent submissions!
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
                    println!("Block has payload, checking type...");
                    
                    // Check if it's tagged data
                    if let iota_client::block::payload::Payload::TaggedData(tagged_data) = payload {
                        println!("Found TaggedData payload");
                        
                        // Debug: Print the tag to compare with ours
                        let block_tag_bytes = tagged_data.tag();
                        println!("Block tag bytes: {:?}", block_tag_bytes);
                        
                        let block_tag_hex = hex::encode(block_tag_bytes);
                        println!("Block tag as hex: {}", block_tag_hex);
                        
                        // Try to decode tag as UTF-8 for easier comparison
                        match std::str::from_utf8(block_tag_bytes) {
                            Ok(tag_str) => println!("Block tag as string: {}", tag_str),
                            Err(_) => println!("Block tag is not valid UTF-8")
                        }
                        
                        // Compare tags (multiple ways for more reliability)
                        let tags_match = block_tag_bytes == tag_bytes.as_slice() || 
                                         block_tag_hex == tag_hex;
                        
                        println!("Tags match: {}", tags_match);
                        
                        if tags_match {
                            println!("Found matching tag!");
                            
                            // Try to extract the data
                            match std::str::from_utf8(tagged_data.data()) {
                                Ok(data_str) => {
                                    println!("Data: {}", data_str);
                                    
                                    // Parse as JSON
                                    match serde_json::from_str::<OrganRecord>(data_str) {
                                        Ok(record) => {
                                            println!("Successfully parsed record: {:?}", record);
                                            
                                            // Add to results
                                            results.push(StoredRecord {
                                                id: block_id.to_string(),
                                                donor_id: record.donor_id,
                                                organ_type: record.organ_type,
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
                    } else {
                        println!("Not a TaggedData payload");
                    }
                } else {
                    println!("Block has no payload");
                }
            },
            Err(e) => println!("Error fetching block {}: {}", block_id, e)
        }
    }
    
    // Approach 2: Try another API method if available in this client version
    // This is client version specific
    println!("Approach 2: Trying to use advanced search if available...");
    
    // NOTE: Most IOTA clients don't have a built-in "filter by tag" capability
    // Typically, you would need to use a more advanced indexing service
    // But we'll try a direct method if it exists
    
    /*
    // Uncomment and modify if this method exists in your client version
    match client.get_blocks_by_tag(tag_bytes.clone()).await {
        Ok(blocks) => {
            println!("Found {} blocks with tag", blocks.len());
            
            for block_id in blocks {
                // Process as above...
            }
        },
        Err(e) => println!("Error searching by tag: {}", e)
    }
    */
    
    println!("Found {} records on the tangle", results.len());
    
    Ok(results)
}

fn fetch_from_local_db() -> Result<Vec<StoredRecord>> {
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
            let records: Vec<StoredRecord> = records;
            println!("Read {} records from local database", records.len());
            Ok(records)
        },
        Err(e) => {
            println!("Error parsing database file: {}", e);
            Ok(Vec::new())
        }
    }
}

fn update_local_db(records: &[StoredRecord]) -> Result<()> {
    // Create or overwrite file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(DB_FILE)?;
    
    // Write JSON
    serde_json::to_writer_pretty(file, records)?;
    
    println!("Updated local database with {} records", records.len());
    
    Ok(())
}