import { useState, useEffect } from 'react';
import ConfigView from './components/ConfigView';
import StartClockView from './components/StartClockView';
import type { StartList } from './types';
import { loadConfig, saveConfig } from './utils/storage';
import { virtualClock } from './utils/virtualClock';

function App() {
  const [startList, setStartList] = useState<StartList | null>(null);
  const [selectedStartName, setSelectedStartName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Load cached start list and selected start name on mount
  useEffect(() => {
    const config = loadConfig();
    if (config?.cachedStartList) {
      setStartList(config.cachedStartList);
    }
    if (config?.selectedStartName) {
      setSelectedStartName(config.selectedStartName);
    }
    setIsLoading(false);
  }, []);

  const handleStartListLoaded = (newStartList: StartList) => {
    setStartList(newStartList);
    setShowConfig(false);
  };

  const handleStartNameChange = (startName: string) => {
    setSelectedStartName(startName);
    // Save to config
    const config = loadConfig();
    saveConfig({
      ...config,
      selectedStartName: startName,
    });
  };

  const handleReset = () => {
    setShowConfig(true);
  };

  const handleCloseConfig = () => {
    setShowConfig(false);

    // Resetoi simulaatio jos se on päällä
    if (virtualClock.isEnabled() && startList) {
      virtualClock.activateForStartList(startList);
    }
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
      {startList && !showConfig ? (
        <StartClockView
          startList={startList}
          onReset={handleReset}
          selectedStartName={selectedStartName}
        />
      ) : (
        <ConfigView
          onStartListLoaded={handleStartListLoaded}
          startList={startList || undefined}
          selectedStartName={selectedStartName}
          onStartNameChange={handleStartNameChange}
          onClose={startList ? handleCloseConfig : undefined}
        />
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
