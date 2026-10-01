import { create } from "zustand";
import * as Location from "expo-location";
import { useAuthStore } from "./auth.store";

export interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

interface AddressState {
  addresses: SavedAddress[];
  selectedAddressId: string;
  loading: boolean;
  error: string | null;

  // Actions
  fetchAddresses: () => Promise<void>;
  selectAddress: (id: string) => void;
  addAddress: (address: Omit<SavedAddress, "id">) => Promise<SavedAddress>;
  deleteAddress: (id: string) => Promise<void>;
  detectCurrentGpsLocation: () => Promise<Omit<SavedAddress, "id">>;
  getSelectedAddress: () => SavedAddress;
}

const DEFAULT_ADDRESSES: SavedAddress[] = [
  {
    id: "addr-home-1",
    label: "Home",
    street: "123 Main Street, Apt 4B",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560034",
    latitude: 12.9344,
    longitude: 77.6192,
    isDefault: true,
  },
  {
    id: "addr-work-2",
    label: "Work",
    street: "45 Tech Park, Block C, 3rd Floor",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560103",
    latitude: 12.9279,
    longitude: 77.6271,
    isDefault: false,
  },
];

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: DEFAULT_ADDRESSES,
  selectedAddressId: "addr-home-1",
  loading: false,
  error: null,

  getSelectedAddress: () => {
    const { addresses, selectedAddressId } = get();
    const found = addresses.find((a) => a.id === selectedAddressId);
    return found || addresses[0] || DEFAULT_ADDRESSES[0];
  },

  selectAddress: (id: string) => {
    set({ selectedAddressId: id });
  },

  fetchAddresses: async () => {
    set({ loading: true, error: null });
    try {
      // If user session is active, attempt fetching from API
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        // We can fetch from API endpoint or fallback to stored
      }
      set({ loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addAddress: async (input) => {
    set({ loading: true, error: null });
    const newId = `addr-${Date.now()}`;
    const newAddress: SavedAddress = {
      id: newId,
      ...input,
    };

    set((state) => ({
      addresses: [newAddress, ...state.addresses],
      selectedAddressId: newId,
      loading: false,
    }));

    return newAddress;
  },

  deleteAddress: async (id: string) => {
    set((state) => {
      const filtered = state.addresses.filter((a) => a.id !== id);
      const nextSelectedId =
        state.selectedAddressId === id ? filtered[0]?.id || "addr-home-1" : state.selectedAddressId;
      return {
        addresses: filtered,
        selectedAddressId: nextSelectedId,
      };
    });
  },

  detectCurrentGpsLocation: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Location permission denied");
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const latitude = loc.coords.latitude;
    const longitude = loc.coords.longitude;

    let street = "Current Location";
    let city = "Bengaluru";
    let stateName = "Karnataka";
    let postalCode = "560034";

    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        street = [geo.name, geo.street, geo.subregion].filter(Boolean).join(", ") || street;
        city = geo.city || geo.region || city;
        stateName = geo.region || stateName;
        postalCode = geo.postalCode || postalCode;
      }
    } catch {
      // Ignore geocode failure fallback
    }

    return {
      label: "Current Location",
      street,
      city,
      state: stateName,
      postalCode,
      latitude,
      longitude,
    };
  },
}));
