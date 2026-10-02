"use client";

import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";

interface StartButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export default function StartButton({ onClick, isLoading }: StartButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="btn-primary text-sm px-7 py-3.5"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Launching...</span>
        </>
      ) : (
        <>
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}
