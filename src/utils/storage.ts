import type { AppConfig, StartList } from '../types';

const STORAGE_KEY = 'kellokalle-config';

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export function loadConfig(): AppConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const config = JSON.parse(stored);

    // Parse dates back from JSON
    if (config.cachedStartList) {
      config.cachedStartList.eventDate = new Date(config.cachedStartList.eventDate);
      config.cachedStartList.allCompetitors = config.cachedStartList.allCompetitors.map((c: any) => ({
        ...c,
        startTime: new Date(c.startTime),
      }));
      config.cachedStartList.classes = config.cachedStartList.classes.map((cls: any) => ({
        ...cls,
        competitors: cls.competitors.map((c: any) => ({
          ...c,
          startTime: new Date(c.startTime),
        })),
      }));
    }

    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    return null;
  }
}

export function saveStartList(startList: StartList, url: string): void {
  const config: AppConfig = {
    startListUrl: url,
    cachedStartList: startList,
    lastUpdated: Date.now(),
  };
  saveConfig(config);
}
