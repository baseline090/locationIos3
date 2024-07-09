import React, { useEffect, useState } from 'react';
import { AppState, Button, SafeAreaView, StatusBar, StyleSheet, View, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import BackgroundTimer from 'react-native-background-timer';
import BackgroundFetch from 'react-native-background-fetch';

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const getDistance = ({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 }) => {
  const R = 6371e3; // Radius of the Earth in meters
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

function App() {
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    const intervalId = BackgroundTimer.setInterval(() => {
      getCurrentLocation();
    }, 10000);

    BackgroundFetch.configure(
      {
        minimumFetchInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
      },
      async taskId => {
        console.log('[BackgroundFetch] taskId:', taskId);
        getCurrentLocation();
        BackgroundFetch.finish(taskId);
      },
      error => {
        console.log('[BackgroundFetch] configure error:', error);
      }
    );

    return () => {
      subscription.remove();
      BackgroundTimer.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location) {
      const distanceMeters = getDistance(
        { latitude: -33.84418410668397, longitude: 150.93719605234367 },
        location,
      );
      setDistance(distanceMeters.toFixed(2));
    }
  }, [location]);

  const requestLocationPermission = async () => {
    try {
      let permissionStatus;
      if (Platform.OS === 'ios') {
        permissionStatus = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
        if (permissionStatus !== RESULTS.GRANTED) {
          permissionStatus = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
        }
      } else {
        permissionStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (!permissionStatus) {
          permissionStatus = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
      }

      if (permissionStatus !== RESULTS.GRANTED && permissionStatus !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission denied');
        return;
      }

      getCurrentLocation();
    } catch (error) {
      console.log('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = () => {
    const timestamp = new Date().toISOString();
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        console.log(`[${timestamp}] Latitude: ${latitude}, Longitude: ${longitude}`);
        
        const point1 = { latitude: -33.84418410668397, longitude: 150.93719605234367 };
        const calculatedDistance = getDistance({ latitude, longitude }, point1);
        setDistance(calculatedDistance);
        console.log(`[${timestamp}] Calculated Distance: ${calculatedDistance} meters`);

        sendDistanceToAPI(calculatedDistance, appState, timestamp);
      },
      error => {
        console.log(`[${timestamp}] Error:`, error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const sendDistanceToAPI = (distance, currentAppState, timestamp) => {
    fetch('https://fivestaraccess.com.au/FiveStar_App/locationdb.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distance: `${timestamp}: Total distance is ${distance} meters`,
      }),
    })
      .then(data => {
        console.log(`[${timestamp}] AppState sent:`, currentAppState);
      })
      .catch(error => {
        console.error(`[${timestamp}] Error:`, error.message);
      });
  };

  const handleButtonClick = () => {
    getCurrentLocation();
  };

  const handleSecondButtonClick = () => {
    console.log('Second button clicked!');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.buttonContainer1}>
          <Button title="Show Location and Distance" onPress={handleButtonClick} color="white" />
        </View>
        <View style={styles.buttonContainer2}>
          <Button title="Second Action" onPress={handleSecondButtonClick} color="white" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer1: {
    marginVertical: 10,
    minWidth: 300,
    borderRadius: 8,
    backgroundColor: 'green',
    overflow: 'hidden',
  },
  buttonContainer2: {
    marginVertical: 10,
    minWidth: 200,
    borderRadius: 8,
    backgroundColor: '#FFA500',
  },
});

export default App;
