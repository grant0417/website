export type Voice = "bell" | "pluck" | "soft";

export const BPM = 96;
/** One week plays every eighth note. */
export const STEP_MS = 60000 / BPM / 2;

// A minor pentatonic across two octaves; a busier day plays higher.
const SCALE = [
  220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99,
];
const BASS = [110, 87.31, 130.81, 98];

/** The busiest day of a week and its level, or day -1 for an empty week. */
export function busiestDay(week: number[]): { day: number; level: number } {
  let day = -1;
  let level = 0;
  week.forEach((lv, d) => {
    if (lv > level) {
      level = lv;
      day = d;
    }
  });
  return { day, level };
}

export class Synth {
  private ac?: AudioContext;
  private master!: GainNode;
  private delay!: DelayNode;
  private reverb!: ConvolverNode;

  /** Must be called from a user gesture so the browser allows audio. */
  start() {
    if (!this.ac) this.build();
    if (this.ac?.state === "suspended") void this.ac.resume();
  }

  close() {
    void this.ac?.close();
    this.ac = undefined;
  }

  playWeek(week: number[], index: number, voice: Voice) {
    const ac = this.ac;
    if (!ac) return;
    const t = ac.currentTime + 0.02;
    const { day, level } = busiestDay(week);
    if (day >= 0) {
      this.note(
        SCALE[6 - day + (level >= 4 ? 3 : 0)],
        t,
        0.6 + level * 0.12,
        voice,
      );
    }
    if (index % 4 === 0) {
      this.note(BASS[Math.floor(index / 4) % BASS.length], t, 0.9, "soft");
    }
  }

  private build() {
    const ac = new AudioContext();
    this.ac = ac;

    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.ratio.value = 4;
    limiter.connect(ac.destination);

    this.master = ac.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(limiter);

    this.delay = ac.createDelay(1);
    this.delay.delayTime.value = (60 / BPM) * 0.75;
    const feedback = ac.createGain();
    feedback.gain.value = 0.3;
    const wet = ac.createGain();
    wet.gain.value = 0.2;
    const tone = ac.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2200;
    this.delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(this.delay);
    tone.connect(wet);
    wet.connect(this.master);

    // Synthetic impulse response: decaying noise is a cheap, decent room.
    const len = ac.sampleRate * 2.2;
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
    }
    this.reverb = ac.createConvolver();
    this.reverb.buffer = ir;
    const verbGain = ac.createGain();
    verbGain.gain.value = 0.28;
    this.reverb.connect(verbGain);
    verbGain.connect(this.master);
  }

  private note(freq: number, t: number, velocity: number, voice: Voice) {
    const ac = this.ac!;
    const osc = ac.createOscillator();
    const overtone = ac.createOscillator();
    const overtoneGain = ac.createGain();
    const filter = ac.createBiquadFilter();
    const amp = ac.createGain();

    osc.frequency.value = freq;
    if (voice === "bell") {
      osc.type = "sine";
      overtone.type = "sine";
      overtone.frequency.value = freq * 3.01;
      overtoneGain.gain.value = 0.12;
    } else if (voice === "pluck") {
      osc.type = "triangle";
      overtone.type = "sawtooth";
      overtone.frequency.value = freq * 1.003;
      overtoneGain.gain.value = 0.35;
    } else {
      osc.type = "sine";
      overtone.type = "triangle";
      overtone.frequency.value = freq * 2;
      overtoneGain.gain.value = 0.35;
    }

    filter.type = "lowpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(voice === "pluck" ? 3200 : 1800, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.5);

    const decay = voice === "soft" ? 1.4 : voice === "bell" ? 1.1 : 0.45;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(
      0.16 * velocity,
      t + (voice === "soft" ? 0.08 : 0.006),
    );
    amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(filter);
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    amp.connect(this.delay);
    amp.connect(this.reverb);

    osc.start(t);
    overtone.start(t);
    osc.stop(t + decay + 0.05);
    overtone.stop(t + decay + 0.05);
  }
}
