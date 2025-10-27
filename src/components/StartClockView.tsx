import React, { useState, useEffect, useCallback } from 'react';
import type { StartList, Competitor } from '../types';
import { audioService } from '../utils/audioService';
import { speechService } from '../utils/speechService';
import { virtualClock } from '../utils/virtualClock';

interface StartClockViewProps {
  startList: StartList;
  onReset: () => void;
  selectedStartName?: string;
}

const StartClockView: React.FC<StartClockViewProps> = ({ startList, onReset, selectedStartName }) => {
  const [currentTime, setCurrentTime] = useState(virtualClock.getCurrentTime());
  const [nextCompetitors, setNextCompetitors] = useState<Competitor[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastStartTime, setLastStartTime] = useState<number | null>(null);
  const [isSimulation] = useState(virtualClock.isEnabled());
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Update current time every 100ms for smooth countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(virtualClock.getCurrentTime());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Find next competitors
  useEffect(() => {
    const now = currentTime.getTime();

    // Filter competitors by selected start name if specified
    const filteredCompetitors = selectedStartName
      ? startList.allCompetitors.filter((c) => c.startName === selectedStartName)
      : startList.allCompetitors;

    const upcoming = filteredCompetitors.filter(
      (c) => c.startTime.getTime() > now
    );

    if (upcoming.length > 0) {
      const nextStartTime = upcoming[0].startTime.getTime();
      const competitorsAtSameTime = upcoming.filter(
        (c) => c.startTime.getTime() === nextStartTime
      );
      setNextCompetitors(competitorsAtSameTime);

      const timeToStart = Math.floor((nextStartTime - now) / 1000);
      setCountdown(timeToStart);
    } else {
      setNextCompetitors([]);
      setCountdown(null);
    }
  }, [currentTime, startList, selectedStartName]);

  // Handle start sequence (beeps and speech)
  const handleStartSequence = useCallback(async (currentCompetitors: Competitor[], allCompetitors: Competitor[], filterByStartName?: string) => {
    try {
      // Resume audio context
      await audioService.resume();

      // Play beep sequence
      await audioService.playStartSequence();

      // Wait 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Find NEXT start after current one
      if (speechService.isSupported() && currentCompetitors.length > 0) {
        const currentStartTime = currentCompetitors[0].startTime.getTime();

        // Filter by start name if specified
        const filteredCompetitors = filterByStartName
          ? allCompetitors.filter((c) => c.startName === filterByStartName)
          : allCompetitors;

        // Etsi seuraavat lähtijät (ne jotka lähtevät nykyisen jälkeen)
        const nextStarters = filteredCompetitors.filter(
          (c) => c.startTime.getTime() > currentStartTime
        );

        if (nextStarters.length > 0) {
          const nextStartTime = nextStarters[0].startTime.getTime();
          const nextCompetitorsToAnnounce = nextStarters.filter(
            (c) => c.startTime.getTime() === nextStartTime
          );

          const names = nextCompetitorsToAnnounce.map((c) => c.personName).join(', ');
          const announcement = `Seuraavat lähtijät: ${names}`;
          try {
            await speechService.speak(announcement);
          } catch (error) {
            console.error('Speech error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Start sequence error:', error);
    }
  }, []);

  // Trigger start sequence when countdown reaches 5 seconds
  useEffect(() => {
    if (countdown === 5 && nextCompetitors.length > 0) {
      const startTime = nextCompetitors[0].startTime.getTime();

      // Only trigger once per start time
      if (lastStartTime !== startTime) {
        setLastStartTime(startTime);
        handleStartSequence(nextCompetitors, startList.allCompetitors, selectedStartName);
      }
    }
  }, [countdown, nextCompetitors, lastStartTime, handleStartSequence, startList.allCompetitors, selectedStartName]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getCountdownColor = (): string => {
    if (!countdown) return '#666';
    if (countdown <= 5) return '#f44336';
    if (countdown <= 30) return '#ff9800';
    return '#4caf50';
  };

  const handleSkipForward = (seconds: number) => {
    virtualClock.skipForward(seconds);
    setCurrentTime(virtualClock.getCurrentTime());
  };

  const handleEnableAudio = async () => {
    try {
      // Resume audio context ja testaa ääntä
      await audioService.resume();

      // Testaa että ääni toimii soittamalla lyhyt piippi
      const context = (audioService as any).audioContext;
      if (context) {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.05);
      }

      // Testaa että puhe toimii (hiljaa)
      if (speechService.isSupported()) {
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0.01;
        window.speechSynthesis.speak(utterance);
      }

      setAudioEnabled(true);
    } catch (error) {
      console.error('Virhe äänen aktivoinnissa:', error);
    }
  };

  const getCompetitorsGridStyle = (count: number): React.CSSProperties => {
    let columns = 1;
    if (count > 6) {
      columns = 3;
    } else if (count > 3) {
      columns = 2;
    }

    return {
      ...styles.competitorsGrid,
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
    };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.eventName}>{startList.eventName}</h1>
          <div style={styles.currentTime}>
            {formatTime(currentTime)}
            {isSimulation && <span style={styles.simulationBadge}> 🎬 SIMULAATIO</span>}
          </div>
        </div>
        <div style={styles.headerButtons}>
          {isSimulation && (
            <div style={styles.skipButtons}>
              <button onClick={() => handleSkipForward(10)} style={styles.skipButton}>
                +10s
              </button>
              <button onClick={() => handleSkipForward(30)} style={styles.skipButton}>
                +30s
              </button>
              <button onClick={() => handleSkipForward(60)} style={styles.skipButton}>
                +1min
              </button>
            </div>
          )}
          <button onClick={onReset} style={styles.resetButton}>
            ⚙️ Asetukset
          </button>
        </div>
      </div>

      {!audioEnabled && (
        <div style={styles.audioWarning}>
          <div style={styles.audioWarningCard}>
            <div style={styles.audioWarningIcon}>🔊</div>
            <div style={styles.audioWarningText}>
              Äänet eivät ole aktivoitu. Klikkaa nappia aktivoidaksesi äänimerkit ja nimien lukemisen.
            </div>
            <button onClick={handleEnableAudio} style={styles.enableAudioButton}>
              🔊 Aktivoi äänet
            </button>
          </div>
        </div>
      )}

      {nextCompetitors.length > 0 ? (
        <>
          <div style={styles.countdownSection}>
            <div style={styles.startTimeInfo}>
              <div style={styles.nextStartTime}>
                Lähtöaika: {formatTime(nextCompetitors[0].startTime)}
              </div>
            </div>
            <div style={styles.countdownInfo}>
              <div style={styles.countdownLabel}>Aikaa lähtöön</div>
              <div style={{ ...styles.countdown, color: getCountdownColor() }}>
                {countdown !== null && countdown >= 0 ? `${countdown}s` : 'LÄHTÖ!'}
              </div>
            </div>
          </div>

          <div style={styles.competitorsSection}>
            <div style={getCompetitorsGridStyle(nextCompetitors.length)}>
              {nextCompetitors.map((competitor, index) => (
                <div key={index} style={styles.competitorCard}>
                  <div style={styles.competitorName}>{competitor.personName}</div>
                  <div style={styles.competitorDetails}>
                    <span style={styles.competitorClass}>{competitor.className}</span>
                    {competitor.bibNumber && (
                      <span style={styles.competitorBib}>bib: {competitor.bibNumber}</span>
                    )}
                    {competitor.controlCard && (
                      <span style={styles.competitorControlCard}>CC: {competitor.controlCard}</span>
                    )}
                    {competitor.organisation && (
                      <span style={styles.competitorOrg}>{competitor.organisation}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={styles.noCompetitors}>
          <div style={styles.noCompetitorsIcon}>🏁</div>
          <div style={styles.noCompetitorsText}>Ei tulevia lähtöjä</div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    minHeight: '100vh',
    maxHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '0.5vh 1vw',
    color: 'white',
    overflow: 'hidden',
  },
  header: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'flex-start',
    marginBottom: '0.5vh',
    gap: '0.5rem',
  },
  eventName: {
    fontSize: 'clamp(1.2rem, 2vw, 2rem)',
    fontWeight: 'bold',
    margin: '0',
  },
  currentTime: {
    fontSize: 'clamp(0.9rem, 1.5vw, 1.5rem)',
    opacity: 0.8,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  simulationBadge: {
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: 'clamp(0.7rem, 1vw, 1rem)',
    fontWeight: 'bold',
  },
  headerButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    alignItems: 'flex-end',
  },
  skipButtons: {
    display: 'flex',
    gap: '0.3rem',
  },
  skipButton: {
    padding: '0.3rem 0.6rem',
    fontSize: 'clamp(0.7rem, 0.9vw, 0.9rem)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  resetButton: {
    padding: '0.5rem 1rem',
    fontSize: 'clamp(0.8rem, 1vw, 1rem)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  countdownSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
    gap: '2vw',
    marginBottom: '1.5vh',
    padding: '1vh 2vw',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
  },
  startTimeInfo: {
    textAlign: 'left',
  },
  nextStartTime: {
    fontSize: 'clamp(1.2rem, 2.5vw, 2.5rem)',
    fontWeight: 'bold',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
  countdownInfo: {
    textAlign: 'right',
  },
  countdownLabel: {
    fontSize: 'clamp(0.9rem, 1.5vw, 1.5rem)',
    opacity: 0.9,
    marginBottom: '0.5vh',
  },
  countdown: {
    fontSize: 'clamp(2rem, 5vw, 5rem)',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
    lineHeight: '1',
  },
  competitorsSection: {
    display: 'grid',
    maxWidth: '100%',
    margin: '0 auto',
    overflow: 'hidden',
  },
  competitorsGrid: {
    display: 'grid',
    gap: '1.2vh 1.5vw',
    alignContent: 'start',
    overflowY: 'auto',
    paddingRight: '0.5vw',
    paddingBottom: '1vh',
  },
  competitorCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    color: '#333',
    padding: 'clamp(0.8rem, 1.5vh, 1.5rem) clamp(1rem, 2vw, 2rem)',
    borderRadius: '10px',
    boxShadow: '0 3px 15px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8vh',
  },
  competitorName: {
    fontSize: 'clamp(1.4rem, 2.8vw, 2.8rem)',
    fontWeight: 'bold',
    color: '#1e3c72',
    lineHeight: '1.2',
    wordBreak: 'break-word',
  },
  competitorDetails: {
    display: 'flex',
    gap: 'clamp(0.4rem, 1vw, 1rem)',
    flexWrap: 'wrap',
    fontSize: 'clamp(0.85rem, 1.4vw, 1.4rem)',
  },
  competitorClass: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '0.4rem 0.8rem',
    borderRadius: '5px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  competitorBib: {
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '0.4rem 0.8rem',
    borderRadius: '5px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  competitorControlCard: {
    backgroundColor: '#9c27b0',
    color: 'white',
    padding: '0.4rem 0.8rem',
    borderRadius: '5px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  competitorOrg: {
    backgroundColor: '#2196f3',
    color: 'white',
    padding: '0.4rem 0.8rem',
    borderRadius: '5px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  noCompetitors: {
    textAlign: 'center',
    marginTop: '10vh',
  },
  noCompetitorsIcon: {
    fontSize: 'clamp(3rem, 8vw, 6rem)',
    marginBottom: '1vh',
  },
  noCompetitorsText: {
    fontSize: 'clamp(1.5rem, 3vw, 3rem)',
    opacity: 0.8,
  },
  audioWarning: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '0.5vh',
  },
  audioWarningCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.95)',
    color: '#333',
    padding: 'clamp(0.8rem, 1.5vh, 1.5rem) clamp(1rem, 2vw, 2rem)',
    borderRadius: '8px',
    maxWidth: '90vw',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  audioWarningIcon: {
    fontSize: 'clamp(1.5rem, 3vw, 3rem)',
    marginBottom: '0.5vh',
  },
  audioWarningText: {
    fontSize: 'clamp(0.9rem, 1.3vw, 1.3rem)',
    marginBottom: '1vh',
    lineHeight: '1.4',
  },
  enableAudioButton: {
    padding: 'clamp(0.6rem, 1vh, 1rem) clamp(1rem, 2vw, 2rem)',
    fontSize: 'clamp(0.9rem, 1.3vw, 1.3rem)',
    fontWeight: 'bold',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
};

export default StartClockView;
