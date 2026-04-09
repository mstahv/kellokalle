import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { StartList, Competitor } from '../types';
import { audioService } from '../utils/audioService';
import { speechService } from '../utils/speechService';
import { virtualClock } from '../utils/virtualClock';

interface StartClockViewProps {
  startList: StartList;
  onReset: () => void;
  selectedStartName?: string;
  callUpTime?: number; // seconds, default 300
}

const StartClockView: React.FC<StartClockViewProps> = ({ startList, onReset, selectedStartName, callUpTime = 300 }) => {
  const [currentTime, setCurrentTime] = useState(virtualClock.getCurrentTime());
  const [lastStartTime, setLastStartTime] = useState<number | null>(null);
  const [lastCallUpTime, setLastCallUpTime] = useState<number | null>(null);
  const [isSimulation] = useState(virtualClock.isEnabled());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [beepsEnabled, setBeepsEnabled] = useState(true);
  const [callUpSpeechEnabled, setCallUpSpeechEnabled] = useState(true);

  // Update current time every 100ms for smooth countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(virtualClock.getCurrentTime());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Filter competitors by selected start name
  const filteredCompetitors = useMemo(() => {
    return selectedStartName
      ? startList.allCompetitors.filter((c) => c.startName === selectedStartName)
      : startList.allCompetitors;
  }, [startList, selectedStartName]);

  // Find next competitors to start (for countdown and beeps)
  const now = currentTime.getTime();
  const upcoming = useMemo(() => {
    return filteredCompetitors.filter((c) => c.startTime.getTime() > now);
  }, [filteredCompetitors, now]);

  const nextCompetitors = useMemo(() => {
    if (upcoming.length === 0) return [];
    const nextStartTime = upcoming[0].startTime.getTime();
    return upcoming.filter((c) => c.startTime.getTime() === nextStartTime);
  }, [upcoming]);

  const countdown = useMemo(() => {
    if (nextCompetitors.length === 0) return null;
    return Math.floor((nextCompetitors[0].startTime.getTime() - now) / 1000);
  }, [nextCompetitors, now]);

  // Find the group currently in the call-up window (lukuhetki)
  // These are competitors whose lukuhetki has passed but haven't started yet
  const callUpGroup = useMemo(() => {
    const callUpMs = callUpTime * 1000;

    // Find competitors in the call-up window: lukuhetki passed, but not yet started
    const inWindow = filteredCompetitors.filter((c) => {
      const startMs = c.startTime.getTime();
      return startMs > now && (startMs - now) <= callUpMs;
    });

    if (inWindow.length === 0) return [];

    // Get the most recently called group (largest startTime whose lukuhetki has passed)
    const uniqueStartTimes = [...new Set(inWindow.map((c) => c.startTime.getTime()))].sort((a, b) => b - a);
    const latestStartTime = uniqueStartTimes[0];
    return inWindow.filter((c) => c.startTime.getTime() === latestStartTime);
  }, [filteredCompetitors, now, callUpTime]);

  // Only show competitors once their lukuhetki has arrived
  const displayCompetitors = callUpGroup;

  // Handle beep sequence (only beeps, no speech)
  const handleBeepSequence = useCallback(async () => {
    try {
      await audioService.resume();
      await audioService.playStartSequence();
    } catch (error) {
      console.error('Beep sequence error:', error);
    }
  }, []);

  // Handle call-up announcement (lukuhetki speech)
  const handleCallUpAnnouncement = useCallback(async (competitors: Competitor[]) => {
    if (!speechService.isSupported() || competitors.length === 0) return;
    try {
      await audioService.resume();
      const startDate = competitors[0].startTime;
      const timeStr = startDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
      const names = competitors.map((c) => c.personName).join(', ');
      const announcement = `${timeStr} lähtijät valmistautukaa: ${names}`;
      await speechService.speak(announcement);
    } catch (error) {
      console.error('Call-up speech error:', error);
    }
  }, []);

  // Trigger beep sequence at 5 seconds before start
  // Use <= 5 instead of === 5 to avoid missing the trigger when time jumps (e.g. +10s skip)
  useEffect(() => {
    if (beepsEnabled && countdown !== null && countdown <= 5 && countdown >= 0 && nextCompetitors.length > 0) {
      const startTime = nextCompetitors[0].startTime.getTime();
      if (lastStartTime !== startTime) {
        setLastStartTime(startTime);
        handleBeepSequence();
      }
    }
  }, [beepsEnabled, countdown, nextCompetitors, lastStartTime, handleBeepSequence]);

  // Trigger call-up announcement at lukuhetki
  useEffect(() => {
    if (!callUpSpeechEnabled) return;
    const callUpMs = callUpTime * 1000;

    // Check all upcoming unique start times for lukuhetki triggers
    const uniqueStartTimes = [...new Set(
      filteredCompetitors
        .filter((c) => c.startTime.getTime() > now)
        .map((c) => c.startTime.getTime())
    )].sort((a, b) => a - b);

    for (const st of uniqueStartTimes) {
      const lukuhetki = st - callUpMs;
      const timeSinceLukuhetki = now - lukuhetki;

      // Trigger within a 1.5 second window, once per start time
      if (timeSinceLukuhetki >= 0 && timeSinceLukuhetki < 1500 && lastCallUpTime !== st) {
        setLastCallUpTime(st);
        const competitorsToCall = filteredCompetitors.filter((c) => c.startTime.getTime() === st);
        handleCallUpAnnouncement(competitorsToCall);
        break;
      }
    }
  }, [callUpSpeechEnabled, now, filteredCompetitors, callUpTime, lastCallUpTime, handleCallUpAnnouncement]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimeShort = (date: Date): string => {
    return date.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCountdown = (seconds: number): string => {
    if (seconds < 0) return 'LÄHTÖ!';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
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
      await audioService.resume();

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
    if (count > 4) {
      columns = 3;
    } else if (count > 2) {
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
            {isSimulation && <span style={styles.simulationBadge}> SIMULAATIO</span>}
          </div>
        </div>
        <div style={styles.headerButtons}>
          {isSimulation && (
            <div style={styles.skipButtons}>
              <button onClick={() => handleSkipForward(-300)} style={styles.skipButton}>
                -5min
              </button>
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
          <div style={styles.toggleButtons}>
            <button
              onClick={() => setBeepsEnabled((v) => !v)}
              style={beepsEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive}
            >
              Piipit {beepsEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setCallUpSpeechEnabled((v) => !v)}
              style={callUpSpeechEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive}
            >
              Kutsunta {callUpSpeechEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <button onClick={onReset} style={styles.resetButton}>
            Asetukset
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
              <div style={styles.nextStartLabel}>Seuraava lähtö:</div>
              <div style={styles.nextStartTime}>
                {formatTimeShort(nextCompetitors[0].startTime)}
              </div>
            </div>
            <div style={styles.countdownInfo}>
              <div style={styles.countdownLabel}>Aikaa lähtöön</div>
              <div style={{ ...styles.countdown, color: getCountdownColor() }}>
                {countdown !== null ? formatCountdown(countdown) : 'LÄHTÖ!'}
              </div>
            </div>
          </div>

          {displayCompetitors.length > 0 && (
            <div style={styles.competitorsSection}>
              <div style={styles.callUpLabel}>
                {formatTimeShort(displayCompetitors[0].startTime)} lähtijät {Math.round(callUpTime / 60)}' viivalle:
              </div>
              <div style={getCompetitorsGridStyle(displayCompetitors.length)}>
                {displayCompetitors.map((competitor, index) => (
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
          )}
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
  toggleButtons: {
    display: 'flex',
    gap: '0.3rem',
  },
  toggleButtonActive: {
    padding: '0.3rem 0.6rem',
    fontSize: 'clamp(0.7rem, 0.9vw, 0.9rem)',
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  toggleButtonInactive: {
    padding: '0.3rem 0.6rem',
    fontSize: 'clamp(0.7rem, 0.9vw, 0.9rem)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
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
    marginBottom: '0.5vh',
    padding: '0.5vh 2vw',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
  },
  startTimeInfo: {
    textAlign: 'left',
  },
  nextStartLabel: {
    fontSize: 'clamp(0.9rem, 1.8vw, 1.6rem)',
    fontWeight: '400',
    opacity: 0.8,
  },
  callUpLabel: {
    fontSize: 'clamp(1.4rem, 3.5vw, 3rem)',
    padding: '0.3vh 1vw',
    color: '#ffeb3b',
    fontWeight: 'bold',
    textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  nextStartTime: {
    fontSize: 'clamp(2.2rem, 5.5vw, 5rem)',
    fontWeight: 'bold',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
    lineHeight: '1.1',
  },
  countdownInfo: {
    textAlign: 'right',
  },
  countdownLabel: {
    fontSize: 'clamp(0.9rem, 1.5vw, 1.5rem)',
    opacity: 0.9,
    marginBottom: '0.3vh',
  },
  countdown: {
    fontSize: 'clamp(2rem, 5vw, 5rem)',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
    lineHeight: '1',
  },
  competitorsSection: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  competitorsGrid: {
    display: 'grid',
    gap: '0.8vh 1vw',
    alignContent: 'start',
    overflowY: 'auto',
    paddingRight: '0.5vw',
    paddingBottom: '0.5vh',
  },
  competitorCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    color: '#333',
    padding: 'clamp(0.4rem, 0.8vh, 0.8rem) clamp(0.6rem, 1.2vw, 1.2rem)',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3vh',
  },
  competitorName: {
    fontSize: 'clamp(1.3rem, 2.6vw, 2.6rem)',
    fontWeight: 'bold',
    color: '#1e3c72',
    lineHeight: '1.15',
    wordBreak: 'break-word',
  },
  competitorDetails: {
    display: 'flex',
    gap: 'clamp(0.2rem, 0.5vw, 0.6rem)',
    flexWrap: 'wrap',
    fontSize: 'clamp(0.8rem, 1.3vw, 1.3rem)',
  },
  competitorClass: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  competitorBib: {
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  competitorControlCard: {
    backgroundColor: '#9c27b0',
    color: 'white',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  competitorOrg: {
    backgroundColor: '#2196f3',
    color: 'white',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
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
