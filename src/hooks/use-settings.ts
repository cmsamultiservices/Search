import { useState, useEffect } from 'react';

export type Section = {
  id: string;
  label: string;
  description?: string;
  documentsPath: string;
  statsPath: string;
  indexPaths?: string[];
};

export interface Settings {
  indexPaths: string[];
  appTitle: string;
  appSubtitle: string;
  logoUrl: string;
  showAppTitle: boolean;
  showAppSubtitle: boolean;
  useAbrirAdobe?: boolean;
  fileExtensions: string[];
  sections: Section[];
}

export const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'libros',
    label: 'Libros',
    description: 'Busca libros y PDFs',
    documentsPath: '/data/documents-libros.json',
    statsPath: '/data/search-stats-libros.json',
    indexPaths: [],
  },
  {
    id: 'curriculum',
    label: 'Curriculum',
    description: 'CVs y perfiles profesionales',
    documentsPath: '/data/documents-curriculum.json',
    statsPath: '/data/search-stats-curriculum.json',
    indexPaths: [],
  },
];

const DEFAULT_SETTINGS: Settings = {
  indexPaths: [],
  appTitle: 'FileFinder',
  appSubtitle: 'Find your local files instantly',
  logoUrl: '',
  showAppTitle: true,
  showAppSubtitle: true,
  useAbrirAdobe: false,
  fileExtensions: ['pdf', 'docx'],
  sections: DEFAULT_SECTIONS,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración desde API
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoaded(true);
    }
  };

  // Guardar configuración en el servidor (setting.json)
  const updateSettings = async (newSettings: Settings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        let message = 'Failed to save settings';
        try {
          const errorData = await response.json();
          message = errorData?.error || message;
          if (Array.isArray(errorData?.missing) && errorData.missing.length > 0) {
            const preview = errorData.missing.slice(0, 3)
              .map((item: { sectionId: string; path: string }) => `[${item.sectionId}] ${item.path}`)
              .join(' | ');
            message = `${message} ${preview}${errorData.missing.length > 3 ? ' ...' : ''}`;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const data = await response.json();
      setSettings(data.settings || newSettings);
      setError(null);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  };

  const resetSettings = async () => {
    try {
      await updateSettings(DEFAULT_SETTINGS);
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError('Failed to reset settings');
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
