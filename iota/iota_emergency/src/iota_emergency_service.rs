use anyhow::Result;
use iota_client::Client;
use serde::{Serialize, Deserialize};
use std::env;
use std::io::{self, Read};
use std::fs::{self, File, OpenOptions};
use std::path::Path;
use std::cmp::Ordering;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct EmergencyRequest {
    request_id: String,
    user_id: String,
    user_location: Location,
    emergency_type: String,  // Medical, Accident, etc.
    timestamp: String,
    status: String,  // Requested, Assigned, Completed, Cancelled
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct EmergencyResponse {
    request_id: String,
    hospital_id: String,
    hospital_name: String,
    ambulance_id: String,
    estimated_arrival_time: u32,  // in minutes
    distance: f64,                // in kilometers
    status: String,
    timestamp: String,
    blockchain_tx_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Location {
    latitude: f64,
    longitude: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Hospital {
    hospital_id: String,
    name: String,
    location: HospitalLocation,
    contact: ContactInfo,
    services: Vec<String>,
    emergency_capacity: u32,
    verification_status: String,
    timestamp: String,
    admin_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct HospitalLocation {
    latitude: f64,
    longitude: f64,
    address: String,
    city: String,
    state: String,
    country: String,
    postal_code: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ContactInfo {
    phone: String,
    email: String,
    website: String,
    emergency_phone: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Ambulance {
    ambulance_id: String,
    hospital_id: String,
    registration_number: String,
    vehicle_type: String,
    capacity: u32,
    equipment: Vec<String>,
    current_status: String,
    current_location: Option<Location>,
    last_updated: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct HospitalWithDistance {
    hospital: Hospital,
    distance: f64,
}

// Database file paths
const HOSPITALS_DB_FILE: &str = "blockchain_hospitals.json";
const AMBULANCES_DB_FILE: &str = "blockchain_ambulances.json";
const EMERGENCY_DB_FILE: &str = "blockchain_emergencies.json";

// Structure for hospital data from local DB file
#[derive(Serialize, Deserialize, Debug, Clone)]
struct HospitalWithBlock {
    hospital: Hospital,
    block_id: String,
    timestamp: String,
}

// Structure for ambulance data from local DB file
#[derive(Serialize, Deserialize, Debug, Clone)]
struct AmbulanceWithBlock {
    ambulance: Ambulance,
    block_id: String,
    timestamp: String,
}

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
    let emergency_request: EmergencyRequest = match serde_json::from_str(&data) {
        Ok(er) => er,
        Err(e) => {
            eprintln!("Error parsing JSON: {}", e);
            eprintln!("Input data was: {}", data);
            return Err(anyhow::anyhow!("Failed to parse JSON: {}", e));
        }
    };
    
    println!("Received emergency request: {:?}", emergency_request);
    
    // 1. Find nearest hospitals
    let nearby_hospitals = find_nearest_hospitals(&emergency_request.user_location, 5)?;
    
    if nearby_hospitals.is_empty() {
        return Err(anyhow::anyhow!("No hospitals found"));
    }
    
    println!("Found {} nearby hospitals", nearby_hospitals.len());
    
    // 2. Find available ambulances for these hospitals
    let mut assigned_ambulance: Option<Ambulance> = None;
    let mut selected_hospital: Option<Hospital> = None;
    let mut min_distance = f64::MAX;
    
    for hospital_with_distance in &nearby_hospitals {
        let available_ambulances = find_available_ambulances(&hospital_with_distance.hospital.hospital_id)?;
        
        if !available_ambulances.is_empty() {
            println!("Found {} available ambulances for hospital {}", 
                     available_ambulances.len(), 
                     hospital_with_distance.hospital.name);
            
            // Select this hospital and first available ambulance if it's the closest so far
            if hospital_with_distance.distance < min_distance {
                min_distance = hospital_with_distance.distance;
                selected_hospital = Some(hospital_with_distance.hospital.clone());
                assigned_ambulance = Some(available_ambulances[0].clone());
            }
        }
    }
    
    if assigned_ambulance.is_none() || selected_hospital.is_none() {
        return Err(anyhow::anyhow!("No available ambulances found"));
    }
    
    let ambulance = assigned_ambulance.unwrap();
    let hospital = selected_hospital.unwrap();
    
    println!("Selected hospital: {} and ambulance: {}", 
             hospital.name, ambulance.registration_number);
    
    // 3. Create emergency response
    let estimated_arrival_time = calculate_eta(&emergency_request.user_location, min_distance);
    
    let mut emergency_response = EmergencyResponse {
        request_id: emergency_request.request_id.clone(),
        hospital_id: hospital.hospital_id.clone(),
        hospital_name: hospital.name.clone(),
        ambulance_id: ambulance.ambulance_id.clone(),
        estimated_arrival_time,
        distance: min_distance,
        status: "Assigned".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        blockchain_tx_id: "".to_string(), // Will be filled after blockchain submission
    };
    
    // 4. Update ambulance status
    let mut updated_ambulance = ambulance.clone();
    updated_ambulance.current_status = "Dispatched".to_string();
    updated_ambulance.last_updated = chrono::Utc::now().to_rfc3339();
    
    // 5. Submit emergency response to blockchain
    // Set up IOTA client
    let client = Client::builder()
        .with_node("https://api.testnet.iotaledger.net")?  // Use IOTA testnet only
        .with_ignore_node_health() // Bypass health check
        .finish()?;
    
    // Serialize to JSON
    let data_json = serde_json::to_string(&emergency_response)?;
    
    // Create a tagged data payload
    let tag = "HEALTHCARE_EMERGENCY_RESPONSE".as_bytes().to_vec();
    let data = data_json.as_bytes().to_vec();
    
    // Submit data to the blockchain
    let block = client.block()
        .with_tag(tag)
        .with_data(data)
        .finish()
        .await?;
    
    // Get the block ID
    let block_id = block.id().to_string();
    println!("Emergency response published to IOTA blockchain: {}", block_id);
    
    // 6. Update emergency response with blockchain tx ID
    emergency_response.blockchain_tx_id = block_id.clone();
    
    // 7. Save to local database
    save_emergency_response(&emergency_response)?;
    
    // 8. Update ambulance status in local DB
    update_ambulance_status(&updated_ambulance, &block_id)?;
    
    // 9. Return final response
    let json_response = serde_json::to_string(&emergency_response)?;
    println!("{}", json_response);
    
    Ok(())
}

// Find nearby hospitals sorted by distance
fn find_nearest_hospitals(location: &Location, limit: usize) -> Result<Vec<HospitalWithDistance>> {
    // Read hospitals from file
    let hospitals: Vec<Hospital> = if Path::new(HOSPITALS_DB_FILE).exists() {
        let file = File::open(HOSPITALS_DB_FILE)?;
        let hospital_with_blocks: Vec<HospitalWithBlock> = serde_json::from_reader(file)?;
        hospital_with_blocks.into_iter().map(|h| h.hospital).collect()
    } else {
        // Try the direct JSON file that might be used by the server
        if Path::new("data/hospitals.json").exists() {
            let file = File::open("data/hospitals.json")?;
            let hospital_records: Vec<HashMap<String, serde_json::Value>> = serde_json::from_reader(file)?;
            
            // Convert these to our Hospital struct format
            hospital_records.into_iter().filter_map(|record| {
                // Try to extract the necessary fields from the JSON record
                let hospital_id = record.get("id")?.as_str()?.to_string();
                let name = record.get("name")?.as_str()?.to_string();
                
                // Get location object
                let location_value = record.get("location")?;
                let location_obj = location_value.as_object()?;
                
                let location = HospitalLocation {
                    latitude: location_obj.get("latitude")?.as_f64()?,
                    longitude: location_obj.get("longitude")?.as_f64()?,
                    address: location_obj.get("address")?.as_str()?.to_string(),
                    city: location_obj.get("city")?.as_str()?.to_string(),
                    state: location_obj.get("state")?.as_str()?.to_string(),
                    country: location_obj.get("country")?.as_str()?.to_string(),
                    postal_code: location_obj.get("postal_code")?.as_str()?.to_string(),
                };
                
                // Get contact object
                let contact_value = record.get("contact")?;
                let contact_obj = contact_value.as_object()?;
                
                let contact = ContactInfo {
                    phone: contact_obj.get("phone")?.as_str()?.to_string(),
                    email: contact_obj.get("email")?.as_str()?.to_string(),
                    website: contact_obj.get("website")?.as_str()?.to_string(),
                    emergency_phone: contact_obj.get("emergency_phone")?.as_str()?.to_string(),
                };
                
                // Get services array
                let services_value = record.get("services")?;
                let services_array = services_value.as_array()?;
                let services = services_array.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
                
                // Get emergency capacity
                let emergency_capacity = record.get("emergency_capacity")?.as_u64()? as u32;
                
                // Get verification status
                let verification_status = record.get("verification_status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("pending")
                    .to_string();
                
                // Get timestamp
                let timestamp = record.get("createdAt")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&chrono::Utc::now().to_rfc3339())
                    .to_string();
                
                // Get admin ID
                let admin_id = record.get("adminId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                
                Some(Hospital {
                    hospital_id,
                    name,
                    location,
                    contact,
                    services,
                    emergency_capacity,
                    verification_status,
                    timestamp,
                    admin_id,
                })
            }).collect()
        } else {
            Vec::new()
        }
    };
    
    if hospitals.is_empty() {
        return Ok(Vec::new());
    }
    
    // Calculate distance for each hospital
    let mut hospitals_with_distance: Vec<HospitalWithDistance> = hospitals
        .into_iter()
        .map(|hospital| {
            let distance = calculate_distance(
                location.latitude, 
                location.longitude,
                hospital.location.latitude,
                hospital.location.longitude
            );
            
            HospitalWithDistance {
                hospital,
                distance,
            }
        })
        .collect();
    
    // Sort by distance
    hospitals_with_distance.sort_by(|a, b| {
        a.distance.partial_cmp(&b.distance).unwrap_or(Ordering::Equal)
    });
    
    // Take only the specified limit
    if hospitals_with_distance.len() > limit {
        hospitals_with_distance.truncate(limit);
    }
    
    Ok(hospitals_with_distance)
}

// Find available ambulances for a hospital
fn find_available_ambulances(hospital_id: &str) -> Result<Vec<Ambulance>> {
    // Read ambulances from file
    let ambulances: Vec<Ambulance> = if Path::new(AMBULANCES_DB_FILE).exists() {
        let file = File::open(AMBULANCES_DB_FILE)?;
        let ambulance_with_blocks: Vec<AmbulanceWithBlock> = serde_json::from_reader(file)?;
        ambulance_with_blocks.into_iter().map(|a| a.ambulance).collect()
    } else {
        // Try the direct JSON file that might be used by the server
        if Path::new("data/ambulances.json").exists() {
            let file = File::open("data/ambulances.json")?;
            let ambulance_records: Vec<HashMap<String, serde_json::Value>> = serde_json::from_reader(file)?;
            
            // Convert these to our Ambulance struct format
            ambulance_records.into_iter().filter_map(|record| {
                // Check if this ambulance belongs to our hospital
                let record_hospital_id = record.get("hospital_id")?.as_str()?;
                if record_hospital_id != hospital_id {
                    return None;
                }
                
                // Extract the necessary fields
                let ambulance_id = record.get("id")?.as_str()?.to_string();
                let registration_number = record.get("registration_number")?.as_str()?.to_string();
                let vehicle_type = record.get("vehicle_type")?.as_str()?.to_string();
                let capacity = record.get("capacity")?.as_u64()? as u32;
                
                // Get equipment array
                let equipment_value = record.get("equipment")?;
                let equipment_array = equipment_value.as_array()?;
                let equipment = equipment_array.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
                
                // Get current status
                let current_status = record.get("current_status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Available")
                    .to_string();
                
                // Get current location if available
                let current_location = record.get("current_location")
                    .and_then(|v| {
                        if v.is_null() {
                            return None;
                        }
                        
                        let loc_obj = v.as_object()?;
                        let latitude = loc_obj.get("latitude")?.as_f64()?;
                        let longitude = loc_obj.get("longitude")?.as_f64()?;
                        
                        Some(Location {
                            latitude,
                            longitude
                        })
                    });
                
                // Get last updated timestamp
                let last_updated = record.get("updatedAt")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&chrono::Utc::now().to_rfc3339())
                    .to_string();
                
                Some(Ambulance {
                    ambulance_id,
                    hospital_id: hospital_id.to_string(),
                    registration_number,
                    vehicle_type,
                    capacity,
                    equipment,
                    current_status,
                    current_location,
                    last_updated,
                })
            }).collect()
        } else {
            Vec::new()
        }
    };
    
    // Filter for available ambulances for this hospital
    let available = ambulances
        .into_iter()
        .filter(|ambulance| {
            ambulance.hospital_id == hospital_id && 
            ambulance.current_status == "Available"
        })
        .collect();
    
    Ok(available)
}

// Update ambulance status in local database
fn update_ambulance_status(ambulance: &Ambulance, block_id: &str) -> Result<()> {
    // Create stored ambulance with block ID
    let stored_ambulance = AmbulanceWithBlock {
        ambulance: ambulance.clone(),
        block_id: block_id.to_string(),
        timestamp: ambulance.last_updated.clone(),
    };

    // Read ambulances from file
    let mut ambulances: Vec<AmbulanceWithBlock> = if Path::new(AMBULANCES_DB_FILE).exists() {
        let file = File::open(AMBULANCES_DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_ambulances) => existing_ambulances,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Update the ambulance status
    let mut found = false;
    for existing in ambulances.iter_mut() {
        if existing.ambulance.ambulance_id == ambulance.ambulance_id {
            *existing = stored_ambulance.clone();
            found = true;
            break;
        }
    }
    
    // If not found, add it
    if !found {
        ambulances.push(stored_ambulance);
    }
    
    // Write the updated ambulances back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(AMBULANCES_DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &ambulances)?;
    
    // Also update the ambulance in the server's JSON file if it exists
    if Path::new("data/ambulances.json").exists() {
        update_server_ambulance_status(ambulance)?;
    }
    
    Ok(())
}

// Update ambulance in the server's JSON file
fn update_server_ambulance_status(ambulance: &Ambulance) -> Result<()> {
    if !Path::new("data/ambulances.json").exists() {
        return Ok(());
    }
    
    // Read the current file
    let file = File::open("data/ambulances.json")?;
    let mut ambulance_records: Vec<HashMap<String, serde_json::Value>> = serde_json::from_reader(file)?;
    
    // Find and update the ambulance
    let mut found = false;
    for record in ambulance_records.iter_mut() {
        if let Some(id) = record.get("id").and_then(|v| v.as_str()) {
            if id == ambulance.ambulance_id {
                // Update the status
                record.insert("current_status".to_string(), serde_json::Value::String(ambulance.current_status.clone()));
                record.insert("updatedAt".to_string(), serde_json::Value::String(ambulance.last_updated.clone()));
                
                // Update location if available
                if let Some(location) = &ambulance.current_location {
                    let mut location_map = serde_json::Map::new();
                    location_map.insert("latitude".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(location.latitude).unwrap()));
                    location_map.insert("longitude".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(location.longitude).unwrap()));
                    
                    record.insert("current_location".to_string(), serde_json::Value::Object(location_map));
                }
                
                found = true;
                break;
            }
        }
    }
    
    if !found {
        // Create a new record for this ambulance
        let mut new_record = HashMap::new();
        new_record.insert("id".to_string(), serde_json::Value::String(ambulance.ambulance_id.clone()));
        new_record.insert("hospital_id".to_string(), serde_json::Value::String(ambulance.hospital_id.clone()));
        new_record.insert("registration_number".to_string(), serde_json::Value::String(ambulance.registration_number.clone()));
        new_record.insert("vehicle_type".to_string(), serde_json::Value::String(ambulance.vehicle_type.clone()));
        new_record.insert("capacity".to_string(), serde_json::Value::Number(serde_json::Number::from(ambulance.capacity)));
        new_record.insert("current_status".to_string(), serde_json::Value::String(ambulance.current_status.clone()));
        
        // Add equipment as array
        let equipment_array = serde_json::Value::Array(
            ambulance.equipment.iter()
                .map(|e| serde_json::Value::String(e.clone()))
                .collect()
        );
        new_record.insert("equipment".to_string(), equipment_array);
        
        // Add location if available
        if let Some(location) = &ambulance.current_location {
            let mut location_map = serde_json::Map::new();
            location_map.insert("latitude".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(location.latitude).unwrap()));
            location_map.insert("longitude".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(location.longitude).unwrap()));
            
            new_record.insert("current_location".to_string(), serde_json::Value::Object(location_map));
        } else {
            new_record.insert("current_location".to_string(), serde_json::Value::Null);
        }
        
        // Add timestamps
        new_record.insert("createdAt".to_string(), serde_json::Value::String(ambulance.last_updated.clone()));
        new_record.insert("updatedAt".to_string(), serde_json::Value::String(ambulance.last_updated.clone()));
        
        ambulance_records.push(new_record);
    }
    
    // Write back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open("data/ambulances.json")?;
    
    serde_json::to_writer_pretty(file, &ambulance_records)?;
    
    Ok(())
}

// Save emergency response to local database
fn save_emergency_response(response: &EmergencyResponse) -> Result<()> {
    // Read existing responses if the file exists
    let mut responses: Vec<EmergencyResponse> = if Path::new(EMERGENCY_DB_FILE).exists() {
        let file = File::open(EMERGENCY_DB_FILE)?;
        match serde_json::from_reader(file) {
            Ok(existing_responses) => existing_responses,
            Err(_) => Vec::new(), // Start fresh if file is corrupted
        }
    } else {
        Vec::new()
    };
    
    // Add the new response
    responses.push(response.clone());
    
    // Write the updated responses back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(EMERGENCY_DB_FILE)?;
    
    serde_json::to_writer_pretty(file, &responses)?;
    
    // Also update the emergency response in the server's JSON files
    if Path::new("data/emergency_responses.json").exists() {
        update_server_emergency_response(response)?;
    }
    
    Ok(())
}

// Update emergency response in the server's JSON file
fn update_server_emergency_response(response: &EmergencyResponse) -> Result<()> {
    if !Path::new("data/emergency_responses.json").exists() {
        // Create the file with the new response
        let file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("data/emergency_responses.json")?;
        
        // Create a new record for this response
        let mut new_record = HashMap::new();
        new_record.insert("id".to_string(), serde_json::Value::String(response.request_id.clone()));
        new_record.insert("request_id".to_string(), serde_json::Value::String(response.request_id.clone()));
        new_record.insert("hospital_id".to_string(), serde_json::Value::String(response.hospital_id.clone()));
        new_record.insert("hospital_name".to_string(), serde_json::Value::String(response.hospital_name.clone()));
        new_record.insert("ambulance_id".to_string(), serde_json::Value::String(response.ambulance_id.clone()));
        new_record.insert("estimated_arrival_time".to_string(), serde_json::Value::Number(serde_json::Number::from(response.estimated_arrival_time)));
        new_record.insert("distance".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(response.distance).unwrap()));
        new_record.insert("status".to_string(), serde_json::Value::String(response.status.clone()));
        new_record.insert("blockchainTransactionId".to_string(), serde_json::Value::String(response.blockchain_tx_id.clone()));
        new_record.insert("blockchainStatus".to_string(), serde_json::Value::String("Confirmed".to_string()));
        new_record.insert("createdAt".to_string(), serde_json::Value::String(response.timestamp.clone()));
        new_record.insert("updatedAt".to_string(), serde_json::Value::String(response.timestamp.clone()));
        
        // Write a single item array to the file
        serde_json::to_writer_pretty(file, &vec![new_record])?;
        
        return Ok(());
    }
    
    // Read the current file
    let file = File::open("data/emergency_responses.json")?;
    let mut response_records: Vec<HashMap<String, serde_json::Value>> = serde_json::from_reader(file)?;
    
    // Find and update the response, or add a new one
    let mut found = false;
    for record in response_records.iter_mut() {
        if let Some(id) = record.get("request_id").and_then(|v| v.as_str()) {
            if id == response.request_id {
                // Update the record
                record.insert("hospital_id".to_string(), serde_json::Value::String(response.hospital_id.clone()));
                record.insert("hospital_name".to_string(), serde_json::Value::String(response.hospital_name.clone()));
                record.insert("ambulance_id".to_string(), serde_json::Value::String(response.ambulance_id.clone()));
                record.insert("estimated_arrival_time".to_string(), serde_json::Value::Number(serde_json::Number::from(response.estimated_arrival_time)));
                record.insert("distance".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(response.distance).unwrap()));
                record.insert("status".to_string(), serde_json::Value::String(response.status.clone()));
                record.insert("blockchainTransactionId".to_string(), serde_json::Value::String(response.blockchain_tx_id.clone()));
                record.insert("blockchainStatus".to_string(), serde_json::Value::String("Confirmed".to_string()));
                record.insert("updatedAt".to_string(), serde_json::Value::String(response.timestamp.clone()));
                
                found = true;
                break;
            }
        }
    }
    
    if !found {
        // Create a new record for this response
        let mut new_record = HashMap::new();
        new_record.insert("id".to_string(), serde_json::Value::String(format!("resp_{}", response.request_id)));
        new_record.insert("request_id".to_string(), serde_json::Value::String(response.request_id.clone()));
        new_record.insert("hospital_id".to_string(), serde_json::Value::String(response.hospital_id.clone()));
        new_record.insert("hospital_name".to_string(), serde_json::Value::String(response.hospital_name.clone()));
        new_record.insert("ambulance_id".to_string(), serde_json::Value::String(response.ambulance_id.clone()));
        new_record.insert("estimated_arrival_time".to_string(), serde_json::Value::Number(serde_json::Number::from(response.estimated_arrival_time)));
        new_record.insert("distance".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(response.distance).unwrap()));
        new_record.insert("status".to_string(), serde_json::Value::String(response.status.clone()));
        new_record.insert("blockchainTransactionId".to_string(), serde_json::Value::String(response.blockchain_tx_id.clone()));
        new_record.insert("blockchainStatus".to_string(), serde_json::Value::String("Confirmed".to_string()));
        new_record.insert("createdAt".to_string(), serde_json::Value::String(response.timestamp.clone()));
        new_record.insert("updatedAt".to_string(), serde_json::Value::String(response.timestamp.clone()));
        
        response_records.push(new_record);
    }
    
    // Write back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open("data/emergency_responses.json")?;
    
    serde_json::to_writer_pretty(file, &response_records)?;
    
    // Also update the request status
    update_server_emergency_request_status(&response.request_id, "Assigned")?;
    
    Ok(())
}

