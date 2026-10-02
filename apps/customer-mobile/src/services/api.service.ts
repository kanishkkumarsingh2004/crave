import Constants from "expo-constants";

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3000`;
  }
  return "http://localhost:3000";
}

export const API_BASE_URL = getApiBaseUrl();

export interface DbCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface DbProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  comparePrice?: number | string | null;
  sku?: string | null;
  imageUrl?: string | null;
  vendorId: string;
  categoryId?: string | null;
  status?: string;
  vendor?: {
    id: string;
    storeName: string;
    isOpen?: boolean;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
}

export interface DbVendor {
  id: string;
  storeName: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isOpen?: boolean;
  category?: string;
  rating?: string;
}

/**
 * Fetch active categories from database
 */
export async function fetchCategoriesFromDb(): Promise<DbCategory[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/categories`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.log("DB categories fetch info:", err);
  }
  return [];
}

/**
 * Fetch products from database
 */
export async function fetchProductsFromDb(params?: {
  categoryId?: string;
  vendorId?: string;
  search?: string;
}): Promise<DbProduct[]> {
  try {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append("categoryId", params.categoryId);
    if (params?.vendorId) query.append("vendorId", params.vendorId);
    if (params?.search) query.append("search", params.search);

    const res = await fetch(`${API_BASE_URL}/api/v1/products?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.log("DB products fetch info:", err);
  }
  return [];
}

/**
 * Fetch approved vendors from database
 */
export async function fetchVendorsFromDb(): Promise<DbVendor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/vendors`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.log("DB vendors fetch info:", err);
  }
  return [];
}

/**
 * Fetch customer orders from database
 */
export async function fetchCustomerOrdersFromDb(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/customer/orders`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.log("DB customer orders fetch info:", err);
  }
  return [];
}
