"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { MapcnLocation, MapcnProps } from "@/components/ui/map";

export type { MapcnLocation };

export interface PremiumMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  onChange: (loc: MapcnLocation) => void;
  height?: string;
  interactive?: boolean;
}

const MapcnComponent = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.Mapcn),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[380px] bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500">Loading Mapcn & MapLibre GL...</span>
      </div>
    ),
  },
);

export function PremiumMapPicker(props: PremiumMapPickerProps) {
  return <MapcnComponent {...props} />;
}
