// Web Audio API Synthesizer & Advanced Audio Engine for Birthday Magic

export interface AudioState {
  isPlaying: boolean;
  isMuted: boolean;
  currentTrackId: string;
  customUrl?: string;
  currentTime: number;
  duration: number;
  volume: number;
  error?: string | null;
}

class BirthdayAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private activeSynthTimer: number | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private masterGain: GainNode | null = null;
  private currentTrackId: string = 'synth-happy-birthday-warm';
  private currentCustomUrl?: string;
  private volume: number = 0.8;
  private duration: number = 0;
  private currentTime: number = 0;
  private lastError: string | null = null;
  private listeners: Set<(state: AudioState) => void> = new Set();

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.6, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext init notice:', e);
    }
  }

  public subscribe(listener: (state: AudioState) => void) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AudioState {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      currentTrackId: this.currentTrackId,
      customUrl: this.currentCustomUrl,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      error: this.lastError
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.error('Audio listener error:', err);
      }
    });
  }

  public togglePlay(trackId?: string, customUrl?: string) {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play(trackId || this.currentTrackId, customUrl || this.currentCustomUrl);
    }
  }

  public play(trackId: string = 'synth-happy-birthday-warm', customUrl?: string) {
    this.initContext();
    this.currentTrackId = trackId;
    this.currentCustomUrl = customUrl;
    this.lastError = null;

    if (customUrl && customUrl.trim() !== '') {
      this.stopSynth();
      this.setupHtmlAudio(customUrl);
      return;
    }

    // If no custom URL, stop HTML audio and play Synth Melody
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }

    this.startSynthMelody(trackId);
    this.isPlaying = true;
    this.notify();
  }

  private setupHtmlAudio(url: string) {
    if (!this.htmlAudio) {
      this.htmlAudio = new Audio();
      this.htmlAudio.loop = true;
      this.htmlAudio.preload = 'auto';

      this.htmlAudio.addEventListener('timeupdate', () => {
        if (this.htmlAudio) {
          this.currentTime = this.htmlAudio.currentTime;
          this.duration = this.htmlAudio.duration || 0;
          this.notify();
        }
      });

      this.htmlAudio.addEventListener('loadedmetadata', () => {
        if (this.htmlAudio) {
          this.duration = this.htmlAudio.duration || 0;
          this.notify();
        }
      });

      this.htmlAudio.addEventListener('ended', () => {
        if (!this.htmlAudio?.loop) {
          this.isPlaying = false;
          this.notify();
        }
      });

      this.htmlAudio.addEventListener('error', (e) => {
        console.warn('HTML Audio error event:', e);
        this.lastError = 'Could not load audio file. Please ensure it is a valid MP3, WAV, M4A, or OGG format.';
        this.isPlaying = false;
        this.notify();
      });
    }

    if (this.htmlAudio.src !== url) {
      this.htmlAudio.src = url;
      this.htmlAudio.load();
    }

    this.htmlAudio.muted = this.isMuted;
    this.htmlAudio.volume = this.volume;

    const playPromise = this.htmlAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.lastError = null;
          this.notify();
        })
        .catch((err) => {
          // Autoplay blocked by browser until user interaction, or decoding issue
          if (err.name === 'NotAllowedError') {
            console.log('Autoplay deferred until user interaction');
          } else {
            console.warn('Audio play rejection:', err);
            this.lastError = 'Audio playback was blocked or format unsupported. Tap Play to listen.';
          }
          this.isPlaying = false;
          this.notify();
        });
    }
  }

  public pause() {
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    this.stopSynth();
    this.isPlaying = false;
    this.notify();
  }

  public stop() {
    this.pause();
    if (this.htmlAudio) {
      this.htmlAudio.currentTime = 0;
    }
    this.currentTime = 0;
    this.notify();
  }

  public seek(seconds: number) {
    if (this.htmlAudio && Number.isFinite(seconds)) {
      this.htmlAudio.currentTime = Math.max(0, Math.min(seconds, this.duration || 1000));
      this.currentTime = this.htmlAudio.currentTime;
      this.notify();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.volume;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.6, this.ctx.currentTime);
    }
    this.notify();
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : this.volume * 0.6, this.ctx.currentTime);
    }
    if (this.htmlAudio) {
      this.htmlAudio.muted = mute;
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- SOUND EFFECTS ---
  public playGiftPop() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Soft whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.35);
      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.45);

      // Chimes
      const chimeNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chimeNotes.forEach((freq, i) => {
        const chimeOsc = this.ctx!.createOscillator();
        const chimeGain = this.ctx!.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.1 + i * 0.07);
        chimeGain.gain.setValueAtTime(0.25 * this.volume, now + 0.1 + i * 0.07);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.07);
        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.masterGain!);
        chimeOsc.start(now + 0.1 + i * 0.07);
        chimeOsc.stop(now + 0.9 + i * 0.07);
      });
    } catch {
      // Ignore audio error if context not ready
    }
  }

  public playCandleBlow() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Noise burst for blow
      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.7);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);

      // Magical sparkle chime upon blowing
      setTimeout(() => {
        this.playCelebrationFanfare();
      }, 500);
    } catch {
      // safe fallback
    }
  }

  public playCelebrationFanfare() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0, d: 0.2 },     // C5
        { f: 659.25, t: 0.15, d: 0.2 },  // E5
        { f: 783.99, t: 0.3, d: 0.25 },  // G5
        { f: 1046.50, t: 0.48, d: 0.6 }  // C6
      ];

      notes.forEach(({ f, t, d }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.35 * this.volume, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + t);
        osc.stop(now + t + d);
      });
    } catch {
      // safe fallback
    }
  }

  public playEnvelopeOpen() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.2 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // safe fallback
    }
  }

  // --- SYNTHESIZED MUSIC SEQUENCER ---
  private stopSynth() {
    if (this.activeSynthTimer) {
      clearInterval(this.activeSynthTimer);
      this.activeSynthTimer = null;
    }
  }

  private startSynthMelody(trackId: string) {
    this.stopSynth();
    if (!this.ctx || !this.masterGain) return;

    // Birthday melody in C Major / G Major chords
    const melodies: Record<string, { notes: number[], speed: number }> = {
      'synth-happy-birthday-warm': {
        notes: [
          261.63, 261.63, 293.66, 261.63, 349.23, 329.63, // Happy birthday to you
          261.63, 261.63, 293.66, 261.63, 392.00, 349.23, // Happy birthday to you
          261.63, 261.63, 523.25, 440.00, 349.23, 329.63, 293.66, // Happy birthday dear...
          466.16, 466.16, 440.00, 349.23, 392.00, 349.23  // Happy birthday to you
        ],
        speed: 480
      },
      'synth-dreamy-piano': {
        notes: [
          329.63, 392.00, 493.88, 587.33, 659.25, 587.33, 493.88, 392.00,
          293.66, 369.99, 440.00, 587.33, 554.37, 440.00, 369.99, 293.66
        ],
        speed: 380
      },
      'synth-romantic-strings': {
        notes: [
          261.63, 329.63, 392.00, 523.25, 659.25, 523.25, 392.00, 329.63,
          220.00, 261.63, 329.63, 440.00, 523.25, 440.00, 329.63, 261.63
        ],
        speed: 520
      },
      'synth-lofi-chill': {
        notes: [
          261.63, 329.63, 392.00, 493.88, 392.00, 329.63, 293.66, 369.99,
          440.00, 554.37, 440.00, 369.99
        ],
        speed: 420
      },
      'synth-cinematic-epic': {
        notes: [
          196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50
        ],
        speed: 460
      }
    };

    const currentMelody = melodies[trackId] || melodies['synth-happy-birthday-warm'];
    let noteIdx = 0;

    const playNextNote = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const freq = currentMelody.notes[noteIdx];
      const now = this.ctx.currentTime;

      // Polyphonic warm tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = trackId === 'synth-romantic-strings' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const noteDuration = (currentMelody.speed / 1000) * 1.6;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18 * this.volume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + noteDuration + 0.1);

      noteIdx = (noteIdx + 1) % currentMelody.notes.length;
    };

    playNextNote();
    this.activeSynthTimer = window.setInterval(playNextNote, currentMelody.speed);
  }
}

export const audioEngine = new BirthdayAudioEngine();

