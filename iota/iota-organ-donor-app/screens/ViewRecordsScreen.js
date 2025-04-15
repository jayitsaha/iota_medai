import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator, Text, Button } from 'react-native-paper';
import { fetchOrganRecords } from '../services/apiService';

export default function ViewRecordsScreen() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrganRecords();
      setRecords(data);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Failed to load donor records. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Donor ID: {item.donor_id}</Title>
        <Paragraph>Organ Type: {item.organ_type}</Paragraph>
        <Paragraph>Status: {item.status}</Paragraph>
        <Paragraph style={styles.transactionId}>
          Transaction ID: {item.id ? item.id.substring(0, 15) + '...' : 'Unknown'}
        </Paragraph>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading donor records from IOTA...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadRecords} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {records.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noRecordsText}>No donor records found</Text>
          <Button mode="contained" onPress={loadRecords} style={styles.refreshButton}>
            Refresh
          </Button>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  transactionId: {
    fontSize: 12,
    marginTop: 8,
    color: 'gray',
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
  noRecordsText: {
    fontSize: 16,
    marginBottom: 16,
  },
  refreshButton: {
    marginTop: 8,
  },
  retryButton: {
    marginTop: 8,
  },
});