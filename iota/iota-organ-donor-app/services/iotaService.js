import { Client } from '@iota/client';
import { CONFIG } from '../config';

// OrganRecord structure matching the Rust code
export class OrganRecord {
  constructor(donorId, organType, status) {
    this.donor_id = donorId;
    this.organ_type = organType;
    this.status = status;
  }
}

// Initialize IOTA client
const getClient = () => {
  try {
    const client = new Client({
      nodes: CONFIG.NODES,
      ignoreNodeHealth: true
    });
    
    return client;
  } catch (error) {
    console.error('Error initializing IOTA client:', error);
    throw error;
  }
};

// Publish an organ record to the IOTA blockchain
export const publishOrganRecord = async (donorId, organType, status) => {
  try {
    const client = getClient();
    
    // Create a record
    const organ = new OrganRecord(donorId, organType, status);
    
    // Serialize to JSON
    const data = JSON.stringify(organ);
    
    // Create a TaggedData transaction
    const block = await client.buildAndPostBlock({
      tag: Buffer.from(CONFIG.TAG).toString('hex'),
      data: Buffer.from(data).toString('hex'),
    });
    
    console.log('Transaction published:', block.blockId);
    return block.blockId;
  } catch (error) {
    console.error('Error publishing organ record:', error);
    throw error;
  }
};

// Fetch organ records from the IOTA blockchain
export const fetchOrganRecords = async () => {
  try {
    const client = getClient();
    
    // Search for blocks with our tag
    const blockIds = await client.findBlocks({
      tags: [Buffer.from(CONFIG.TAG).toString('hex')],
    });
    
    // Fetch the blocks
    const records = [];
    for (const blockId of blockIds) {
      const block = await client.getBlock(blockId);
      
      // Extract and parse the payload
      if (block && block.payload && block.payload.type === 'TaggedData') {
        const data = Buffer.from(block.payload.data, 'hex').toString();
        try {
          const record = JSON.parse(data);
          records.push({
            id: blockId,
            ...record,
          });
        } catch (e) {
          console.error('Error parsing record data:', e);
        }
      }
    }
    
    return records;
  } catch (error) {
    console.error('Error fetching organ records:', error);
    throw error;
  }
};