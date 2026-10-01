import { create } from "zustand";
import { generatenumeric12Digit } from "@delivery/utils";
import Constants from "expo-constants";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3000`;
  }
  return "http://localhost:3000";
}

export type PaymentType = "UPI";
export type UpiAppId = "GPay" | "PhonePe" | "Paytm" | "BHIM" | "AmazonPay";

export interface UpiAppConfig {
  id: UpiAppId;
  name: string;
  vpaSuffix: string;
  iconName: string;
  color: string;
  bg: string;
  recommended?: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  type: PaymentType;
  title: string;
  subtitle: string;
  upiAppId?: UpiAppId;
  upiId?: string;
  payeeAddress: string;
  payeeName: string;
  mccCode: string;
  isDefault: boolean;
}

export const RECOMMENDED_UPI_APPS: UpiAppConfig[] = [
  {
    id: "GPay",
    name: "Google Pay",
    vpaSuffix: "@okaxis",
    iconName: "logo-google",
    color: "#4285F4",
    bg: "#eff6ff",
    recommended: true,
  },
  {
    id: "PhonePe",
    name: "PhonePe",
    vpaSuffix: "@ybl",
    iconName: "wallet",
    color: "#5f259f",
    bg: "#f5f3ff",
    recommended: true,
  },
  {
    id: "Paytm",
    name: "Paytm UPI",
    vpaSuffix: "@paytm",
    iconName: "flash",
    color: "#00baf2",
    bg: "#f0f9ff",
    recommended: true,
  },
  {
    id: "BHIM",
    name: "BHIM UPI",
    vpaSuffix: "@upi",
    iconName: "qr-code",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    id: "AmazonPay",
    name: "Amazon Pay UPI",
    vpaSuffix: "@apl",
    iconName: "cart",
    color: "#ff9900",
    bg: "#fff7ed",
  },
];

const DEFAULT_UPI_METHODS: SavedPaymentMethod[] = [
  {
    id: "pay-upi-gpay",
    type: "UPI",
    title: "Google Pay (UPI)",
    subtitle: "Instant NPCI Auto-Redirect",
    upiAppId: "GPay",
    upiId: "blinkbite.store@okaxis",
    payeeAddress: "blinkbite.store@okaxis",
    payeeName: "Blinkbite QuickCommerce",
    mccCode: "5411",
    isDefault: true,
  },
  {
    id: "pay-upi-phonepe",
    type: "UPI",
    title: "PhonePe UPI",
    subtitle: "Instant NPCI Auto-Redirect",
    upiAppId: "PhonePe",
    upiId: "blinkbite.store@okaxis",
    payeeAddress: "blinkbite.store@okaxis",
    payeeName: "Blinkbite QuickCommerce",
    mccCode: "5411",
    isDefault: false,
  },
  {
    id: "pay-upi-paytm",
    type: "UPI",
    title: "Paytm UPI",
    subtitle: "Instant NPCI Auto-Redirect",
    upiAppId: "Paytm",
    upiId: "blinkbite.store@okaxis",
    payeeAddress: "blinkbite.store@okaxis",
    payeeName: "Blinkbite QuickCommerce",
    mccCode: "5411",
    isDefault: false,
  },
];

interface PaymentState {
  methods: SavedPaymentMethod[];
  selectedMethodId: string;
  activeUpiAppId: UpiAppId;
  customUpiId: string;
  payeeAddress: string;
  payeeName: string;
  mccCode: string;

  // Actions
  selectMethod: (id: string) => void;
  setUpiApp: (appId: UpiAppId) => void;
  saveCustomUpi: (upiId: string) => void;
  getSelectedMethod: () => SavedPaymentMethod;
  fetchAdminPaymentSettings: () => Promise<void>;
  buildStandardUpiUrl: (amount: number, orderNumber?: string, customTr?: string) => string;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  methods: DEFAULT_UPI_METHODS,
  selectedMethodId: "pay-upi-gpay",
  activeUpiAppId: "GPay",
  customUpiId: "blinkbite.store@okaxis",
  payeeAddress: "blinkbite.store@okaxis",
  payeeName: "Blinkbite QuickCommerce",
  mccCode: "5411",

  getSelectedMethod: () => {
    const { methods, selectedMethodId } = get();
    const found = methods.find((m) => m.id === selectedMethodId);
    return found || methods[0] || DEFAULT_UPI_METHODS[0];
  },

  selectMethod: (id: string) => {
    set({ selectedMethodId: id });
  },

  setUpiApp: (appId: UpiAppId) => {
    const appInfo = RECOMMENDED_UPI_APPS.find((a) => a.id === appId);
    const newId = `pay-upi-${appId.toLowerCase()}`;
    const currentAddress = get().payeeAddress || "blinkbite.store@okaxis";
    const currentName = get().payeeName || "Blinkbite QuickCommerce";
    const currentMcc = get().mccCode || "5411";

    set((state) => {
      const exists = state.methods.find((m) => m.upiAppId === appId);
      let updatedMethods = state.methods;

      if (!exists && appInfo) {
        const newMethod: SavedPaymentMethod = {
          id: newId,
          type: "UPI",
          title: `${appInfo.name} (UPI)`,
          subtitle: `Instant NPCI redirect to ${appInfo.name}`,
          upiAppId: appId,
          upiId: currentAddress,
          payeeAddress: currentAddress,
          payeeName: currentName,
          mccCode: currentMcc,
          isDefault: true,
        };
        updatedMethods = [newMethod, ...state.methods];
      }

      return {
        activeUpiAppId: appId,
        selectedMethodId: exists ? exists.id : newId,
        methods: updatedMethods,
      };
    });
  },

  saveCustomUpi: (upiId: string) => {
    const cleanId = upiId.trim();
    if (!cleanId) return;

    const newMethodId = `pay-custom-upi-${Date.now()}`;
    const newMethod: SavedPaymentMethod = {
      id: newMethodId,
      type: "UPI",
      title: `UPI VPA: ${cleanId}`,
      subtitle: "Verified NPCI Merchant VPA",
      upiId: cleanId,
      payeeAddress: cleanId,
      payeeName: get().payeeName || "Blinkbite QuickCommerce",
      mccCode: get().mccCode || "5411",
      isDefault: true,
    };

    set((state) => ({
      customUpiId: cleanId,
      selectedMethodId: newMethodId,
      methods: [newMethod, ...state.methods],
    }));
  },

  fetchAdminPaymentSettings: async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/v1/public/settings`);
      if (res.ok) {
        const body = (await res.json()) as {
          data?: { upiPayeeAddress?: string; upiPayeeName?: string; upiMccCode?: string };
        };
        if (body?.data) {
          const { upiPayeeAddress, upiPayeeName, upiMccCode } = body.data;
          const address = upiPayeeAddress || "blinkbite.store@okaxis";
          const name = upiPayeeName || "Blinkbite QuickCommerce";
          const mcc = upiMccCode || "5411";

          set((state) => ({
            payeeAddress: address,
            payeeName: name,
            mccCode: mcc,
            customUpiId: address,
            methods: state.methods.map((m) => ({
              ...m,
              payeeAddress: address,
              payeeName: name,
              mccCode: mcc,
              upiId: address,
            })),
          }));
        }
      }
    } catch {
      // Fallback to defaults
    }
  },

  /**
   * Constructs Standard NPCI Specification URL Pattern using DB settings:
   * upi://pay?pa={payeeAddress}&pn={payeeName}&tr={tr}&am={amount}&cu=INR&tn={transactionNote}&mc={mcc}
   */
  buildStandardUpiUrl: (amount: number, orderNumber = "ORD-10004", customTr?: string) => {
    const state = get();
    const dbPayeeAddress = state.payeeAddress || "blinkbite.store@okaxis";
    const dbPayeeName = state.payeeName || "Blinkbite QuickCommerce";
    const dbMccCode = state.mccCode || "5411";

    const pa = encodeURIComponent(dbPayeeAddress);
    const pn = encodeURIComponent(dbPayeeName);
    const tr = encodeURIComponent(customTr || generatenumeric12Digit());
    const am = amount.toFixed(2);
    const cu = "INR";
    const tn = encodeURIComponent(`Payment for ${orderNumber}`);
    const mc = dbMccCode;

    return `upi://pay?pa=${pa}&pn=${pn}&tr=${tr}&am=${am}&cu=${cu}&tn=${tn}&mc=${mc}`;
  },
}));

