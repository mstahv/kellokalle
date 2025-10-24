export class AudioService {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playBeep(duration: number, frequency: number = 800): Promise<void> {
    return new Promise((resolve) => {
      const context = this.getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);

      oscillator.onended = () => resolve();
    });
  }

  async playStartSequence(): Promise<void> {
    // 5 short beeps (1 second apart)
    for (let i = 0; i < 5; i++) {
      await this.playBeep(0.1, 800);
      await this.sleep(900); // Total 1 second per beep
    }

    // 1 long beep for start
    await this.playBeep(0.5, 1000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Resume audio context (needed for some browsers)
  async resume(): Promise<void> {
    const context = this.getAudioContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  }
}

export const audioService = new AudioService();
