"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, Phone, Calendar, Shield, MapPin, ShoppingBag } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { format } from "date-fns";

interface CustomerDetailProps {
  id: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  customerProfile: {
    id: string;
    defaultAddressId: string | null;
    createdAt: string;
  } | null;
  _count: {
    addresses: number;
    notifications: number;
  };
}

async function fetchCustomer(id: string): Promise<{ success: boolean; data: UserDetail }> {
  const res = await fetch(`/api/v1/admin/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch customer details");
  return res.json();
}

async function updateStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to update status");
  }
}

export function CustomerDetail({ id }: CustomerDetailProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => fetchCustomer(id),
  });

  const mutation = useMutation({
    mutationFn: (status: string) => updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Customer status updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading customer details...
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading customer. Customer may not exist.
      </div>
    );
  }

  const user = data.data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
              <StatusBadge status={user.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">Customer ID: {user.id}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {user.status !== "ACTIVE" && (
            <button
              onClick={() => mutation.mutate("ACTIVE")}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              Activate
            </button>
          )}
          {user.status !== "SUSPENDED" && (
            <button
              onClick={() => mutation.mutate("SUSPENDED")}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              Suspend
            </button>
          )}
          {user.status !== "DEACTIVATED" && (
            <button
              onClick={() => mutation.mutate("DEACTIVATED")}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Contact & Identity
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground font-medium">Email:</span>
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground font-medium">Phone:</span>
              <span>{user.phone ?? "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground font-medium">Email Verified:</span>
              <span>{user.emailVerified ? "Yes ✓" : "No ✗"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground font-medium">Joined:</span>
              <span>{format(new Date(user.createdAt), "MMM dd, yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Account Summary
          </h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-2xl font-bold">{user._count.addresses}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">Saved Addresses</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-2xl font-bold">{user._count.notifications}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">Notifications</div>
            </div>
          </div>
        </div>

        {/* Profile Status */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Profile Status
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer Profile:</span>
              <span className="font-medium">
                {user.customerProfile ? "Active" : "Not Initialized"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Default Address:</span>
              <span className="font-mono text-xs">
                {user.customerProfile?.defaultAddressId ?? "None"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
