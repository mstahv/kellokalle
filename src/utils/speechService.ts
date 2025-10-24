export class SpeechService {
  private synthesis: SpeechSynthesis;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  speak(text: string, lang: string = 'fi-FI'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        reject(event);
      };

      this.synthesis.speak(utterance);
    });
  }

  cancel(): void {
    this.synthesis.cancel();
  }

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}

export const speechService = new SpeechService();
