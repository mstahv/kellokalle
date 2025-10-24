import { useState, useEffect } from 'react';
import ConfigView from './components/ConfigView';
import StartClockView from './components/StartClockView';
import type { StartList } from './types';
import { loadConfig } from './utils/storage';

function App() {
  const [startList, setStartList] = useState<StartList | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load cached start list on mount
  useEffect(() => {
    const config = loadConfig();
    if (config?.cachedStartList) {
      setStartList(config.cachedStartList);
    }
    setIsLoading(false);
  }, []);

  const handleStartListLoaded = (newStartList: StartList) => {
    setStartList(newStartList);
  };

  const handleReset = () => {
    setStartList(null);
  };

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Ladataan...</div>
      </div>
    );
  }

  return (
    <>
      {startList ? (
        <StartClockView startList={startList} onReset={handleReset} />
      ) : (
        <ConfigView onStartListLoaded={handleStartListLoaded} />
      )}
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  loadingText: {
    fontSize: '32px',
    color: 'white',
    fontWeight: 'bold',
  },
};

export default App;
