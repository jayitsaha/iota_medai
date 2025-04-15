import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Text, ActivityIndicator, Divider, List, Button, Chip } from 'react-native-paper';
import { fetchHealthcareRecord, updateHealthcareRecord } from '../services/healthcareService';

export default function ViewHealthcareRecordScreen({ navigation, route }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  const { recordId } = route.params;

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchHealthcareRecord(recordId);
      setRecord(data);
    } catch (err) {
      console.error('Error fetching healthcare record:', err);
      setError('Failed to load healthcare record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    Alert.alert(
      `Update to ${newStatus}?`,
      `Are you sure you want to update this record to "${newStatus}" status?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: async () => {
            try {
              setUpdating(true);
              await updateHealthcareRecord(recordId, newStatus);
              await loadRecord(); // Reload the record with new status
              Alert.alert('Success', 'Record status updated successfully');
            } catch (error) {
              console.error('Error updating record status:', error);
              Alert.alert('Error', 'Failed to update record status');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  // Parse details from the record
  const getDetails = () => {
    if (!record) return {};
    
    try {
      if (typeof record.details === 'string') {
        return JSON.parse(record.details);
      }
      return record.details;
    } catch (e) {
      return { text: record.details };
    }
  };

  const renderRecordDetails = () => {
    if (!record) return null;
    
    const details = getDetails();
    
    switch(record.record_type) {
      case 'Prescription':
        return (
          <Card style={styles.detailsCard}>
            <Card.Content>
              <Title>Prescription Details</Title>
              <Divider style={styles.divider} />
              
              <List.Item
                title="Medication"
                description={details.medication || 'Not specified'}
                left={props => <List.Icon {...props} icon="pill" />}
              />
              
              {details.dosage && (
                <List.Item
                  title="Dosage"
                  description={details.dosage}
                  left={props => <List.Icon {...props} icon="scale" />}
                />
              )}
              
              {details.frequency && (
                <List.Item
                  title="Frequency"
                  description={details.frequency}
                  left={props => <List.Icon {...props} icon="clock-outline" />}
                />
              )}
              
              {details.duration && (
                <List.Item
                  title="Duration"
                  description={details.duration}
                  left={props => <List.Icon {...props} icon="calendar-range" />}
                />
              )}
              
              {details.notes && (
                <List.Item
                  title="Notes"
                  description={details.notes}
                  left={props => <List.Icon {...props} icon="text" />}
                />
              )}
            </Card.Content>
          </Card>
        );
        
      case 'BloodTest':
        return (
          <Card style={styles.detailsCard}>
            <Card.Content>
              <Title>Blood Test Results</Title>
              <Divider style={styles.divider} />
              
              <List.Item
                title="Test Name"
                description={details.test_name || 'General Blood Test'}
                left={props => <List.Icon {...props} icon="test-tube" />}
              />
              
              {details.lab && (
                <List.Item
                  title="Laboratory"
                  description={details.lab}
                  left={props => <List.Icon {...props} icon="domain" />}
                />
              )}
              
              {details.parameters && details.parameters.length > 0 && (
                <View style={styles.parametersContainer}>
                  <Paragraph style={styles.parametersTitle}>Test Parameters:</Paragraph>
                  
                  {details.parameters.map((param, index) => (
                    <View key={index} style={styles.parameterRow}>
                      <Text style={styles.paramName}>{param.name}:</Text>
                      <Text style={styles.paramValue}>{param.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        );
        
      case 'MedicalReport':
        return (
          <Card style={styles.detailsCard}>
            <Card.Content>
              <Title>Medical Report</Title>
              <Divider style={styles.divider} />
              
              {details.diagnosis && (
                <List.Item
                  title="Diagnosis"
                  description={details.diagnosis}
                  left={props => <List.Icon {...props} icon="file-document" />}
                />
              )}
              
              {details.symptoms && (
                <List.Item
                  title="Symptoms"
                  description={details.symptoms}
                  left={props => <List.Icon {...props} icon="format-list-bulleted" />}
                />
              )}
              
              {details.treatment && (
                <List.Item
                  title="Treatment Plan"
                  description={details.treatment}
                  left={props => <List.Icon {...props} icon="medical-bag" />}
                />
              )}
              
              {details.notes && (
                <List.Item
                  title="Additional Notes"
                  description={details.notes}
                  left={props => <List.Icon {...props} icon="text" />}
                />
              )}
            </Card.Content>
          </Card>
        );
        
      case 'Vaccination':
        return (
          <Card style={styles.detailsCard}>
            <Card.Content>
              <Title>Vaccination Record</Title>
              <Divider style={styles.divider} />
              
              <List.Item
                title="Vaccine"
                description={details.vaccine || 'Not specified'}
                left={props => <List.Icon {...props} icon="needle" />}
              />
              
              {details.batch_number && (
                <List.Item
                  title="Batch Number"
                  description={details.batch_number}
                  left={props => <List.Icon {...props} icon="barcode" />}
                />
              )}
              
              {details.location && (
                <List.Item
                  title="Location"
                  description={details.location}
                  left={props => <List.Icon {...props} icon="map-marker" />}
                />
              )}
              
              {details.notes && (
                <List.Item
                  title="Notes"
                  description={details.notes}
                  left={props => <List.Icon {...props} icon="text" />}
                />
              )}
            </Card.Content>
          </Card>
        );
        
      default:
        return (
          <Card style={styles.detailsCard}>
            <Card.Content>
              <Title>Record Details</Title>
              <Paragraph>{JSON.stringify(details, null, 2)}</Paragraph>
            </Card.Content>
          </Card>
        );
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'Active':
        return <Chip style={styles.activeChip}>Active</Chip>;
      case 'Completed':
        return <Chip style={styles.completedChip}>Completed</Chip>;
      case 'Cancelled':
        return <Chip style={styles.cancelledChip}>Cancelled</Chip>;
      default:
        return <Chip>{status}</Chip>;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading healthcare record...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadRecord} 
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Record not found</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.recordTitle}>{record.record_type}</Title>
            {getStatusChip(record.status)}
          </View>
          
          <Paragraph>Provider: {record.provider}</Paragraph>
          <Paragraph>Date: {record.date}</Paragraph>
          <Paragraph style={styles.timestamp}>
            Recorded: {new Date(record.timestamp).toLocaleString()}
          </Paragraph>
        </Card.Content>
      </Card>
      
      {renderRecordDetails()}
      
      {/* Status update buttons */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title>Update Status</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.buttonRow}>
            {record.status !== 'Active' && (
              <Button 
                mode="contained" 
                onPress={() => handleStatusUpdate('Active')}
                disabled={updating}
                style={[styles.statusButton, styles.activeButton]}
              >
                Mark Active
              </Button>
            )}
            
            {record.status !== 'Completed' && (
              <Button 
                mode="contained" 
                onPress={() => handleStatusUpdate('Completed')}
                disabled={updating}
                style={[styles.statusButton, styles.completeButton]}
              >
                Mark Completed
              </Button>
            )}
            
            {record.status !== 'Cancelled' && (
              <Button 
                mode="contained" 
                onPress={() => handleStatusUpdate('Cancelled')}
                disabled={updating}
                style={[styles.statusButton, styles.cancelButton]}
              >
                Cancel
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.blockchainCard}>
        <Card.Content>
          <Title>Blockchain Information</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Record ID"
            description={record.record_id}
            left={props => <List.Icon {...props} icon="identifier" />}
          />
          
          <List.Item
            title="Block ID"
            description={record.id}
            left={props => <List.Icon {...props} icon="cube-outline" />}
          />
          
          <Paragraph style={styles.blockchainInfo}>
            This record is securely stored on the IOTA blockchain, ensuring its authenticity and immutability.
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTitle: {
    flex: 1,
  },
  detailsCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  actionsCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  blockchainCard: {
    marginBottom: 24,
    borderRadius: 8,
    elevation: 2,
  },
  divider: {
    marginVertical: 10,
  },
  parametersContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  parametersTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  parameterRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  paramName: {
    fontWeight: '500',
    marginRight: 5,
  },
  paramValue: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  blockchainInfo: {
    fontStyle: 'italic',
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 8,
  },
  activeChip: {
    backgroundColor: '#c8e6c9',
  },
  completedChip: {
    backgroundColor: '#bbdefb',
  },
  cancelledChip: {
    backgroundColor: '#ffcdd2',
  },
});