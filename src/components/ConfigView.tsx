import React, { useState, useEffect } from 'react';
import type { StartList } from '../types';
import { parseIOF3XML } from '../utils/xmlParser';
import { saveStartList, loadConfig } from '../utils/storage';
import { virtualClock } from '../utils/virtualClock';

interface Event {
  EventID: string;
  EventTitle: string;
  Discipline: string;
  CurrentRace: number;
}

interface ConfigViewProps {
  onStartListLoaded: (startList: StartList) => void;
  startList?: StartList;
  selectedStartName?: string;
  onStartNameChange?: (startName: string) => void;
  onClose?: () => void;
}

const ConfigView: React.FC<ConfigViewProps> = ({
  onStartListLoaded,
  startList,
  selectedStartName,
  onStartNameChange,
  onClose
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationEnabled, setSimulationEnabled] = useState(true);
  const [showStartNameDialog, setShowStartNameDialog] = useState(false);
  const [loadedStartList, setLoadedStartList] = useState<StartList | null>(null);
  const [showEventBrowser, setShowEventBrowser] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  // Lataa tallennettu URL kun komponentti mounttaa
  useEffect(() => {
    const config = loadConfig();
    if (config?.startListUrl) {
      setUrl(config.startListUrl);
    }
  }, []);

  const handleLoadStartList = async () => {
    if (!url.trim()) {
      setError('Anna XML-tiedoston URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startList = await parseIOF3XML(url);
      saveStartList(startList, url);

      // Aktivoi virtuaalikello jos simulaatio on päällä
      if (simulationEnabled) {
        virtualClock.activateForStartList(startList);
      } else {
        virtualClock.disable();
      }

      // Jos lähtöpaikkoja on useampi kuin yksi, näytä valintadialogi
      if (startList.startNames.length > 1) {
        setLoadedStartList(startList);
        setShowStartNameDialog(true);
      } else {
        // Muuten siirry suoraan lähtökellonäkymään
        onStartListLoaded(startList);
      }
    } catch (err) {
      setError(`Virhe ladattaessa lähtölistaa: ${err instanceof Error ? err.message : 'Tuntematon virhe'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNameSelected = (startName: string) => {
    if (onStartNameChange) {
      onStartNameChange(startName);
    }
    setShowStartNameDialog(false);
    if (loadedStartList) {
      onStartListLoaded(loadedStartList);
    }
  };

  const handleSkipStartNameSelection = () => {
    setShowStartNameDialog(false);
    if (loadedStartList) {
      onStartListLoaded(loadedStartList);
    }
  };

  const handleLoadExample = () => {
    setUrl('https://online.tulospalvelu.fi/tulokset-new/xml/startlist_2025_viking_1_iof.xml');
  };

  const handleBrowseEvents = async () => {
    setShowEventBrowser(true);
    setLoadingEvents(true);
    setEventsError(null);

    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`https://online.tulospalvelu.fi/tulokset-new/online/online_events_dt.json?Year=${currentYear}`);
      if (!response.ok) {
        throw new Error('Tapahtumien haku epäonnistui');
      }

      const data = await response.json();
      const eventList: Event[] = data.data.map((event: any) => ({
        EventID: event.EventID,
        EventTitle: event.EventTitle,
        Discipline: event.Discipline,
        CurrentRace: event.CurrentRace || 1,
      }));

      setEvents(eventList);
    } catch (err) {
      setEventsError(`Virhe ladattaessa tapahtumia: ${err instanceof Error ? err.message : 'Tuntematon virhe'}`);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSelectEvent = (event: Event) => {
    // Muodosta startlist URL EventID:stä ja race numberista
    const startlistUrl = `https://online.tulospalvelu.fi/tulokset-new/xml/startlist_${event.EventID}_${event.CurrentRace}_iof.xml`;
    setUrl(startlistUrl);
    setShowEventBrowser(false);
  };

  const handleCloseEventBrowser = () => {
    setShowEventBrowser(false);
  };

  return (
    <div style={styles.container}>
      {showEventBrowser && (
        <div style={styles.dialogOverlay}>
          <div style={styles.eventBrowserDialog}>
            <div style={styles.eventBrowserHeader}>
              <h2 style={styles.dialogTitle}>Selaa tapahtumia {new Date().getFullYear()}</h2>
              <button onClick={handleCloseEventBrowser} style={styles.closeButton}>
                ✕
              </button>
            </div>

            {loadingEvents ? (
              <div style={styles.eventBrowserLoading}>Ladataan tapahtumia...</div>
            ) : eventsError ? (
              <div style={styles.error}>{eventsError}</div>
            ) : (
              <div style={styles.eventsList}>
                {events.map((event) => (
                  <div
                    key={event.EventID}
                    style={{
                      ...styles.eventItem,
                      ...(hoveredEventId === event.EventID ? styles.eventItemHovered : {}),
                    }}
                    onClick={() => handleSelectEvent(event)}
                    onMouseEnter={() => setHoveredEventId(event.EventID)}
                    onMouseLeave={() => setHoveredEventId(null)}
                  >
                    <div style={styles.eventTitle}>{event.EventTitle}</div>
                    <div style={styles.eventMeta}>
                      {event.Discipline} • Race {event.CurrentRace} • {event.EventID}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showStartNameDialog && loadedStartList && (
        <div style={styles.dialogOverlay}>
          <div style={styles.dialogCard}>
            <h2 style={styles.dialogTitle}>Valitse lähtöpaikka</h2>
            <p style={styles.dialogText}>
              Kilpailussa on useita lähtöpaikkoja. Valitse lähtöpaikka jonka lähtijät haluat näyttää:
            </p>
            <div style={styles.dialogButtons}>
              <button
                onClick={() => handleStartNameSelected('')}
                style={styles.dialogButtonSecondary}
              >
                Kaikki lähdöt
              </button>
              {loadedStartList.startNames.map((name) => (
                <button
                  key={name}
                  onClick={() => handleStartNameSelected(name)}
                  style={styles.dialogButtonPrimary}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              onClick={handleSkipStartNameSelection}
              style={styles.dialogButtonSkip}
            >
              Ohita valinta (käytä kaikki lähdöt)
            </button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Kellokalle 🏃‍♂️⏱️</h1>
          {startList && onClose && (
            <button onClick={onClose} style={styles.closeButton}>
              ✕ Sulje
            </button>
          )}
        </div>

        {startList && (
          <div style={styles.currentCompetition}>
            <div style={styles.currentCompetitionTitle}>Ladattu kilpailu:</div>
            <div style={styles.currentCompetitionName}>{startList.eventName}</div>
            {url && (
              <div style={styles.currentCompetitionUrl}>
                {url.length > 60 ? `${url.substring(0, 60)}...` : url}
              </div>
            )}
          </div>
        )}

        <div style={styles.section}>
          <label style={styles.label}>
            IOF 3 XML lähtölistan URL:
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://online.tulospalvelu.fi/tulokset-new/xml/startlist_2025_viking_1_iof.xml"
            style={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && handleLoadStartList()}
          />
        </div>

        <div style={styles.section}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={simulationEnabled}
              onChange={(e) => setSimulationEnabled(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>
              Simulaatiotila (virtuaalikello alkaa 1 min ennen ensimmäistä lähtöä)
            </span>
          </label>
          {simulationEnabled && (
            <div style={styles.infoBox}>
              ℹ️ Simulaatiotilassa kello alkaa automaattisesti minuutti ennen ensimmäistä lähtöä. Tämä on hyödyllinen testaukseen ja esittelyihin.
            </div>
          )}
        </div>

        {startList && startList.startNames.length > 1 && (
          <div style={styles.section}>
            <label style={styles.label}>
              Lähtöpaikka:
            </label>
            <select
              value={selectedStartName || ''}
              onChange={(e) => onStartNameChange?.(e.target.value)}
              style={styles.select}
            >
              <option value="">Kaikki lähdöt</option>
              {startList.startNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div style={styles.infoBox}>
              ℹ️ Valitse lähtöpaikka näyttääksesi vain kyseisen lähdön lähtijät.
            </div>
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button
            onClick={handleLoadStartList}
            disabled={loading}
            style={styles.primaryButton}
          >
            {loading ? 'Ladataan...' : 'Lataa lähtölista'}
          </button>

          <button
            onClick={handleBrowseEvents}
            style={styles.secondaryButton}
          >
            📅 Selaa tapahtumia
          </button>

          <button
            onClick={handleLoadExample}
            style={styles.secondaryButton}
          >
            Käytä esimerkkiä
          </button>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.info}>
          <h3 style={styles.infoTitle}>Ohjeet:</h3>
          <ul style={styles.infoList}>
            <li>Anna suora URL IOF 3 formaatin XML-tiedostoon</li>
            <li>Voit etsiä kilpailuja osoitteesta: <a href="https://online.tulospalvelu.fi/tulokset-new/en/" target="_blank" rel="noopener noreferrer" style={styles.link}>tulospalvelu.fi</a></li>
            <li>Lähtölista tallennetaan paikallisesti selaimen muistiin</li>
            <li>Ohjelma käynnistyy automaattisesti viimeisimpään lähtölistaan</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    position: 'relative',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    color: '#333',
  },
  closeButton: {
    padding: '8px 16px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#667eea',
    backgroundColor: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  currentCompetition: {
    backgroundColor: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  currentCompetitionTitle: {
    fontSize: '12px',
    color: '#1565c0',
    fontWeight: '600',
    marginBottom: '5px',
    textTransform: 'uppercase',
  },
  currentCompetitionName: {
    fontSize: '18px',
    color: '#0d47a1',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  currentCompetitionUrl: {
    fontSize: '12px',
    color: '#1976d2',
    wordBreak: 'break-all',
  },
  dialogOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  dialogCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  dialogTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333',
  },
  dialogText: {
    fontSize: '16px',
    color: '#555',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  dialogButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px',
  },
  dialogButtonPrimary: {
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#667eea',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  dialogButtonSecondary: {
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#667eea',
    backgroundColor: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  dialogButtonSkip: {
    padding: '10px',
    fontSize: '14px',
    color: '#999',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  eventBrowserDialog: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '80vh',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
  },
  eventBrowserHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  eventBrowserLoading: {
    padding: '40px',
    textAlign: 'center',
    fontSize: '16px',
    color: '#666',
  },
  eventsList: {
    maxHeight: '60vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  eventItem: {
    padding: '15px 20px',
    backgroundColor: '#f5f7fa',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  eventItemHovered: {
    backgroundColor: '#e3f2fd',
    borderColor: '#667eea',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
  },
  eventTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  eventMeta: {
    fontSize: '13px',
    color: '#666',
  },
  section: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#555',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s',
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.3s',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  primaryButton: {
    flex: 1,
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#667eea',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  secondaryButton: {
    flex: 1,
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#667eea',
    backgroundColor: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  info: {
    backgroundColor: '#f5f7fa',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px',
  },
  infoTitle: {
    fontSize: '18px',
    marginBottom: '10px',
    color: '#333',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#555',
    lineHeight: '1.8',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#333',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginRight: '10px',
    cursor: 'pointer',
  },
  checkboxText: {
    userSelect: 'none',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '10px',
    fontSize: '14px',
    lineHeight: '1.6',
  },
};

export default ConfigView;
