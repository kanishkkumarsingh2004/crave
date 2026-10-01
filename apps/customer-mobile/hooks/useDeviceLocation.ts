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
          "Blinkbite needs your GPS location to deliver fresh food & track orders in real time. Please enable location permissions in Settings.",
          [{ text: "OK" }],
        );
        setLoading(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentPosition.coords;

      // Reverse geocode to get address details
      let addressString = "Current Location";
      let cityName = "Bengaluru";

      try {
        const [geocode] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode) {
          addressString = [geocode.name, geocode.street, geocode.subregion]
            .filter(Boolean)
            .join(", ");
          cityName = geocode.city || geocode.region || "Bengaluru";
        }
      } catch (err) {
        console.log("Geocode warning:", err);
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
