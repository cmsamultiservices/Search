"use client";

import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (isLoaded) {
      const stored = localStorage.getItem('file-finder-theme');
      const theme = stored || 'system';
      
      const htmlElement = document.documentElement;
      const actualTheme = theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

      if (actualTheme === 'dark') {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
    }
  }, [isLoaded]);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
