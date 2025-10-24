import type { StartList } from '../types';

export class VirtualClock {
  private static instance: VirtualClock;
  private virtualTime: Date | null = null;
  private realStartTime: number = 0;
  private enabled: boolean = false;

  private constructor() {}

  static getInstance(): VirtualClock {
    if (!VirtualClock.instance) {
      VirtualClock.instance = new VirtualClock();
    }
    return VirtualClock.instance;
  }

  /**
   * Aktivoi virtuaalikellon ja asettaa ajan 1 minuutti ennen ensimmäistä lähtöä
   */
  activateForStartList(startList: StartList): void {
    if (startList.allCompetitors.length === 0) {
      this.disable();
      return;
    }

    const firstStartTime = startList.allCompetitors[0].startTime;
    const oneMinuteBefore = new Date(firstStartTime.getTime() - 60000); // -60 sekuntia

    this.setVirtualTime(oneMinuteBefore);
    this.enabled = true;
  }

  /**
   * Asettaa virtuaalikellon tiettyyn aikaan
   */
  setVirtualTime(time: Date): void {
    this.virtualTime = new Date(time);
    this.realStartTime = Date.now();
    this.enabled = true;
  }

  /**
   * Kytkee virtuaalikellon päälle/pois
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && !this.virtualTime) {
      this.virtualTime = new Date();
      this.realStartTime = Date.now();
    }
  }

  /**
   * Palauttaa nykyisen ajan (joko virtuaalinen tai todellinen)
   */
  getCurrentTime(): Date {
    if (!this.enabled || !this.virtualTime) {
      return new Date();
    }

    const elapsed = Date.now() - this.realStartTime;
    return new Date(this.virtualTime.getTime() + elapsed);
  }

  /**
   * Tarkistaa onko virtuaalikello käytössä
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Kytkee virtuaalikellon pois
   */
  disable(): void {
    this.enabled = false;
    this.virtualTime = null;
  }

  /**
   * Nopeutetaan aikaa (hyppää X sekuntia eteenpäin)
   */
  skipForward(seconds: number): void {
    if (!this.enabled || !this.virtualTime) return;

    const elapsed = Date.now() - this.realStartTime;
    this.virtualTime = new Date(this.virtualTime.getTime() + elapsed + seconds * 1000);
    this.realStartTime = Date.now();
  }

  /**
   * Palauttaa virtuaalikellon tilan
   */
  getState(): { enabled: boolean; virtualTime: Date | null } {
    return {
      enabled: this.enabled,
      virtualTime: this.virtualTime,
    };
  }
}

export const virtualClock = VirtualClock.getInstance();
