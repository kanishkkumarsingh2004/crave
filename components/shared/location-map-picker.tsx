"use client";

import React from "react";
import { PremiumMapPicker, type MapcnLocation } from "./premium-map-picker";

interface LocationMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  onChange: (loc: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  }) => void;
}

export function LocationMapPicker(props: LocationMapPickerProps) {
  return (
    <PremiumMapPicker
      latitude={props.latitude}
      longitude={props.longitude}
      address={props.address}
      city={props.city}
      state={props.state}
      postalCode={props.postalCode}
      onChange={(loc: MapcnLocation) => {
        props.onChange({
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          postalCode: loc.postalCode,
        });
      }}
    />
  );
}

