import { useState, useEffect } from "react";
import {
  DEFAULT_SECTIONS,
  DEFAULT_SETTINGS,
  type Section,
  type Settings,
} from "@/lib/settings";

export type { Section, Settings };
export { DEFAULT_SECTIONS };

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = (await response.json()) as Settings;
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error("Error loading settings:", err);
      setError("Failed to load settings");
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoaded(true);
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        let message = "Failed to save settings";
        try {
          const errorData = await response.json();
          message = errorData?.error || message;
          if (Array.isArray(errorData?.missing) && errorData.missing.length > 0) {
            const preview = errorData.missing
              .slice(0, 3)
              .map((item: { sectionId: string; path: string }) => `[${item.sectionId}] ${item.path}`)
              .join(" | ");
            message = `${message} ${preview}${errorData.missing.length > 3 ? " ..." : ""}`;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const data = await response.json();
      setSettings((data.settings || newSettings) as Settings);
      setError(null);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings");
      throw err;
    }
  };

  const resetSettings = async () => {
    try {
      await updateSettings(DEFAULT_SETTINGS);
    } catch (err) {
      console.error("Error resetting settings:", err);
      setError("Failed to reset settings");
      throw err;
    }
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
    error,
  };
}
