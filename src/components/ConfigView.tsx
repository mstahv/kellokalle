import React, { useState } from 'react';
import type { StartList } from '../types';
import { parseIOF3XML } from '../utils/xmlParser';
import { saveStartList } from '../utils/storage';
import { virtualClock } from '../utils/virtualClock';

interface ConfigViewProps {
  onStartListLoaded: (startList: StartList) => void;
}

const ConfigView: React.FC<ConfigViewProps> = ({ onStartListLoaded }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationEnabled, setSimulationEnabled] = useState(true);

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

      onStartListLoaded(startList);
    } catch (err) {
      setError(`Virhe ladattaessa lähtölistaa: ${err instanceof Error ? err.message : 'Tuntematon virhe'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExample = () => {
    setUrl('https://online.tulospalvelu.fi/tulokset-new/xml/startlist_2025_smyo_1_iof.xml');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Kellokalle 🏃‍♂️⏱️</h1>

        <div style={styles.section}>
          <label style={styles.label}>
            IOF 3 XML lähtölistan URL:
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://online.tulospalvelu.fi/tulokset-new/xml/..."
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

        <div style={styles.buttonGroup}>
          <button
            onClick={handleLoadStartList}
            disabled={loading}
            style={styles.primaryButton}
          >
            {loading ? 'Ladataan...' : 'Lataa lähtölista'}
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
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#333',
    textAlign: 'center',
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
