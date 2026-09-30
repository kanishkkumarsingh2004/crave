"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Truck,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Star,
  Navigation,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { format } from "date-fns";

interface DriverDetailProps {
  id: string;
}

interface DriverDocument {
  id: string;
  type: string;
  url: string;
  verifiedAt: string | null;
  createdAt: string;
}

interface DriverDetailData {
  id: string;
  status: string;
  availability: string;
  vehicleType: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  licensePlate: string | null;
  licenseNumber: string | null;
  rating: number;
  totalDeliveries: number;
  approvedAt: string | null;
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
  documents: DriverDocument[];
  _count: {
    deliveries: number;
    assignments: number;
  };
}

async function fetchDriver(id: string): Promise<{ success: boolean; data: DriverDetailData }> {
  const res = await fetch(`/api/v1/admin/drivers/${id}`);
  if (!res.ok) throw new Error("Failed to fetch driver details");
  return res.json();
}

async function updateDriverStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/drivers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to update driver status");
  }
}

export function DriverDetail({ id }: DriverDetailProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["driver", id],
    queryFn: () => fetchDriver(id),
  });

  const mutation = useMutation({
    mutationFn: (status: string) => updateDriverStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast.success("Driver status updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading driver details...
      </div>
    );
  }

  if (isError || !data?.data) {
    return <div className="p-8 text-center text-red-500">Error loading driver.</div>;
  }

  const driver = data.data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/drivers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Drivers
        </Link>
      </div>

      {/* Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            <Truck className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{driver.user.name}</h1>
              <StatusBadge status={driver.status} />
              <StatusBadge status={driver.availability} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Vehicle: {driver.vehicleType ?? "N/A"} • Driver ID: {driver.id}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {driver.status !== "APPROVED" && (
            <button
              onClick={() => mutation.mutate("APPROVED")}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Driver
            </button>
          )}

          {driver.status !== "SUSPENDED" && driver.status === "APPROVED" && (
            <button
              onClick={() => mutation.mutate("SUSPENDED")}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />
              Suspend Driver
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
            <Navigation className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{driver.totalDeliveries}</div>
            <div className="text-xs text-muted-foreground font-medium">Completed Deliveries</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{Number(driver.rating ?? 0).toFixed(1)} / 5.0</div>
            <div className="text-xs text-muted-foreground font-medium">Average Rating</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{driver.documents.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Verified Documents</div>
          </div>
        </div>
      </div>

      {/* Info & Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicle & License Info */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Vehicle & License Details
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle Type:</span>
              <span className="font-medium">{driver.vehicleType ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle Model:</span>
              <span className="font-medium">{driver.vehicleModel ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle Color:</span>
              <span className="font-medium">{driver.vehicleColor ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">License Plate:</span>
              <span className="font-mono text-xs font-semibold">
                {driver.licensePlate ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">License Number:</span>
              <span className="font-mono text-xs font-semibold">
                {driver.licenseNumber ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{driver.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{driver.user.phone ?? "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Submitted Documents ({driver.documents.length})
          </h2>
          {driver.documents.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No verification documents submitted yet.
            </div>
          ) : (
            <div className="space-y-2">
              {driver.documents.map((doc) => (
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
