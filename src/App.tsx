import { useState, useEffect } from 'react';
import ConfigView from './components/ConfigView';
import StartClockView from './components/StartClockView';
import type { StartList } from './types';
import { loadConfig, saveConfig } from './utils/storage';
import { virtualClock } from './utils/virtualClock';

function App() {
  const [startList, setStartList] = useState<StartList | null>(null);
  const [selectedStartName, setSelectedStartName] = useState<string>('');
  const [callUpTime, setCallUpTime] = useState<number>(300);
  const [simulationEnabled, setSimulationEnabled] = useState(true);
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
    if (config?.callUpTime !== undefined) {
      setCallUpTime(config.callUpTime);
    }
    if (config?.simulationEnabled !== undefined) {
      setSimulationEnabled(config.simulationEnabled);
    }
    setIsLoading(false);
  }, []);

  const handleStartListLoaded = (newStartList: StartList) => {
    setStartList(newStartList);
    setShowConfig(false);
  };

  const handleStartNameChange = (startName: string) => {
    setSelectedStartName(startName);
    const config = loadConfig();
    saveConfig({
      ...config,
      selectedStartName: startName,
    });
  };

  const handleCallUpTimeChange = (seconds: number) => {
    setCallUpTime(seconds);
    const config = loadConfig();
    saveConfig({
      ...config,
      callUpTime: seconds,
    });
  };

  const handleReset = () => {
    setShowConfig(true);
  };

  const handleSimulationChange = (enabled: boolean) => {
    setSimulationEnabled(enabled);
    const config = loadConfig();
    saveConfig({
      ...config,
      simulationEnabled: enabled,
    });
  };

  const handleCloseConfig = () => {
    setShowConfig(false);

    // Aseta simulaatiotila checkboxin mukaan
    if (startList) {
      if (simulationEnabled) {
        virtualClock.activateForStartList(startList);
      } else {
        virtualClock.disable();
      }
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
          callUpTime={callUpTime}
        />
      ) : (
        <ConfigView
          onStartListLoaded={handleStartListLoaded}
          startList={startList || undefined}
          selectedStartName={selectedStartName}
          onStartNameChange={handleStartNameChange}
          callUpTime={callUpTime}
          onCallUpTimeChange={handleCallUpTimeChange}
          simulationEnabled={simulationEnabled}
          onSimulationChange={handleSimulationChange}
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
