import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";

export interface StoreGpsLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export function useDeviceLocation() {
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");
  const [location, setLocation] = useState<StoreGpsLocation | null>({
    latitude: 12.93524,
    longitude: 77.6245,
    address: "104 Market Street, Station Area, Koramangala 4th Block",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560034",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestGpsPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== "granted") {
        setErrorMsg("Permission to access store location was denied");
        Alert.alert(
          "Store GPS Location Required",
          "Blinkbite Vendor app requires location access to set your store's accurate pickup coordinates for drivers.",
          [{ text: "OK" }],
        );
        setLoading(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentPosition.coords;

      let addressString = "104 Market Street, Station Area, Koramangala 4th Block";
      let cityName = "Bengaluru";
      let stateName = "Karnataka";
      let postal = "560034";

      try {
        const [geocode] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode) {
          addressString = [geocode.name, geocode.street, geocode.subregion]
            .filter(Boolean)
            .join(", ");
          cityName = geocode.city || geocode.region || "Bengaluru";
          stateName = geocode.region || "Karnataka";
          postal = geocode.postalCode || "560034";
        }
      } catch (err) {
        console.warn("Store geocode warning:", err);
      }

      setLocation({
        latitude,
        longitude,
        address: addressString,
        city: cityName,
        state: stateName,
        postalCode: postal,
      });
      setErrorMsg(null);
    } catch (err: unknown) {
      console.error("Error requesting store GPS location:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch store location";
      setErrorMsg(message);
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
