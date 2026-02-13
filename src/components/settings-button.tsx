"use client";

import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings-dialog";

export function SettingsButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <SettingsDialog />;
}
