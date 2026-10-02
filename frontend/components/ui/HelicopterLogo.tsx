"use client";

import React from "react";
import clsx from "clsx";

interface HelicopterLogoProps {
  className?: string;
  size?: number;
  variant?: "badge" | "icon" | "minimal";
  fill?: string;
}

export default function HelicopterLogo({
  className,
  size = 24,
  variant = "badge",
}: HelicopterLogoProps) {
  if (variant === "icon") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx("shrink-0", className)}
      >
        {/* Main Rotor Blades */}
        <line x1="4" y1="7" x2="28" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Rotor Mast & Hub */}
        <line x1="16" y1="7" x2="16" y2="11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="16" cy="7" r="1.5" fill="currentColor" />

        {/* Aerodynamic Cockpit & Fuselage */}
        <path
          d="M16 11H20C23.5 11 25.5 13.5 25.5 17C25.5 20.5 23 22 19 22H13C9 22 7.5 19 7.5 16.5C7.5 14 9.5 11 16 11Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Cockpit Windshield */}
        <path
          d="M19 13.5H21C22.8 13.5 23.8 14.8 23.8 16.5H19V13.5Z"
          fill="currentColor"
          fillOpacity="0.4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Tail Boom */}
        <path
          d="M10 16L3 17V15L10 15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Tail Rotor & Vertical Fin */}
        <line x1="3" y1="12" x2="3" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 13.5L1 14.5V17.5L3 18.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />

        {/* Landing Skids */}
        {/* Forward & Aft Struts */}
        <line x1="13" y1="22" x2="12" y2="25.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="19" y1="22" x2="20" y2="25.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {/* Horizontal Skid Runner */}
        <path
          d="M9 25.5H23C24 25.5 24.5 25 24.8 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "minimal") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx("shrink-0", className)}
      >
        {/* Rotor */}
        <path d="M3 5H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 5V8" stroke="currentColor" strokeWidth="1.8" />
        {/* Body */}
        <path
          d="M12 8C16 8 19 9.5 19 13C19 16 16.5 17 14 17H10C6.5 17 6 14.5 6 12.5C6 10 8 8 12 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Tail */}
        <path d="M7 12H2V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M2 9V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {/* Skid */}
        <path d="M9 17L8 20H17L16 17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M6 20H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // Default "badge" variant with aerospace gradient
  return (
    <div
      className={clsx(
        "rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={Math.round(size * 0.65)}
        height={Math.round(size * 0.65)}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main Rotor Blades */}
        <line x1="3" y1="6.5" x2="29" y2="6.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        {/* Rotor Mast & Hub */}
        <line x1="16" y1="6.5" x2="16" y2="10.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="16" cy="6.5" r="1.6" fill="white" />

        {/* Aerodynamic Cockpit & Fuselage */}
        <path
          d="M16 10.5H20C23.8 10.5 26 13 26 16.8C26 20.5 23.5 22 19 22H12.5C8.5 22 7 19 7 16.5C7 13.5 9 10.5 16 10.5Z"
          stroke="white"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Cockpit Windshield */}
        <path
          d="M19 13H21.5C23.2 13 24.2 14.2 24.2 16H19V13Z"
          fill="white"
          fillOpacity="0.45"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Tail Boom */}
        <path
          d="M9.5 16L3 17V15L9.5 15"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Tail Rotor & Vertical Fin */}
        <line x1="3" y1="11.5" x2="3" y2="20.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M3 13L1 14V18L3 19" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />

        {/* Landing Skids */}
        <line x1="12.5" y1="22" x2="11.5" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="19.5" y1="22" x2="20.5" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M8.5 26H23.5C24.5 26 25 25.5 25.5 24.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
