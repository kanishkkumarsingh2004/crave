import React from 'react'

interface CraveXPDeliveryIllustrationProps {
  className?: string
}

export default function CraveXPDeliveryIllustration({
  className = '',
}: CraveXPDeliveryIllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none overflow-visible ${className}`}
      role="img"
      aria-label="CraveXP Instant 10-Minute Delivery Illustration"
    >
      <defs>
        {/* Soft Chartreuse Ambient Glow */}
        <radialGradient
          id="xpGlow"
          cx="60%"
          cy="50%"
          r="50%"
          fx="60%"
          fy="50%"
        >
          <stop offset="0%" stopColor="#d9f447" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>

        {/* Speed Beam Gradient */}
        <linearGradient id="speedBeam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d9f447" stopOpacity="0" />
          <stop offset="70%" stopColor="#d9f447" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d9f447" stopOpacity="0.8" />
        </linearGradient>

        {/* Emerald Trail Gradient */}
        <linearGradient id="emeraldTrail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="80%" stopColor="#10b981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#d9f447" stopOpacity="0.9" />
        </linearGradient>

        {/* Headlight Beam */}
        <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d9f447" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#d9f447" stopOpacity="0" />
        </linearGradient>

        {/* Glass reflection */}
        <linearGradient id="glassReflect" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Ambient Radial Lighting Field */}
      <circle cx="180" cy="110" r="110" fill="url(#xpGlow)" />

      {/* Background Speed Wind Trails */}
      <path
        d="M20 70 C70 70, 110 65, 160 65"
        stroke="url(#speedBeam)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 8"
        opacity="0.7"
      />
      <path
        d="M10 115 C60 115, 100 112, 140 112"
        stroke="url(#emeraldTrail)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="12 10"
        opacity="0.85"
      />
      <path
        d="M35 155 C80 155, 120 152, 165 152"
        stroke="url(#speedBeam)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="8 6"
        opacity="0.6"
      />

      {/* Ground Speed Track & Grid Reflection */}
      <ellipse cx="185" cy="182" rx="100" ry="8" fill="#10b981" opacity="0.12" />
      <line
        x1="70"
        y1="182"
        x2="290"
        y2="182"
        stroke="#27382f"
        strokeWidth="2"
        strokeDasharray="16 12"
      />
      <line
        x1="110"
        y1="188"
        x2="270"
        y2="188"
        stroke="#d9f447"
        strokeWidth="1.5"
        strokeDasharray="8 16"
        opacity="0.4"
      />

      {/* Headlight Forward Cone */}
      <polygon
        points="248,126 315,115 315,145"
        fill="url(#headlightBeam)"
        opacity="0.45"
      />

      {/* --- DELIVERY E-SCOOTER & RIDER GROUP --- */}
      <g transform="translate(10, 0)">
        {/* Back Wheel */}
        <circle cx="125" cy="172" r="22" fill="#0d1410" stroke="#26362e" strokeWidth="5" />
        <circle cx="125" cy="172" r="16" fill="#141f18" stroke="#d9f447" strokeWidth="2.5" />
        <circle cx="125" cy="172" r="6" fill="#d9f447" />

        {/* Front Wheel */}
        <circle cx="235" cy="172" r="22" fill="#0d1410" stroke="#26362e" strokeWidth="5" />
        <circle cx="235" cy="172" r="16" fill="#141f18" stroke="#d9f447" strokeWidth="2.5" />
        <circle cx="235" cy="172" r="6" fill="#d9f447" />

        {/* Main Scooter Chassis Frame */}
        <path
          d="M125 172 L160 168 L190 168 L220 148 L235 172"
          stroke="#1d2a22"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Neon Accent Strut */}
        <path
          d="M160 168 L190 168 L225 142"
          stroke="#d9f447"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Front Steering Column & Handlebars */}
        <path
          d="M225 142 L238 108 L228 106"
          stroke="#e5f0ea"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="228" cy="106" r="3.5" fill="#d9f447" />
        {/* LED Headlamp */}
        <path
          d="M242 122 L248 126 L242 130 Z"
          fill="#d9f447"
        />

        {/* Courier Trunk / Insulated Grocery Cargo Box */}
        <g transform="translate(105, 95)">
          {/* Main Box Outer */}
          <rect
            x="0"
            y="10"
            width="46"
            height="44"
            rx="8"
            fill="#121b16"
            stroke="#2a3d32"
            strokeWidth="2"
          />
          {/* Box Glass Top Shimmer */}
          <rect
            x="3"
            y="13"
            width="40"
            height="16"
            rx="5"
            fill="url(#glassReflect)"
          />
          {/* CraveXP Brandmark on Cargo Box */}
          <rect
            x="8"
            y="26"
            width="30"
            height="18"
            rx="4"
            fill="#18231c"
            stroke="#d9f447"
            strokeWidth="1.2"
          />
          <text
            x="23"
            y="39"
            fill="#d9f447"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            fontSize="10"
            textAnchor="middle"
            letterSpacing="-0.5px"
          >
            XP⚡
          </text>
        </g>

        {/* Fresh Grocery Items Peeking from Courier Pack */}
        <g transform="translate(112, 75)">
          {/* Artisan Baguette */}
          <path
            d="M6 30 L16 8 C18 4, 22 5, 23 9 L20 30 Z"
            fill="#c99757"
            stroke="#e2b474"
            strokeWidth="1.2"
          />
          <line x1="12" y1="18" x2="16" y2="15" stroke="#966730" strokeWidth="1" />
          <line x1="14" y1="23" x2="18" y2="20" stroke="#966730" strokeWidth="1" />

          {/* Farm Green Leaves / Fresh Produce */}
          <path
            d="M26 28 C26 18, 33 12, 36 14 C38 18, 34 26, 31 28 Z"
            fill="#10b981"
          />
          <path
            d="M20 28 C18 20, 24 16, 27 18 C28 22, 24 28, 22 28 Z"
            fill="#34d399"
          />

          {/* Glass Milk Bottle Silhouette */}
          <rect
            x="0"
            y="16"
            width="8"
            height="16"
            rx="2"
            fill="#f0fdf4"
            opacity="0.9"
          />
          <rect
            x="2"
            y="13"
            width="4"
            height="4"
            rx="1"
            fill="#d9f447"
          />
        </g>

        {/* Rider Body & Torso */}
        <path
          d="M152 142 L168 124 L190 128 L202 152"
          fill="#16221b"
          stroke="#26382e"
          strokeWidth="3"
        />
        {/* Rider Arms Reaching to Handlebars */}
        <path
          d="M178 126 L210 114 L228 108"
          stroke="#1f2e25"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Rider Sleek Dark Helmet */}
        <circle cx="178" cy="98" r="14" fill="#0d1410" stroke="#2a3d32" strokeWidth="2.5" />
        {/* Neon Aerodynamic Helmet Visor */}
        <path
          d="M182 92 C190 92, 194 98, 192 104 L180 102 Z"
          fill="#d9f447"
        />
      </g>

      {/* Floating Speed & Freshness Badges */}
      <g transform="translate(225, 30)">
        {/* Floating 10-Min Flash Badge */}
        <rect
          x="0"
          y="0"
          width="74"
          height="28"
          rx="14"
          fill="#101914"
          stroke="#d9f447"
          strokeWidth="1.5"
          filter="drop-shadow(0 4px 12px rgba(217, 244, 71, 0.25))"
        />
        <circle cx="14" cy="14" r="5" fill="#d9f447" />
        <path
          d="M13 11 L16 14 L12 17"
          stroke="#101914"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="44"
          y="18"
          fill="#ffffff"
          fontFamily="system-ui, sans-serif"
          fontWeight="900"
          fontSize="11"
          letterSpacing="0.2px"
          textAnchor="middle"
        >
          10 MINS
        </text>
      </g>

      {/* Sparkles / Electric Stars */}
      {/* Sparkle 1 */}
      <g transform="translate(85, 42)">
        <path
          d="M6 0 L7.5 4.5 L12 6 L7.5 7.5 L6 12 L4.5 7.5 L0 6 L4.5 4.5 Z"
          fill="#d9f447"
        />
      </g>
      {/* Sparkle 2 */}
      <g transform="translate(295, 78)">
        <path
          d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z"
          fill="#34d399"
        />
      </g>
      {/* Sparkle 3 */}
      <g transform="translate(60, 135)">
        <circle cx="3" cy="3" r="2" fill="#d9f447" opacity="0.8" />
      </g>
    </svg>
  )
}
