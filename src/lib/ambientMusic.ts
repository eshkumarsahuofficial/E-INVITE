import type { MusicTrack } from '../types/wedding';

class AmbientMusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private intervalId: number | null = null;
  private droneOscs: OscillatorNode[] = [];
  private isPlaying = false;
  private currentTrack: MusicTrack = 'none';

  public start(track: MusicTrack) {
    if (track === 'none') {
      this.stop();
      return;
    }

    if (this.isPlaying && this.currentTrack === track) {
      return;
    }

    this.stop();
    this.currentTrack = track;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.14, this.ctx.currentTime + 1.2);
    this.masterGain.connect(this.ctx.destination);

    // Warm tanpura drone (Sa - Pa - Sa)
    const droneFreqs = track === 'royal-sitar' ? [130.81, 196.0, 261.63] : [146.83, 220.0, 293.66];
    droneFreqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(idx === 0 ? 0.16 : 0.08, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      this.droneOscs.push(osc);
    });

    // Gentle Raag Bhupali / Yaman melodic phrases
    const scales: Record<Exclude<MusicTrack, 'none'>, number[]> = {
      'shehnai-bliss': [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 493.88, 440.0],
      'flute-serenity': [293.66, 369.99, 440.0, 523.25, 587.33, 440.0, 369.99, 329.63],
      'royal-sitar': [261.63, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63, 293.66],
    };

    const notes = scales[track];
    let step = 0;

    const triggerNote = () => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const freq = notes[step % notes.length];
      step += 1;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const noteGain = this.ctx.createGain();

      osc.type = track === 'flute-serenity' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(track === 'royal-sitar' ? 1600 : 1100, now);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.22, now + 0.18);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 2.0);
    };

    this.isPlaying = true;
    triggerNote();
    this.intervalId = window.setInterval(triggerNote, 1750);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.droneOscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.droneOscs = [];
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
    }
    this.masterGain = null;
  }

  public getPlayingState(): boolean {
    return this.isPlaying;
  }
}

export const ambientMusic = new AmbientMusicPlayer();
