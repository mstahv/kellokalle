export interface Competitor {
  personName: string;
  organisation: string;
  bibNumber: string; // Kilpailunumero
  controlCard: string; // Kilpailukortti (emit)
  startTime: Date;
  className: string;
  startName: string; // Lähtöpaikka (esim. "Start 1")
}

export interface ClassStart {
  className: string;
  competitors: Competitor[];
}

export interface StartList {
  eventName: string;
  eventDate: Date;
  classes: ClassStart[];
  allCompetitors: Competitor[]; // Sorted by start time
  startNames: string[]; // Kaikki lähtöpaikat (esim. ["Start 1", "Start 2"])
}

export interface Competition {
  name: string;
  date: string;
  url: string;
}

export interface AppConfig {
  startListUrl?: string;
  selectedCompetition?: Competition;
  cachedStartList?: StartList;
  lastUpdated?: number;
  selectedStartName?: string; // Valittu lähtöpaikka
}
