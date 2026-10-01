"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Store,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Package,
  ShoppingBag,
  Star,
  Wallet,
  MapPin,
  ExternalLink,
  Plus,
  Lock,
  Percent,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Sparkles,
  Settings,
  Power,
  Edit3,
  Trash2,
  Save,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { format } from "date-fns";
import { PremiumMapPicker } from "@/components/shared/premium-map-picker";

interface VendorDetailProps {
  id: string;
}

interface VendorDocument {
  id: string;
  type: string;
  url: string;
  verifiedAt: string | null;
  createdAt: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number | string;
  comparePrice: number | string | null;
  imageUrl: string | null;
  status: string;
  category?: { id: string; name: string };
  inventory?: { onHand: number; reserved: number } | null;
}

interface VendorDetailData {
  id: string;
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: string;
  isOpen: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  commissionType: string | null;
  commissionRate: number | string | null;
  isPricingLocked: boolean | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  suspendedAt: string | null;
  createdAt: string;
  grossSales?: number;
  netEarnings?: number;
  totalRevenue?: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  documents: VendorDocument[];
  products?: MenuItem[];
  _count: {
    products: number;
    orders: number;
    reviews: number;
  };
}

const FOOD_PRESETS = [
  { name: "Biryani", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { name: "Artisan Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80" },
  { name: "Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80" },
  { name: "Crispy Dosa", url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80" },
  { name: "Wok Noodles", url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=80" },
  { name: "Paneer Tikka", url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80" },
  { name: "Cake / Dessert", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80" },
  { name: "Cold Beverage", url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80" },
];

async function fetchVendor(id: string): Promise<{ success: boolean; data: VendorDetailData }> {
  const res = await fetch(`/api/v1/admin/vendors/${id}`);
  if (!res.ok) throw new Error("Failed to fetch vendor details");
  return res.json();
}

async function fetchCategories(): Promise<{ id: string; name: string }[]> {
  const res = await fetch("/api/v1/admin/categories?limit=50");
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

async function updateVendor(id: string, updates: Record<string, any>): Promise<void> {
  const res = await fetch(`/api/v1/admin/vendors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to update vendor");
  }
}

export function VendorDetail({ id }: VendorDetailProps) {
  const queryClient = useQueryClient();

  // Dialog & Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // New Menu Item Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productComparePrice, setProductComparePrice] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productStock, setProductStock] = useState("50");
  const [productImage, setProductImage] = useState(FOOD_PRESETS[0].url);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Edit Dish Modal State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editComparePrice, setEditComparePrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);

  // Editable Map Location State
  const [pendingLocation, setPendingLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  } | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // Settings Modal State
  const [editStoreName, setEditStoreName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCommissionType, setEditCommissionType] = useState<"COMMISSION" | "MARKUP">("COMMISSION");
  const [editCommissionRate, setEditCommissionRate] = useState("15.0");
  const [editPricingLocked, setEditPricingLocked] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor", id],
    queryFn: () => fetchVendor(id),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, any>) => updateVendor(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setShowRejectModal(false);
      setShowSettingsModal(false);
      setRejectionReason("");
      toast.success("Vendor updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Open settings modal and populate with current values
  function openSettings() {
    if (!data?.data) return;
    const v = data.data;
    setEditStoreName(v.storeName);
    setEditDesc(v.description || "");
    setEditPhone(v.phone || "");
    setEditCommissionType(v.commissionType === "MARKUP" ? "MARKUP" : "COMMISSION");
    setEditCommissionRate(String(v.commissionRate ?? "15.0"));
    setEditPricingLocked(Boolean(v.isPricingLocked));
    setShowSettingsModal(true);
  }

  // Save settings
  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      storeName: editStoreName,
      description: editDesc,
      phone: editPhone,
      commissionType: editCommissionType,
      commissionRate: parseFloat(editCommissionRate) || 15.0,
      isPricingLocked: editPricingLocked,
    });
  }

  // Save map location
  async function handleSaveLocation() {
    if (!pendingLocation) return;
    setIsSavingLocation(true);
    try {
      await updateVendor(id, {
        latitude: pendingLocation.latitude,
        longitude: pendingLocation.longitude,
        address: pendingLocation.address,
        city: pendingLocation.city,
        state: pendingLocation.state,
        postalCode: pendingLocation.postalCode,
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      setPendingLocation(null);
      toast.success("Restaurant coordinates and address saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setIsSavingLocation(false);
    }
  }

  // Add Menu Item
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error("Please enter item name");
      return;
    }
    if (!productPrice || isNaN(Number(productPrice))) {
      toast.error("Please enter a valid price");
      return;
    }
    const catId = productCategory || (categories.length > 0 ? categories[0].id : "");
    if (!catId) {
      toast.error("Please select a category");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const res = await fetch("/api/v1/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: id,
          categoryId: catId,
          name: productName,
          description: productDesc,
          price: parseFloat(productPrice),
          comparePrice: productComparePrice ? parseFloat(productComparePrice) : null,
          sku: productSku || undefined,
          imageUrl: productImage,
          initialStock: parseInt(productStock, 10) || 50,
          status: "ACTIVE",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to add menu item");
      }

      toast.success(`Menu item "${productName}" added with photo thumbnail!`);
      setShowAddProductModal(false);
      setProductName("");
      setProductPrice("");
      setProductComparePrice("");
      setProductDesc("");
      setProductSku("");
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add menu item");
    } finally {
      setIsSubmittingProduct(false);
    }
  }

  // Open Edit Dish Modal
  function openEditDish(item: MenuItem) {
    setEditingItem(item);
    setEditPrice(String(item.price));
    setEditComparePrice(item.comparePrice ? String(item.comparePrice) : "");
    setEditStock(item.inventory ? String(item.inventory.onHand) : "50");
    setEditStatus(item.status);
  }

  // Save Dish Edits
  async function handleSaveDishEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setIsUpdatingItem(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: parseFloat(editPrice),
          comparePrice: editComparePrice ? parseFloat(editComparePrice) : null,
          stock: parseInt(editStock, 10) || 0,
          status: editStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update menu dish");
      toast.success(`Updated "${editingItem.name}"`);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setIsUpdatingItem(false);
    }
  }

  // Delete Dish
  async function handleDeleteDish(dishId: string, dishName: string) {
    if (!confirm(`Are you sure you want to remove "${dishName}" from the menu?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/products/${dishId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete dish");
      toast.success(`Removed "${dishName}" from menu`);
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete dish");
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 font-semibold animate-pulse">
        Loading restaurant vendor profile and menu...
      </div>
    );
  }

  if (isError || !data?.data) {
    return <div className="p-8 text-center text-red-500 font-bold">Error loading vendor details.</div>;
  }

  const vendor = data.data;
  const products = vendor.products ?? [];
  const googleMapsUrl =
    vendor.latitude && vendor.longitude
      ? `https://www.google.com/maps?q=${vendor.latitude},${vendor.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.storeName}, ${vendor.city ?? ""}`)}`;

  return (
    <div className="space-y-8 pb-16">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Vendors Directory</span>
        </Link>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-blue-600" />
            <span>Store Settings & Policy</span>
          </button>
        </div>
      </div>

      {/* Header Banner Card with Full Operational Controls */}
      <div className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xl shadow-slate-200/40">
        {/* Cover Photo */}
        <div className="relative h-48 sm:h-60 bg-slate-900 overflow-hidden">
          {vendor.bannerUrl ? (
            <img src={vendor.bannerUrl} alt="Store Banner" className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-700 to-indigo-800 flex items-center justify-center text-white/40">
              <Store className="h-16 w-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

          {/* Quick status chips & Operational Store Open / Closed Switch */}
          <div className="absolute top-4 right-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => updateMutation.mutate({ isOpen: !vendor.isOpen })}
              disabled={updateMutation.isPending}
              title="Click to toggle store open/closed for ordering"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black backdrop-blur-md border shadow-md transition-all cursor-pointer ${
                vendor.isOpen
                  ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/35"
                  : "bg-rose-500/25 text-rose-300 border-rose-400/40 hover:bg-rose-500/35"
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{vendor.isOpen ? "● STORE OPEN (TAKING ORDERS)" : "○ STORE CLOSED (PAUSED)"}</span>
            </button>
            <StatusBadge value={vendor.status} />
          </div>
        </div>

        {/* Profile Info Row */}
        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="-mt-14 sm:-mt-16 mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-white shrink-0">
                {vendor.logoUrl ? (
                  <img src={vendor.logoUrl} alt={vendor.storeName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 text-white font-black text-2xl flex items-center justify-center">
                    {vendor.storeName[0]}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {vendor.storeName}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {vendor.description || "Authentic culinary specialties prepared fresh for quick delivery"}
                </p>
              </div>
            </div>

            {/* Approval / Suspend / Reactivate Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {vendor.status !== "APPROVED" && vendor.status !== "ACTIVE" && (
                <button
                  onClick={() => updateMutation.mutate({ status: "APPROVED" })}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve Store</span>
                </button>
              )}

              {vendor.status === "SUSPENDED" && (
                <button
                  onClick={() => updateMutation.mutate({ status: "ACTIVE" })}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Reactivate Store</span>
                </button>
              )}

              {vendor.status !== "SUSPENDED" && (vendor.status === "APPROVED" || vendor.status === "ACTIVE") && (
                <button
                  onClick={() => updateMutation.mutate({ status: "SUSPENDED" })}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Suspend Store</span>
                </button>
              )}

              {vendor.status !== "REJECTED" && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
              )}
            </div>
          </div>

          {/* Location & Pricing Badges */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>{vendor.address ? `${vendor.address}, ` : ""}{vendor.city || "Bangalore"}, {vendor.state || "KA"}</span>
              </span>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors border border-blue-200"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 border border-slate-200">
                <Percent className="h-3 w-3 text-blue-600" />
                <span>{vendor.commissionType ?? "COMMISSION"} ({vendor.commissionRate ?? "15.0"}%)</span>
              </span>

              {vendor.isPricingLocked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 font-bold">
                  <Lock className="h-3 w-3 text-amber-600" />
                  <span>Pricing Locked (Strict Policy)</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{products.length}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Menu Items</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{vendor._count.orders}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Orders</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              ₹{(vendor.totalRevenue ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Net Payouts</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{vendor._count.reviews}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Customer Reviews</div>
          </div>
        </div>
      </div>

      {/* Premium Interactive Map Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span>Store Location & Dispatch Map</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Powered by high-definition Google Maps with interactive pin relocation, layer switching, and GPS dispatch.
            </p>
          </div>

          {pendingLocation && (
            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={isSavingLocation}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isSavingLocation ? "Saving Coordinates..." : "Save New Pin Location"}</span>
            </button>
          )}
        </div>

        {/* Embedded Premium Map Picker */}
        <PremiumMapPicker
          latitude={vendor.latitude}
          longitude={vendor.longitude}
          address={vendor.address || ""}
          city={vendor.city || "Bangalore"}
          state={vendor.state || "Karnataka"}
          postalCode={vendor.postalCode || "560001"}
          height="380px"
          interactive={true}
          onChange={(loc) => {
            setPendingLocation(loc);
          }}
        />

        {pendingLocation && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-900">
              New Pin Location: {pendingLocation.latitude.toFixed(5)}, {pendingLocation.longitude.toFixed(5)} ({pendingLocation.address})
            </span>
            <span className="text-[11px] font-bold text-amber-700 uppercase">Unsaved Changes</span>
          </div>
        )}
      </div>

      {/* Menu & Products (Item Catalog) Management Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Restaurant Menu & Catalog Items</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                {products.length} {products.length === 1 ? "Item" : "Items"} Listed
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Add food dishes, adjust pricing, manage categories, and include photo thumbnails.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddProductModal(true)}
            id="add-menu-item-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Menu Item</span>
          </button>
        </div>

        {/* Products Grid or Empty State */}
        {products.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Menu Items Added Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start building this restaurant’s menu by clicking "Add Menu Item" above to add dishes with photo thumbnails.
            </p>
            <button
              type="button"
              onClick={() => setShowAddProductModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Dish</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-slate-200 hover:border-blue-300 bg-white p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between gap-3"
              >
                <div className="flex gap-3.5">
                  {/* Thumbnail Image */}
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    {item.status === "ACTIVE" && (
                      <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-sm text-slate-900 truncate leading-snug">
                        {item.name}
                      </h4>
                    </div>

                    {item.category && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                        {item.category.name}
                      </span>
                    )}

                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {item.description || "Freshly cooked to order"}
                    </p>

                    <div className="pt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-slate-900">₹{item.price}</span>
                        {item.comparePrice && (
                          <span className="text-xs text-slate-400 line-through">₹{item.comparePrice}</span>
                        )}
                      </div>
                      {item.inventory && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.inventory.onHand} in stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dish Action Controls */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${item.status === "ACTIVE" ? "text-emerald-600" : "text-slate-400"}`}>
                    {item.status === "ACTIVE" ? "● Active Dish" : "○ Draft / Paused"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditDish(item)}
                      title="Edit dish price & stock"
                      className="p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDish(item.id, item.name)}
                      title="Remove dish from menu"
                      className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Info & Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Owner Account Details */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <span>Store Account & Access</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-semibold">Owner Name</span>
              <span className="font-bold text-slate-800">{vendor.user.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-semibold">Login Email</span>
              <span className="font-bold text-slate-800">{vendor.user.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-semibold">Store Phone</span>
              <span className="font-bold text-slate-800">{vendor.phone ?? vendor.user.phone ?? "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-semibold">Registered Date</span>
              <span className="font-bold text-slate-800">
                {format(new Date(vendor.createdAt), "MMM dd, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Documents */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Verification Documents ({vendor.documents.length})</span>
          </h2>
          {vendor.documents.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">
              No verification documents uploaded. Store was verified administratively.
            </div>
          ) : (
            <div className="space-y-2">
              {vendor.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                >
                  <span className="text-xs font-bold text-slate-700">{doc.type}</span>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    View File ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Menu Item Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Menu Item to {vendor.storeName}</h3>
                <p className="text-xs text-slate-400">Add dish details, pricing, and food photo thumbnail</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dish / Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Special Hyderabadi Dum Biryani"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="299"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Original Price (₹ MRP)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productComparePrice}
                    onChange={(e) => setProductComparePrice(e.target.value)}
                    placeholder="349"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dish Description</label>
                <textarea
                  rows={2}
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  placeholder="Aromatic rice cooked with traditional spices..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Photo Thumbnail Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Photo Thumbnail Preset (or custom URL below)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {FOOD_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setProductImage(preset.url)}
                      className={`relative rounded-xl overflow-hidden border-2 p-0.5 transition-all text-left group ${
                        productImage === preset.url
                          ? "border-blue-600 ring-2 ring-blue-500/30 scale-102"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-12 object-cover rounded-lg" />
                      <span className="block text-[10px] font-bold text-slate-700 truncate px-1 py-0.5">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={productImage}
                  onChange={(e) => setProductImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {isSubmittingProduct ? "Adding Dish..." : "Save & Add to Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dish Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Edit {editingItem.name}</h3>
                <p className="text-xs text-slate-400">Update item pricing, discount, and stock</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDishEdits} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editComparePrice}
                    onChange={(e) => setEditComparePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock on Hand</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  >
                    <option value="ACTIVE">ACTIVE (In Stock)</option>
                    <option value="DRAFT">DRAFT (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingItem}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {isUpdatingItem ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Settings & Commission Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Store Settings & Financial Policy</h3>
                <p className="text-xs text-slate-400">Configure restaurant details, revenue model, and pricing lock</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Store Name</label>
                <input
                  type="text"
                  required
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Store Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Commission Model Selection */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-900">Revenue Model</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditCommissionType("COMMISSION")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editCommissionType === "COMMISSION"
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="block font-bold text-xs text-slate-900">Commission Model</span>
                    <span className="block text-[10px] text-slate-500">Platform takes % fee per order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditCommissionType("MARKUP")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editCommissionType === "MARKUP"
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="block font-bold text-xs text-slate-900">Markup Model</span>
                    <span className="block text-[10px] text-slate-500">Platform adds % mark-up</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editCommissionType === "COMMISSION" ? "Commission Rate (%)" : "Markup Rate (%)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editCommissionRate}
                    onChange={(e) => setEditCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  />
                </div>

                {/* Strict Pricing Lock Toggle */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Lock Restaurant Item Pricing</span>
                    <span className="block text-[10px] text-slate-500">
                      When locked, the restaurant cannot alter item prices
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editPricingLocked}
                    onChange={(e) => setEditPricingLocked(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Reject Vendor Application</h3>
            <p className="text-xs text-slate-500">
              Provide a reason for rejecting <span className="font-bold text-slate-800">{vendor.storeName}</span>:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete restaurant documentation or licensing..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate({ status: "REJECTED", reason: rejectionReason })}
                disabled={updateMutation.isPending}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Reject Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
