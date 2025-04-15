import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Surface, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

const HospitalDashboard = ({ hospitalId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [stats, setStats] = useState({
    totalAmbulances: 0,
    availableAmbulances: 0,
    dispatchedAmbulances: 0,
    maintenanceAmbulances: 0,
    emergencyCapacity: 0,
    utilizationRate: 0,
  });
  
  // Mock data for demonstration
  const [mockActivityData, setMockActivityData] = useState([]);
  
  useEffect(() => {
    if (hospitalId) {
      fetchHospitalData();
    }
    
    // Generate mock activity data for demonstration
    generateMockActivityData();
  }, [hospitalId]);
  
  const fetchHospitalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch hospital details
      const hospitalResponse = await fetch(`${API_URL}/hospitals/${hospitalId}`);
      
      if (!hospitalResponse.ok) {
        throw new Error('Failed to fetch hospital details');
      }
      
      const hospitalData = await hospitalResponse.json();
      setHospital(hospitalData);
      
      // Fetch ambulances for this hospital
      const ambulancesResponse = await fetch(`${API_URL}/hospitals/${hospitalId}/ambulances`);
      
      if (!ambulancesResponse.ok) {
        throw new Error('Failed to fetch ambulances');
      }
      
      const ambulancesData = await ambulancesResponse.json();
      setAmbulances(ambulancesData);
      
      // Calculate stats
      calculateStats(hospitalData, ambulancesData);
    } catch (err) {
      console.error('Error fetching hospital data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateStats = (hospitalData, ambulancesData) => {
    const totalAmbulances = ambulancesData.length;
    const availableAmbulances = ambulancesData.filter(a => a.current_status === 'Available').length;
    const dispatchedAmbulances = ambulancesData.filter(a => a.current_status === 'Dispatched').length;
    const maintenanceAmbulances = ambulancesData.filter(a => a.current_status === 'Maintenance').length;
    const emergencyCapacity = hospitalData.emergency_capacity || 0;
    
    // Calculate utilization rate (dispatched ambulances / total ambulances)
    const utilizationRate = totalAmbulances > 0 
      ? (dispatchedAmbulances / totalAmbulances) * 100 
      : 0;
    
    setStats({
      totalAmbulances,
      availableAmbulances,
      dispatchedAmbulances,
      maintenanceAmbulances,
      emergencyCapacity,
      utilizationRate: parseFloat(utilizationRate.toFixed(1)),
    });
  };
  
  const generateMockActivityData = () => {
    // Generate random activity data for the past 7 days
    const labels = [];
    const emergencyData = [];
    const ambulanceData = [];
    
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Random values for demo
      emergencyData.push(Math.floor(Math.random() * 10) + 1);
      ambulanceData.push(Math.floor(Math.random() * 8) + 1);
    }
    
    setMockActivityData({
      labels,
      datasets: [
        {
          data: emergencyData,
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: ambulanceData,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Emergencies', 'Dispatches']
    });
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  if (!hospital) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="warning" size={48} color="#f39c12" />
        <Text style={styles.errorText}>No hospital data available</Text>
      </View>
    );
  }
  
  // Prepare ambulance status data for pie chart
  const ambulanceStatusData = [
    {
      name: 'Available',
      value: stats.availableAmbulances,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Dispatched',
      value: stats.dispatchedAmbulances,
      color: '#F44336',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Maintenance',
      value: stats.maintenanceAmbulances,
      color: '#FF9800',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ];
  
  return (
    <View style={styles.container}>
      {/* Status Summary */}
      <Surface style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalAmbulances}</Text>
          <Text style={styles.statLabel}>Total Ambulances</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.availableAmbulances}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>
            {stats.dispatchedAmbulances}
          </Text>
          <Text style={styles.statLabel}>Dispatched</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.emergencyCapacity}</Text>
          <Text style={styles.statLabel}>Emergency Beds</Text>
        </View>
      </Surface>
      
      {/* Ambulance Status Pie Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Ambulance Status</Title>
          
          {stats.totalAmbulances > 0 ? (
            <View style={styles.chartContainer}>
              <PieChart
                data={ambulanceStatusData}
                width={Dimensions.get('window').width - 80}
                height={180}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
              
              <View style={styles.utilization}>
                <Text style={styles.utilizationLabel}>Utilization Rate</Text>
                <Text style={styles.utilizationValue}>{stats.utilizationRate}%</Text>
                <View style={styles.utilizationBar}>
                  <View 
                    style={[
                      styles.utilizationFill, 
                      { width: `${stats.utilizationRate}%` },
                      { backgroundColor: getUtilizationColor(stats.utilizationRate) }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ) : (
            <Paragraph style={styles.noDataText}>
              No ambulance data available
            </Paragraph>
          )}
        </Card.Content>
      </Card>
      
      {/* Activity Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Emergency Activity (7 Days)</Title>
          
          <LineChart
            data={mockActivityData}
            width={Dimensions.get('window').width - 40}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
              }
            }}
            bezier
            style={styles.lineChart}
          />
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Emergencies</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>Dispatches</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Blockchain Verification */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Blockchain Verification</Title>
          
          {hospital.blockchainTransactionId ? (
            <View style={styles.blockchainInfo}>
              <View style={styles.verifiedHeader}>
                <MaterialIcons name="verified" size={24} color="#4CAF50" />
                <Text style={styles.verifiedText}>Verified on IOTA Tangle</Text>
              </View>
              
              <Text style={styles.blockchainLabel}>Transaction ID:</Text>
              <Text style={styles.blockchainValue}>{hospital.blockchainTransactionId}</Text>
              
              <Chip 
                icon="check-circle" 
                style={styles.blockchainChip}
                mode="outlined"
              >
                Data Integrity Secured
              </Chip>
            </View>
          ) : (
            <View style={styles.notVerifiedInfo}>
              <MaterialIcons name="warning" size={24} color="#FF9800" />
              <Text style={styles.notVerifiedText}>
                Not yet verified on blockchain
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

// Get color based on utilization rate
const getUtilizationColor = (rate) => {
  if (rate < 30) return '#4CAF50'; // Green
  if (rate < 70) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  noDataText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
    marginVertical: 32,
  },
  utilization: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  utilizationLabel: {
    fontSize: 14,
    color: '#666',
  },
  utilizationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  utilizationBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginTop: 4,
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 4,
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  blockchainInfo: {
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  blockchainLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  blockchainValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 16,
  },
  blockchainChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderColor: '#4CAF50',
  },
  notVerifiedInfo: {
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notVerifiedText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
});

export default HospitalDashboard;