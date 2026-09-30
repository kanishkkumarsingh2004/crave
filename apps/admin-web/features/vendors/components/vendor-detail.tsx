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
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { format } from "date-fns";

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

interface VendorDetail {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: string;
  isOpen: boolean;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  city: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  suspendedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  documents: VendorDocument[];
  _count: {
    products: number;
    orders: number;
    reviews: number;
  };
}

async function fetchVendor(id: string): Promise<{ success: boolean; data: VendorDetail }> {
  const res = await fetch(`/api/v1/admin/vendors/${id}`);
  if (!res.ok) throw new Error("Failed to fetch vendor details");
  return res.json();
}

async function updateVendorStatus(id: string, status: string, reason?: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/vendors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to update vendor status");
  }
}

export function VendorDetail({ id }: VendorDetailProps) {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor", id],
    queryFn: () => fetchVendor(id),
  });

  const mutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      updateVendorStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      setShowRejectModal(false);
      setRejectionReason("");
      toast.success("Vendor status updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading vendor details...
      </div>
    );
  }

  if (isError || !data?.data) {
    return <div className="p-8 text-center text-red-500">Error loading vendor.</div>;
  }

  const vendor = data.data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vendors
        </Link>
      </div>

      {/* Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            <Store className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{vendor.storeName}</h1>
              <StatusBadge status={vendor.status} />
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${vendor.isOpen ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
              >
                {vendor.isOpen ? "Store Open" : "Store Closed"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Slug: {vendor.slug} • Vendor ID: {vendor.id}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {vendor.status !== "APPROVED" && (
            <button
              onClick={() => mutation.mutate({ status: "APPROVED" })}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Store
            </button>
          )}

          {vendor.status !== "REJECTED" && (
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject Application
            </button>
          )}

          {vendor.status !== "SUSPENDED" && vendor.status === "APPROVED" && (
            <button
              onClick={() => mutation.mutate({ status: "SUSPENDED" })}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />
              Suspend Store
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Reject Vendor Application</h3>
            <p className="text-sm text-muted-foreground">
              Please state the reason for rejecting this vendor application:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate({ status: "REJECTED", reason: rejectionReason })}
                disabled={mutation.isPending || !rejectionReason.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{vendor._count.products}</div>
            <div className="text-xs text-muted-foreground font-medium">Total Products</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{vendor._count.orders}</div>
            <div className="text-xs text-muted-foreground font-medium font-medium">
              Total Orders
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{vendor._count.reviews}</div>
            <div className="text-xs text-muted-foreground font-medium">Reviews</div>
          </div>
        </div>
      </div>

      {/* Documents & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Owner Info */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Store Account & Contact
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner Name:</span>
              <span className="font-medium">{vendor.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner Email:</span>
              <span className="font-medium">{vendor.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Store Phone:</span>
              <span className="font-medium">{vendor.phone ?? vendor.user.phone ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium">
                {vendor.city ? `${vendor.addressLine1 ?? ""}, ${vendor.city}` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registered On:</span>
              <span className="font-medium">
                {format(new Date(vendor.createdAt), "MMM dd, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* Documents list */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Submitted Documents ({vendor.documents.length})
          </h2>
          {vendor.documents.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No verification documents submitted yet.
            </div>
          ) : (
            <div className="space-y-2">
              {vendor.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{doc.type}</span>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    View File ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
