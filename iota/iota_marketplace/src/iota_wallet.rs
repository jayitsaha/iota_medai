use anyhow::{Result, anyhow};
use iota_wallet::{
    account_manager::AccountManager,
    ClientOptions,
    secret::{stronghold::StrongholdSecretManager, SecretManager},
    AddressWithAmount,
};
use serde::{Serialize, Deserialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

// Paths for storage
const WALLET_DB_PATH: &str = "./wallet_database";
const STRONGHOLD_PATH: &str = "./wallet_stronghold";
const PASSWORD: &str = "your_secure_password"; // Change this in production!

// Coin type constants
const IOTA_COIN_TYPE: u32 = 4218; // This is for IOTA, not Shimmer
const SHIMMER_COIN_TYPE: u32 = 4219; // For reference

// Command line arguments
#[derive(Debug)]
enum WalletCmd {
    Create(String),     // wallet_id (mnemonic is generated)
    Balance(String),    // wallet_id
    Address(String),    // wallet_id
    Transfer(String, String, u64), // wallet_id, recipient_address, amount
}

// Response data structures
#[derive(Serialize, Deserialize, Debug)]
struct WalletResponse {
    wallet_id: String,
    address: String,
    balance: u64,
    mnemonic: Option<String>, // Only included in creation response
}

#[derive(Serialize, Deserialize, Debug)]
struct BalanceResponse {
    wallet_id: String,
    balance: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct AddressResponse {
    wallet_id: String,
    address: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct TransferResponse {
    wallet_id: String,
    transaction_id: String,
    amount: u64,
    recipient: String,
    block_id: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage:");
        eprintln!("  {} create <wallet_id>", args[0]);
        eprintln!("  {} balance <wallet_id>", args[0]);
        eprintln!("  {} address <wallet_id>", args[0]);
        eprintln!("  {} transfer <wallet_id> <recipient_address> <amount>", args[0]);
        return Err(anyhow!("Invalid arguments"));
    }
    
    let command = match args[1].as_str() {
        "create" => {
            if args.len() < 3 {
                return Err(anyhow!("Missing wallet_id for create command"));
            }
            WalletCmd::Create(args[2].clone())
        },
        "balance" => {
            if args.len() < 3 {
                return Err(anyhow!("Missing wallet_id for balance command"));
            }
            WalletCmd::Balance(args[2].clone())
        },
        "address" => {
            if args.len() < 3 {
                return Err(anyhow!("Missing wallet_id for address command"));
            }
            WalletCmd::Address(args[2].clone())
        },
        "transfer" => {
            if args.len() < 5 {
                return Err(anyhow!("Missing parameters for transfer command"));
            }
            let amount = args[4].parse::<u64>().map_err(|_| {
                anyhow!("Invalid amount")
            })?;
            WalletCmd::Transfer(args[2].clone(), args[3].clone(), amount)
        },
        _ => return Err(anyhow!("Unknown command: {}", args[1])),
    };
    
    match command {
        WalletCmd::Create(wallet_id) => {
            create_wallet(&wallet_id).await?;
        },
        WalletCmd::Balance(wallet_id) => {
            get_balance(&wallet_id).await?;
        },
        WalletCmd::Address(wallet_id) => {
            get_address(&wallet_id).await?;
        },
        WalletCmd::Transfer(wallet_id, recipient, amount) => {
            transfer_tokens(&wallet_id, &recipient, amount).await?;
        },
    }
    
    Ok(())
}

// Clean the database directory to avoid conflicts
fn clean_wallet_database() -> Result<()> {
    if Path::new(WALLET_DB_PATH).exists() {
        // Remove the entire directory and recreate it
        fs::remove_dir_all(WALLET_DB_PATH).map_err(|e| anyhow!("Failed to remove wallet database: {}", e))?;
    }
    
    // Create the directory
    fs::create_dir_all(WALLET_DB_PATH).map_err(|e| anyhow!("Failed to create wallet database directory: {}", e))?;
    
    Ok(())
}

// Create client options for connecting to the IOTA testnet
fn create_client_options() -> Result<iota_wallet::ClientOptions> {
    // IMPORTANT: Using only IOTA testnet nodes
    let options = ClientOptions::new()
        // Pure IOTA testnet nodes
        .with_node("https://api.testnet.iota.org")?
        .with_node("https://api.lb-0.testnet.chrysalis2.com")?
        .with_node("https://api.lb-1.testnet.chrysalis2.com")?
        // Longer timeouts for better reliability
        .with_api_timeout(Duration::from_secs(30))
        .with_node_sync_interval(Duration::from_secs(60))
        .with_local_pow(true);
    
    println!("Using IOTA testnet nodes");
    
    Ok(options)
}

// Create a new wallet with a generated mnemonic
async fn create_wallet(wallet_id: &str) -> Result<()> {
    println!("Creating IOTA testnet wallet with ID: {}", wallet_id);
    println!("Using IOTA coin type: {}", IOTA_COIN_TYPE);
    
    // First clean the database to avoid conflicts
    clean_wallet_database()?;
    
    // Ensure stronghold directory exists
    fs::create_dir_all(STRONGHOLD_PATH).map_err(|e| anyhow!("Failed to create stronghold directory: {}", e))?;
    
    // Create stronghold path for this wallet
    let stronghold_path = PathBuf::from(format!("{}/{}.stronghold", STRONGHOLD_PATH, wallet_id));
    
    // Remove existing stronghold file if it exists
    if stronghold_path.exists() {
        fs::remove_file(&stronghold_path).map_err(|e| anyhow!("Failed to remove existing stronghold file: {}", e))?;
    }
    
    // Create the stronghold secret manager
    let stronghold_secret_manager = StrongholdSecretManager::builder()
        .password(PASSWORD)
        .build(stronghold_path)?;
    
    // Create client options
    let client_options = create_client_options()?;
    println!("Created client options for IOTA testnet");
    
    // Create the account manager with the secret manager
    let manager = AccountManager::builder()
        .with_secret_manager(SecretManager::Stronghold(stronghold_secret_manager))
        .with_client_options(client_options)
        .with_storage_path(WALLET_DB_PATH)
        .with_coin_type(IOTA_COIN_TYPE) // Using IOTA coin type (not Shimmer)
        .finish()
        .await?;
    
    println!("Account manager created with IOTA coin type {}", IOTA_COIN_TYPE);
    
    // Generate mnemonic
    let mnemonic = manager.generate_mnemonic()
        .map_err(|e| anyhow!("Failed to generate mnemonic: {}", e))?;
    
    // Set the stronghold password
    manager.set_stronghold_password(PASSWORD)
        .await
        .map_err(|e| anyhow!("Failed to set stronghold password: {}", e))?;
    
    // Store mnemonic
    manager.store_mnemonic(mnemonic.clone())
        .await
        .map_err(|e| anyhow!("Failed to store mnemonic: {}", e))?;
    
    // Create a new account using the wallet_id as an alias
    println!("Creating account for IOTA testnet");
    let account = manager
        .create_account()
        .with_alias(wallet_id.to_string())
        .finish()
        .await
        .map_err(|e| anyhow!("Failed to create account: {}", e))?;
    
    println!("Account created for IOTA network");
    
    // Generate a new address
    println!("Generating address for IOTA testnet");
    let addresses = account.generate_addresses(1, None)
        .await
        .map_err(|e| anyhow!("Failed to generate address: {}", e))?;
    
    if addresses.is_empty() {
        return Err(anyhow!("Failed to generate a new address"));
    }
    
    let address = addresses[0].address().to_bech32();
    
    // IOTA testnet addresses might start with "atoi"
    println!("Generated address: {}", address);
    
    // Remove the problematic calls and just print the address string format
    println!("Address Bech32 representation: {}", address);
    
    // Create wallet response
    let response = WalletResponse {
        wallet_id: wallet_id.to_string(),
        address,
        balance: 0, // Initial balance
        mnemonic: Some(mnemonic), // Include mnemonic in creation response
    };
    
    // Output as JSON
    println!("{}", serde_json::to_string(&response)
        .map_err(|e| anyhow!("Failed to serialize response: {}", e))?);
    
    Ok(())
}

// Get wallet balance
async fn get_balance(wallet_id: &str) -> Result<()> {
    println!("Getting balance for IOTA testnet wallet ID: {}", wallet_id);
    
    // Check if the stronghold file exists
    let stronghold_path = PathBuf::from(format!("{}/{}.stronghold", STRONGHOLD_PATH, wallet_id));
    if !stronghold_path.exists() {
        return Err(anyhow!("Stronghold file not found for wallet: {}", wallet_id));
    }
    
    // Create the stronghold secret manager
    let stronghold_secret_manager = StrongholdSecretManager::builder()
        .password(PASSWORD)
        .build(stronghold_path)?;
    
    // Create client options
    let client_options = create_client_options()?;
    
    // Create the account manager with the secret manager
    let manager = AccountManager::builder()
        .with_secret_manager(SecretManager::Stronghold(stronghold_secret_manager))
        .with_client_options(client_options)
        .with_storage_path(WALLET_DB_PATH)
        .with_coin_type(IOTA_COIN_TYPE) // Use IOTA coin type
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
    
    // Sync account to get latest balance
    let balance = account.sync(None)
        .await
        .map_err(|e| anyhow!("Failed to sync account: {}", e))?;
    
    // Convert balance to JSON string for easier parsing
    let balance_json = serde_json::to_string(&balance)?;
    let balance_value: serde_json::Value = serde_json::from_str(&balance_json)?;
    
    // Extract available balance
    let available_balance = if let Some(base_coin) = balance_value.get("baseCoin") {
        if let Some(available) = base_coin.get("available") {
            available.as_u64().unwrap_or(0)
        } else {
            0
        }
    } else {
        0
    };
    
    // Create balance response
    let response = BalanceResponse {
        wallet_id: wallet_id.to_string(),
        balance: available_balance,
    };
    
    // Output as JSON
    println!("{}", serde_json::to_string(&response)
        .map_err(|e| anyhow!("Failed to serialize response: {}", e))?);
    
    Ok(())
}

// Get wallet address
async fn get_address(wallet_id: &str) -> Result<()> {
    println!("Getting address for IOTA testnet wallet ID: {}", wallet_id);
    
    // Check if the stronghold file exists
    let stronghold_path = PathBuf::from(format!("{}/{}.stronghold", STRONGHOLD_PATH, wallet_id));
    if !stronghold_path.exists() {
        return Err(anyhow!("Stronghold file not found for wallet: {}", wallet_id));
    }
    
    // Create the stronghold secret manager with timeout
    let stronghold_secret_manager = StrongholdSecretManager::builder()
        .password(PASSWORD)
        .timeout(std::time::Duration::from_secs(10)) // Longer timeout
        .build(stronghold_path)?;
    
    // Create client options with longer timeout
    let client_options = create_client_options()?;
    
    // Create the account manager with the secret manager
    let manager = AccountManager::builder()
        .with_secret_manager(SecretManager::Stronghold(stronghold_secret_manager))
        .with_client_options(client_options)
        .with_storage_path(WALLET_DB_PATH)
        .with_coin_type(IOTA_COIN_TYPE) // Use IOTA coin type
        .finish()
        .await?;
    
    println!("Created account manager with IOTA coin type {} for testnet", IOTA_COIN_TYPE);
    
    // Set the stronghold password with longer timeout
    match tokio::time::timeout(Duration::from_secs(15), manager.set_stronghold_password(PASSWORD)).await {
        Ok(result) => result.map_err(|e| anyhow!("Failed to set stronghold password: {}", e))?,
        Err(_) => return Err(anyhow!("Timeout setting stronghold password")),
    };
    
    // Get account by wallet ID with timeout
    let account = match tokio::time::timeout(Duration::from_secs(15), manager.get_account(wallet_id)).await {
        Ok(result) => result.map_err(|e| anyhow!("Failed to get account: {}", e))?,
        Err(_) => return Err(anyhow!("Timeout getting account")),
    };
    
    // Get existing addresses or generate a new one
    let addresses = match tokio::time::timeout(Duration::from_secs(15), account.addresses()).await {
        Ok(result) => result.map_err(|e| anyhow!("Failed to get addresses: {}", e))?,
        Err(_) => return Err(anyhow!("Timeout getting addresses")),
    };
    
    let address = if addresses.is_empty() {
        // Generate a new address if none exist
        let new_addresses = match tokio::time::timeout(Duration::from_secs(15), account.generate_addresses(1, None)).await {
            Ok(result) => result.map_err(|e| anyhow!("Failed to generate address: {}", e))?,
            Err(_) => return Err(anyhow!("Timeout generating new address")),
        };
        
        if new_addresses.is_empty() {
            return Err(anyhow!("Failed to generate a new address"));
        }
        
        new_addresses[0].address().to_bech32()
    } else {
        addresses[0].address().to_bech32()
    };
    
    // Print address details
    println!("Retrieved address: {}", address);
    
    // Create address response
    let response = AddressResponse {
        wallet_id: wallet_id.to_string(),
        address,
    };
    
    // Output as JSON
    println!("{}", serde_json::to_string(&response)
        .map_err(|e| anyhow!("Failed to serialize response: {}", e))?);
    
    Ok(())
}

// Transfer tokens to another address
async fn transfer_tokens(wallet_id: &str, recipient_address: &str, amount: u64) -> Result<()> {
    println!("Transferring {} tokens from IOTA testnet wallet {} to {}", amount, wallet_id, recipient_address);
    
    // Check if the stronghold file exists
    let stronghold_path = PathBuf::from(format!("{}/{}.stronghold", STRONGHOLD_PATH, wallet_id));
    if !stronghold_path.exists() {
        return Err(anyhow!("Stronghold file not found for wallet: {}", wallet_id));
    }
    
    // Create the stronghold secret manager
    let stronghold_secret_manager = StrongholdSecretManager::builder()
        .password(PASSWORD)
        .build(stronghold_path)?;
    
    // Create client options
    let client_options = create_client_options()?;
    
    // Create the account manager with the secret manager
    let manager = AccountManager::builder()
        .with_secret_manager(SecretManager::Stronghold(stronghold_secret_manager))
        .with_client_options(client_options)
        .with_storage_path(WALLET_DB_PATH)
        .with_coin_type(IOTA_COIN_TYPE) // Use IOTA coin type
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
    
    // Sync account to get latest balance
    let balance = account.sync(None)
        .await
        .map_err(|e| anyhow!("Failed to sync account: {}", e))?;
    
    // Convert balance to JSON string for easier parsing
    let balance_json = serde_json::to_string(&balance)?;
    let balance_value: serde_json::Value = serde_json::from_str(&balance_json)?;
    
    // Extract available balance
    let available_balance = if let Some(base_coin) = balance_value.get("baseCoin") {
        if let Some(available) = base_coin.get("available") {
            available.as_u64().unwrap_or(0)
        } else {
            0
        }
    } else {
        0
    };
    
    // Check if enough balance
    if available_balance < amount {
        return Err(anyhow!(
            "Insufficient balance: {} < {}", 
            available_balance, 
            amount
        ));
    }
    
    println!("Attempting to transfer tokens...");
    
    // Use the simplified send_amount API
    let outputs = vec![AddressWithAmount {
        address: recipient_address.to_string(),
        amount,
    }];
    
    let transaction = account.send_amount(outputs, None)
        .await
        .map_err(|e| anyhow!("Failed to send tokens: {}", e))?;
    
    // Get transaction ID and block ID if available
    let transaction_id = transaction.transaction_id.to_string();
    let block_id = transaction.block_id.map(|id| id.to_string());
    
    // Create transfer response
    let response = TransferResponse {
        wallet_id: wallet_id.to_string(),
        transaction_id,
        amount,
        recipient: recipient_address.to_string(),
        block_id,
    };
    
    // Output as JSON
    println!("{}", serde_json::to_string(&response)
        .map_err(|e| anyhow!("Failed to serialize response: {}", e))?);
    
    Ok(())
}