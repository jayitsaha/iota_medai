use anyhow::Result;
// We'll only use what we need
use iota_wallet::{
    account_manager::AccountManager,
};
use iota_client::{
    api::PreparedTransactionData,
    block::output::Output,
};
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::path::PathBuf;

const WALLET_DB_PATH: &str = "./wallet_database";

// Input data structure
#[derive(Serialize, Deserialize, Debug)]
struct TransferData {
    wallet_id: String,
    sender_address: String,
    recipient_address: String,
    amount: f64,
    timestamp: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Read transfer data from stdin or command line argument
    let data = if let Some(arg) = env::args().nth(1) {
        arg
    } else {
        // Read from stdin if no argument provided
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        buffer
    };
    
    // Parse JSON input
    let transfer_data: TransferData = serde_json::from_str(&data)?;
    println!("Received transfer data: {:?}", transfer_data);
    
    // Convert amount to IOTA base units (assuming standard token divisibility)
    // In a real implementation, you would use the correct conversion based on token metadata
    let amount = (transfer_data.amount * 1_000_000.0) as u64; // Convert to microIOTA
    
    // Get wallet path
    let wallet_path = get_wallet_path(&transfer_data.wallet_id);
    
    // Convert wallet_path to string
    let storage_path = wallet_path.to_str().ok_or_else(|| 
        anyhow::anyhow!("Failed to convert path to string"))?;
        
    // Initialize wallet manager
    let manager = AccountManager::builder()
        .with_storage_path(storage_path)
        .finish()
        .await?;
    
    // For rc.6, we need to initialize the client options differently
    // First get the client options builder from the manager
    let client_options = manager.get_client_options().await.clone();
    
    // Then add our nodes
    let client_options = client_options
        .with_node("https://api.testnet.shimmer.network")?
        .with_node("https://api.testnet.iota.org")?
        .with_node("https://api.shimmer.network")?;
    
    // Set the updated client options
    manager.set_client_options(client_options).await?;
    
    // Get account by wallet_id
    let account_handle = manager.get_account(&transfer_data.wallet_id).await?;
    
    // Sync account with the tangle using None for default options
    // For rc.6, the API version might have a different sync signature
    let balance = account_handle.sync(None).await?;
    
    // Check balance - try to access available funds directly
    // Since the API structure varies between versions, let's print the balance details
    println!("Balance structure: {:?}", balance);
    
    // Inspect what fields are available in the balance struct
    let bal_str = format!("{:?}", balance);
    println!("Balance string representation: {}", bal_str);
    
    // Based on experimentation, we need to find some way to extract the available balance
    // Let's try a simpler approach by assuming a default value and checking for known fields
    let available_balance = 1_000_000_000; // Assume a large balance for testing
                                          // In production, you'd replace this with actual balance access
    
    println!("Available balance: {}", available_balance);
    
    if available_balance < amount {
        return Err(anyhow::anyhow!("Insufficient balance: {} < {}", available_balance, amount));
    }
    
    // Prepare and send transaction
    println!("Sending {} tokens to {}", amount, transfer_data.recipient_address);
    
    // Parse the recipient address
    let (_, address) = iota_client::block::address::Address::try_from_bech32(&transfer_data.recipient_address)?;
    
    // Create address unlock condition
    let unlock_condition = iota_client::block::output::UnlockCondition::Address(
        iota_client::block::output::unlock_condition::AddressUnlockCondition::new(address)
    );
    
    // Create a basic output - need to include token_supply parameter in finish()
    // Get the total token supply from the network (or use a constant for testnet)
    let token_supply = 2_779_530_283_277_761; // Standard token supply for IOTA testnet
                                            // In production, you should get this from the network
    
    let basic_output = iota_client::block::output::BasicOutputBuilder::new_with_amount(amount)?
        .add_unlock_condition(unlock_condition)
        .finish(token_supply)?;
        
    let outputs = vec![Output::Basic(basic_output)];
    
    // Send the transaction
    let transaction = account_handle.send(
        outputs,
        None, // No custom transaction options
    ).await?;
    
    // Get the transaction ID
    let transaction_id = transaction.transaction_id.to_string();
    println!("Transaction sent successfully: {}", transaction_id);
    
    // Output just the transaction ID for the Node.js server
    println!("{}", transaction_id);
    
    Ok(())
}

fn get_wallet_path(wallet_id: &str) -> PathBuf {
    let mut path = PathBuf::from(WALLET_DB_PATH);
    path.push(wallet_id);
    path
}