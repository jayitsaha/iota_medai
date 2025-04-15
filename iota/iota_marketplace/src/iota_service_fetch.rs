use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io; // Removed unused Read import
use std::collections::HashMap;

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

#[derive(Serialize, Deserialize, Debug)]
struct BlockchainService {
    service_id: String,
    provider_id: String,
    title: String,
    category: String,
    description: String,
    price: u32,
    provider_credentials: String,
    verification_status: String,
    timestamp: String,
    transaction_id: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Check if specific parameters are provided (provider_id, category, etc.)
    let provider_id = if let Some(arg) = env::args().nth(1) {
        Some(arg)
    } else {
        None
    };
    
    let category = if let Some(arg) = env::args().nth(2) {
        Some(arg)
    } else {
        None
    };
    
    println!("Fetching services from IOTA tangle...");
    if let Some(pid) = &provider_id {
        println!("Filtering by provider ID: {}", pid);
    }
    if let Some(cat) = &category {
        println!("Filtering by category: {}", cat);
    }
    
    // Set up IOTA client
    let client = Client::builder()
    .with_node("https://api.testnet.iotaledger.net")?  // Use IOTA testnet only
    .with_ignore_node_health() // Bypass health check
    .finish()?;
    
    println!("IOTA client initialized successfully");
    
    // Direct blockchain search
    println!("Searching blockchain for services...");
    
    // Since direct tag search is limited in this client version,
    // we'll use a more manual approach with available API methods
    
    // Get recent blocks
    let block_ids = get_recent_blocks(&client).await?;
    println!("Fetched {} blocks to search", block_ids.len());
    
    // Map to store services with transaction ID
    let mut services_map: HashMap<String, (ServiceRegistration, String)> = HashMap::new();
    
    // Search through blocks for services
    for block_id_str in block_ids {
        // Convert String to BlockId
        let block_id = block_id_str.parse::<iota_client::block::BlockId>()?;
        
        // Get the block
        let block = client.get_block(&block_id).await?;
        
        // Check if it has a payload
        if let Some(payload) = block.payload() {
            // Extract data and tag if available
            let (data, tag) = extract_tagged_data(payload);
            
            // Check if this block has our tag
            if tag.as_deref() == Some("HEALTHCARE_SERVICE_REGISTRY") {
                // Try to parse the data as a service registration
                if let Some(data_bytes) = data {
                    if let Ok(data_str) = std::str::from_utf8(&data_bytes) {
                        if let Ok(service) = serde_json::from_str::<ServiceRegistration>(data_str) {
                            // Apply filters if provided
                            if let Some(pid) = &provider_id {
                                if service.provider_id != *pid {
                                    continue;
                                }
                            }
                            
                            if let Some(cat) = &category {
                                if service.category != *cat {
                                    continue;
                                }
                            }
                            
                            // If we already have this service, keep the latest version
                            if let Some((existing_service, _)) = services_map.get(&service.service_id) {
                                if existing_service.timestamp < service.timestamp {
                                    services_map.insert(service.service_id.clone(), (service, block_id.to_string()));
                                }
                            } else {
                                services_map.insert(service.service_id.clone(), (service, block_id.to_string()));
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Convert to vector and format for output
    let services: Vec<BlockchainService> = services_map
        .into_iter()
        .map(|(_, (service, tx_id))| {
            BlockchainService {
                service_id: service.service_id,
                provider_id: service.provider_id,
                title: service.title,
                category: service.category,
                description: service.description,
                price: service.price,
                provider_credentials: service.provider_credentials,
                verification_status: service.verification_status,
                timestamp: service.timestamp,
                transaction_id: tx_id,
            }
        })
        .collect();
    
    // Sort by timestamp (newest first)
    let mut sorted_services = services;
    sorted_services.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    // Convert to JSON and print
    let json = serde_json::to_string(&sorted_services)?;
    println!("{}", json);
    
    Ok(())
}

// Get recent blocks to search
async fn get_recent_blocks(client: &Client) -> Result<Vec<String>> {
    // Try to get latest blocks using available API methods
    // This is a simplified version - in a production environment, you'd use
    // more sophisticated methods like the MQTT plugin or node APIs
    
    // First get the node info to learn about latest blocks
    let node_info = client.get_info().await?;
    
    // Get block IDs for the most recent blocks
    let mut block_ids = Vec::new();
    
    // Access the latest milestone in the node info
    let latest_milestone_info = &node_info.node_info.status.latest_milestone;
    
    // Access the milestone index field
    let milestone_index = latest_milestone_info.index;
    
    // Get milestone by index instead of creating a MilestoneId directly
    if let Ok(milestone_data) = client.get_milestone_by_index(milestone_index).await {
        // Access the referenced blocks correctly
        let milestone_essence = milestone_data.essence();
        
        // Since parents() returns &Parents directly (not Option<Parents>)
        let parents = milestone_essence.parents();
        for parent in parents.iter() {
            block_ids.push(parent.to_string());
        }
    }
    
    // If we couldn't get blocks from milestone, try other methods
    if block_ids.is_empty() {
        // Try to get some recent blocks using available API methods
        if let Ok(tips) = client.get_tips().await {
            for tip in tips {
                block_ids.push(tip.to_string());
                
                // Try to get parents of this tip to expand search
                if let Ok(block) = client.get_block(&tip).await {
                    // parents() returns &Parents, not Option<Parents>
                    let parents = block.parents();
                    for parent in parents.iter() {
                        block_ids.push(parent.to_string());
                    }
                }
            }
        }
    }
    
    // Deduplicate block IDs
    block_ids.sort();
    block_ids.dedup();
    
    Ok(block_ids)
}

// Extract tagged data from a block payload
fn extract_tagged_data(payload: &iota_client::block::payload::Payload) -> (Option<Vec<u8>>, Option<String>) {
    match payload {
        // Different client versions have different enum variants and structures
        // Try to handle the most common ones
        
        // For IOTA client with TaggedData variant
        iota_client::block::payload::Payload::TaggedData(tagged_data) => {
            // Get the tag as string and data as bytes
            let tag_str = String::from_utf8(tagged_data.tag().to_vec()).ok();
            let data = Some(tagged_data.data().to_vec());
            (data, tag_str)
        },
        
        // For other payload types
        _ => (None, None)
    }
}