// Update emergency request status in the server's JSON file
fn update_server_emergency_request_status(request_id: &str, new_status: &str) -> Result<()> {
    if !Path::new("data/emergencies.json").exists() {
        return Ok(());
    }
    
    // Read the current file
    let file = File::open("data/emergencies.json")?;
    let mut request_records: Vec<HashMap<String, serde_json::Value>> = serde_json::from_reader(file)?;
    
    // Find and update the request
    let now = chrono::Utc::now().to_rfc3339();
    for record in request_records.iter_mut() {
        if let Some(id) = record.get("id").and_then(|v| v.as_str()) {
            if id == request_id {
                // Update the status
                record.insert("status".to_string(), serde_json::Value::String(new_status.to_string()));
                record.insert("updatedAt".to_string(), serde_json::Value::String(now.clone()));
                break;
            }
        }
    }
    
    // Write back to the file
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open("data/emergencies.json")?;
    
    serde_json::to_writer_pretty(file, &request_records)?;
    
    Ok(())
}

// Calculate distance between two points using the Haversine formula
fn calculate_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const EARTH_RADIUS: f64 = 6371.0; // km
    
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let delta_lat = (lat2 - lat1).to_radians();
    let delta_lon = (lon2 - lon1).to_radians();
    
    let a = (delta_lat / 2.0).sin() * (delta_lat / 2.0).sin() +
            lat1_rad.cos() * lat2_rad.cos() * 
            (delta_lon / 2.0).sin() * (delta_lon / 2.0).sin();
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    
    EARTH_RADIUS * c
}

// Calculate estimated time of arrival based on distance
// Assuming average speed of 60 km/h for ambulances
fn calculate_eta(_location: &Location, distance_km: f64) -> u32 {
    const AVG_SPEED_KMH: f64 = 60.0;
    
    // Time in hours = distance / speed
    let time_hours = distance_km / AVG_SPEED_KMH;
    
    // Convert to minutes
    let time_minutes = (time_hours * 60.0).round() as u32;
    
    // Minimum time is 1 minute
    if time_minutes < 1 {
        1
    } else {
        time_minutes
    }
}