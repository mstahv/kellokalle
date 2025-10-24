export interface Competitor {
  personName: string;
  organisation: string;
  bibNumber: string; // Kilpailunumero
  controlCard: string; // Kilpailukortti (emit)
  startTime: Date;
  className: string;
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
}
