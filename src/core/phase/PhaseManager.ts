import i18n from 'i18next';
import { PHASE_TIMES } from '../../constants';
import { Phase, PhaseChangeEvent } from './types';

export class PhaseManager {
  private static instance: PhaseManager | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentPhase: Phase;
  private callbacks: Array<(event: PhaseChangeEvent) => void> = [];

  private constructor() {
    this.currentPhase = PhaseManager.calculateCurrentPhase();
  }

  static getInstance(): PhaseManager {
    if (!PhaseManager.instance) {
      PhaseManager.instance = new PhaseManager();
    }
    return PhaseManager.instance;
  }

  static resetInstance(): void {
    if (PhaseManager.instance) {
      PhaseManager.instance.dispose();
    }
    PhaseManager.instance = null;
  }

  static calculateCurrentPhase(date?: Date): Phase {
    const hour = (date || new Date()).getHours();
    if (hour >= PHASE_TIMES.MORNING.start && hour < PHASE_TIMES.MORNING.end) return 'MORNING';
    if (hour >= PHASE_TIMES.AFTERNOON.start && hour < PHASE_TIMES.AFTERNOON.end) return 'AFTERNOON';
    if (hour >= PHASE_TIMES.EVENING.start && hour < PHASE_TIMES.EVENING.end) return 'EVENING';
    return 'NIGHT';
  }

  static getPhaseDisplayName(phase: Phase): string {
    return i18n.t(`phase.${phase.toLowerCase()}.name`);
  }

  static getPhaseTimeRange(phase: Phase): string {
    return i18n.t(`phase.${phase.toLowerCase()}.timeRange`);
  }

  initialize(): void {
    this.intervalId = setInterval(() => {
      const newPhase = PhaseManager.calculateCurrentPhase();
      if (newPhase !== this.currentPhase) {
        const event: PhaseChangeEvent = {
          previousPhase: this.currentPhase,
          newPhase,
          timestamp: Date.now(),
        };
        this.currentPhase = newPhase;
        this.callbacks.forEach(cb => cb(event));
      }
    }, 60000);
  }

  getCurrentPhase(): Phase {
    return this.currentPhase;
  }

  isPhaseActive(phase: Phase): boolean {
    return this.currentPhase === phase;
  }

  onPhaseChange(cb: (event: PhaseChangeEvent) => void): void {
    this.callbacks.push(cb);
  }

  dispose(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callbacks = [];
  }
}
