import React, { useState, useEffect, useCallback } from 'react';
import type { StartList, Competitor } from '../types';
import { audioService } from '../utils/audioService';
import { speechService } from '../utils/speechService';
import { virtualClock } from '../utils/virtualClock';

interface StartClockViewProps {
  startList: StartList;
  onReset: () => void;
}

const StartClockView: React.FC<StartClockViewProps> = ({ startList, onReset }) => {
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
    const upcoming = startList.allCompetitors.filter(
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
  }, [currentTime, startList]);

  // Handle start sequence (beeps and speech)
  const handleStartSequence = useCallback(async (currentCompetitors: Competitor[], allCompetitors: Competitor[]) => {
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

        // Etsi seuraavat lähtijät (ne jotka lähtevät nykyisen jälkeen)
        const nextStarters = allCompetitors.filter(
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
        handleStartSequence(nextCompetitors, startList.allCompetitors);
      }
    }
  }, [countdown, nextCompetitors, lastStartTime, handleStartSequence, startList.allCompetitors]);

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
            <div style={styles.countdownLabel}>Aikaa lähtöön</div>
            <div style={{ ...styles.countdown, color: getCountdownColor() }}>
              {countdown !== null && countdown >= 0 ? `${countdown}s` : 'LÄHTÖ!'}
            </div>
          </div>

          <div style={styles.competitorsSection}>
            <div style={styles.nextStartTime}>
              Lähtöaika: {formatTime(nextCompetitors[0].startTime)}
            </div>

            {nextCompetitors.map((competitor, index) => (
              <div key={index} style={styles.competitorCard}>
                <div style={styles.competitorName}>{competitor.personName}</div>
                <div style={styles.competitorDetails}>
                  <span style={styles.competitorClass}>{competitor.className}</span>
                  {competitor.bibNumber && (
                    <span style={styles.competitorBib}>Kilpailunumero: {competitor.bibNumber}</span>
                  )}
                  {competitor.controlCard && (
                    <span style={styles.competitorControlCard}>Kilpailukortti: {competitor.controlCard}</span>
                  )}
                  {competitor.organisation && (
                    <span style={styles.competitorOrg}>{competitor.organisation}</span>
                  )}
                </div>
              </div>
            ))}
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
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '20px',
    color: 'white',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '40px',
  },
  eventName: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  currentTime: {
    fontSize: '28px',
    opacity: 0.8,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  simulationBadge: {
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  headerButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'flex-end',
  },
  skipButtons: {
    display: 'flex',
    gap: '8px',
  },
  skipButton: {
    padding: '8px 16px',
    fontSize: '16px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  resetButton: {
    padding: '12px 24px',
    fontSize: '18px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  countdownSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  countdownLabel: {
    fontSize: '32px',
    marginBottom: '20px',
    opacity: 0.9,
  },
  countdown: {
    fontSize: '120px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  competitorsSection: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  nextStartTime: {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '30px',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
  competitorCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    color: '#333',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  competitorName: {
    fontSize: '56px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#1e3c72',
  },
  competitorDetails: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    fontSize: '32px',
  },
  competitorClass: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  competitorBib: {
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  competitorControlCard: {
    backgroundColor: '#9c27b0',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  competitorOrg: {
    backgroundColor: '#2196f3',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  noCompetitors: {
    textAlign: 'center',
    marginTop: '100px',
  },
  noCompetitorsIcon: {
    fontSize: '120px',
    marginBottom: '20px',
  },
  noCompetitorsText: {
    fontSize: '48px',
    opacity: 0.8,
  },
  audioWarning: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '30px',
  },
  audioWarningCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.95)',
    color: '#333',
    padding: '30px 40px',
    borderRadius: '12px',
    maxWidth: '800px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  audioWarningIcon: {
    fontSize: '64px',
    marginBottom: '15px',
  },
  audioWarningText: {
    fontSize: '24px',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  enableAudioButton: {
    padding: '16px 32px',
    fontSize: '24px',
    fontWeight: 'bold',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
};

export default StartClockView;
