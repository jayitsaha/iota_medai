use anyhow::{Result, anyhow};
use iota_wallet::{
    account_manager::AccountManager,
    ClientOptions,
    secret::{stronghold::StrongholdSecretManager, SecretManager},
};
use serde::{Serialize, Deserialize};
use std::env;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

// Paths for storage
const WALLET_DB_PATH: &str = "./wallet_database";
const STRONGHOLD_PATH: &str = "./wallet_stronghold";
const PASSWORD: &str = "your_secure_password"; // Change this in production!

// Coin type constants
const SHIMMER_COIN_TYPE: u32 = 4219;

// Response data structures
#[derive(Serialize, Deserialize, Debug)]
struct FaucetResponse {
    wallet_id: String,
    address: String,
    amount: u64,
    transaction_id: String,
    block_id: Option<String>,
    status: String,
    message: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 3 {
        eprintln!("Usage:");
        eprintln!("  {} <wallet_id> <amount>", args[0]);
        return Err(anyhow!("Invalid arguments"));
    }
    
    let wallet_id = args[1].clone();
    let amount = args[2].parse::<u64>().map_err(|_| {
        anyhow!("Invalid amount")
    })?;
    
    println!("Requesting {} tokens for wallet: {}", amount, wallet_id);
    
    // Get wallet address if possible
    let address = match get_wallet_address(&wallet_id).await {
        Ok(addr) => addr,
        Err(e) => {
            println!("Error getting wallet address: {}", e);
            create_offline_response(&wallet_id, amount, format!("Wallet error: {}", e))?;
            return Ok(());
        }
    };
    
    // Try to call faucet
    match call_faucet(&address, amount).await {
        Ok(faucet_id) => {
            // Create success response
            let response = FaucetResponse {
                wallet_id: wallet_id.to_string(),
                address,
                amount,
                transaction_id: faucet_id,
                block_id: None,
                status: "requested".to_string(),
                message: None,
            };
            
            println!("{}", serde_json::to_string(&response)?);
        },
        Err(e) => {
            // Create fallback response
            create_offline_response(&wallet_id, amount, format!("Faucet error: {}", e))?;
        }
    }
    
    Ok(())
}

// Get wallet address
async fn get_wallet_address(wallet_id: &str) -> Result<String> {
    // Check if the stronghold file exists
    let stronghold_path = PathBuf::from(format!("{}/{}.stronghold", STRONGHOLD_PATH, wallet_id));
    if !stronghold_path.exists() {
        return Err(anyhow!("Stronghold file not found for wallet: {}", wallet_id));
    }
    
    // Create the stronghold secret manager
    let stronghold_secret_manager = StrongholdSecretManager::builder()
        .password(PASSWORD)
        .build(stronghold_path)?;
    
    // Create client options with timeout
    let client_options = ClientOptions::new()
        .with_node("https://api.testnet.shimmer.network")?
        .with_node("https://api.testnet.iota.org")?
        .with_node_sync_interval(Duration::from_secs(60))
        .with_api_timeout(Duration::from_secs(10));
    
    // Create the account manager
    let manager = AccountManager::builder()
        .with_secret_manager(SecretManager::Stronghold(stronghold_secret_manager))
        .with_client_options(client_options)
        .with_storage_path(WALLET_DB_PATH)
        .with_coin_type(SHIMMER_COIN_TYPE)
        .finish()
        .await?;
    
    // Set the stronghold password
    manager.set_stronghold_password(PASSWORD)
        .await
        .map_err(|e| anyhow!("Failed to set stronghold password: {}", e))?;
    
    // Get account by wallet ID
    let account = manager.get_account(wallet_id)
        .await
        .map_err(|e| anyhow!("Failed to get account: {}", e))?;
    
    // Get existing addresses
    let addresses = account.addresses()
        .await
        .map_err(|e| anyhow!("Failed to get addresses: {}", e))?;
    
    let address = if addresses.is_empty() {
        // Generate a new address if none exist
        let new_addresses = account.generate_addresses(1, None)
            .await
            .map_err(|e| anyhow!("Failed to generate address: {}", e))?;
        
        if new_addresses.is_empty() {
            return Err(anyhow!("Failed to generate a new address"));
        }
        
        new_addresses[0].address().to_bech32()
    } else {
        addresses[0].address().to_bech32()
    };
    
    println!("Using address: {}", address);
    Ok(address)
}

// Call faucet API
async fn call_faucet(address: &str, _amount: u64) -> Result<String> {
    // Create HTTP client
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;
    
    let faucet_url = "https://faucet.testnet.shimmer.network/api/enqueue";
    
    let payload = serde_json::json!({
        "address": address
    });
    
    println!("Sending request to faucet at {}", faucet_url);
    
    // Send request to faucet
    let response = client.post(faucet_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to request from faucet: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!("Faucet request failed: {}", error_text));
    }
    
    // Parse the response
    let faucet_response = response.json::<serde_json::Value>().await
        .map_err(|e| anyhow!("Failed to parse faucet response: {}", e))?;
    
    // Extract transaction ID
    let tx_id = faucet_response["id"].as_str()
        .ok_or_else(|| anyhow!("No transaction ID in faucet response"))?
        .to_string();
    
    Ok(tx_id)
}

// Create offline fallback response
fn create_offline_response(wallet_id: &str, amount: u64, error_message: String) -> Result<()> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let fallback = FaucetResponse {
        wallet_id: wallet_id.to_string(),
        address: format!("offline_fallback_{}", wallet_id),
        amount,
        transaction_id: format!("offline_fallback_{}", timestamp),
        block_id: None,
        status: "offline_fallback".to_string(),
        message: Some(error_message),
    };
    
    println!("{}", serde_json::to_string(&fallback)?);
    Ok(())
}