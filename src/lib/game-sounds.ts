let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return null;
  }

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new window.AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }

  return audioContext;
}

function safelyPlay(play: (context: AudioContext) => void) {
  try {
    const context = getAudioContext();
    if (context) play(context);
  } catch {
    // Sound is decorative; audio failures must never interrupt a game round.
  }
}

function addTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  wave: OscillatorType,
  startAt: number,
  endFrequency = frequency
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(1, endFrequency),
    startAt + duration
  );

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function addNoiseBurst(
  context: AudioContext,
  startAt: number,
  duration: number,
  volume: number,
  cutoff: number
) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    const fade = 1 - index / frameCount;
    channel[index] = (Math.random() * 2 - 1) * fade;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, startAt);
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(startAt);
  source.stop(startAt + duration);
}

export function playBetPlacedSound() {
  safelyPlay((context) => {
    const now = context.currentTime;
    addNoiseBurst(context, now, 0.045, 0.12, 2600);
    addTone(context, 880, 0.12, 0.045, "triangle", now, 620);
    addTone(context, 1320, 0.11, 0.026, "sine", now + 0.018, 980);
  });
}

export function playDiceRollSound() {
  safelyPlay((context) => {
    const now = context.currentTime;
    addTone(context, 150, 0.72, 0.018, "sine", now, 78);

    for (let index = 0; index < 13; index += 1) {
      const startAt = now + index * 0.073 + Math.random() * 0.018;
      const duration = 0.035 + Math.random() * 0.018;
      const pitch = 170 + Math.random() * 210;
      const volume = 0.035 + Math.random() * 0.025;

      addNoiseBurst(context, startAt, duration, volume, 1500 + Math.random() * 1400);
      addTone(context, pitch, duration, volume * 0.7, "triangle", startAt, pitch * 0.62);
    }
  });
}

export function playWinSound() {
  safelyPlay((context) => {
    const now = context.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];

    notes.forEach((note, index) => {
      const startAt = now + index * 0.105;
      addTone(context, note, 0.34, 0.045, "sine", startAt, note * 0.98);
      addTone(context, note * 2, 0.2, 0.012, "sine", startAt, note * 1.95);
    });
  });
}

export function playLossSound() {
  safelyPlay((context) => {
    const now = context.currentTime;
    const notes = [330, 247, 185];

    notes.forEach((note, index) => {
      addTone(
        context,
        note,
        0.28,
        0.04,
        "triangle",
        now + index * 0.14,
        note * 0.78
      );
    });
  });
}
