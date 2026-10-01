import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

export function useDeviceLocation() {
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");
  const [location, setLocation] = useState<GpsCoordinates | null>({
    latitude: 12.93524,
    longitude: 77.6245,
    address: "Koramangala 4th Block",
    city: "Bengaluru",
  }); // Default fallback
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestGpsPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        Alert.alert(
          "GPS Location Permission Required",
          "Crave needs your GPS location to deliver fresh food & track orders in real time. Please enable location permissions in Settings.",
          [{ text: "OK" }],
        );
        setLoading(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentPosition.coords;

      let addressString = `Koramangala, Bengaluru (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      let cityName = "Bengaluru";

      try {
        const geocodes = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocodes && geocodes.length > 0) {
          const geocode = geocodes[0];
          const formatted = [geocode.name, geocode.street, geocode.subregion]
            .filter(Boolean)
            .join(", ");
          if (formatted) addressString = formatted;
          cityName = geocode.city || geocode.region || cityName;
        }
      } catch {
        // Silently fallback on environments without active native Geocoder service (Emulators, Expo Go, Web)
      }

      setLocation({
        latitude,
        longitude,
        address: addressString,
        city: cityName,
      });
      setErrorMsg(null);
    } catch (err: any) {
      console.error("Error requesting GPS location:", err);
      setErrorMsg(err.message || "Failed to fetch GPS location");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestGpsPermission();
  }, []);

  return {
    permissionStatus,
    location,
    loading,
    errorMsg,
    requestGpsPermission,
  };
}
