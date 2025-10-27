import type { StartList, Competitor, ClassStart } from '../types';

export async function parseIOF3XML(url: string): Promise<StartList> {
  const response = await fetch(url);
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Parse event info
  const eventElement = xmlDoc.querySelector('Event');
  const eventName = eventElement?.querySelector('Name')?.textContent || 'Unknown Event';
  const eventDateStr = eventElement?.querySelector('StartTime Date')?.textContent || '';
  const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();

  const classesMap = new Map<string, Competitor[]>();
  const allCompetitors: Competitor[] = [];
  const startNamesSet = new Set<string>();

  // Parse class starts
  const classStartElements = xmlDoc.querySelectorAll('ClassStart');

  classStartElements.forEach((classStartEl) => {
    const className = classStartEl.querySelector('Class > Name')?.textContent || 'Unknown';

    // StartName on ClassStart-tason elementti, ei PersonStart-tasolla
    const startName = classStartEl.querySelector('StartName')?.textContent || '';

    // Add startName to set if it exists
    if (startName) {
      startNamesSet.add(startName);
    }

    const personStarts = classStartEl.querySelectorAll('PersonStart');

    personStarts.forEach((personStart) => {
      const person = personStart.querySelector('Person');
      const givenName = person?.querySelector('Name > Given')?.textContent || '';
      const familyName = person?.querySelector('Name > Family')?.textContent || '';
      const personName = `${givenName} ${familyName}`.trim();

      const organisation = personStart.querySelector('Organisation > Name')?.textContent || '';
      const bibNumber = personStart.querySelector('BibNumber')?.textContent || '';
      const controlCard = personStart.querySelector('ControlCard')?.textContent || '';

      const startTimeStr = personStart.querySelector('Start > StartTime')?.textContent;
      if (!startTimeStr) return; // Skip if no start time

      const startTime = new Date(startTimeStr);

      const competitor: Competitor = {
        personName,
        organisation,
        bibNumber,
        controlCard,
        startTime,
        className,
        startName,
      };

      if (!classesMap.has(className)) {
        classesMap.set(className, []);
      }
      classesMap.get(className)!.push(competitor);
      allCompetitors.push(competitor);
    });
  });

  // Sort competitors by start time
  allCompetitors.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const classes: ClassStart[] = Array.from(classesMap.entries()).map(([className, competitors]) => ({
    className,
    competitors: competitors.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
  }));

  return {
    eventName,
    eventDate,
    classes,
    allCompetitors,
    startNames: Array.from(startNamesSet).sort(),
  };
}
