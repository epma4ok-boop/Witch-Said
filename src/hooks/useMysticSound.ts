import { useRef, useCallback } from "react";

export function useMysticSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  // Deep rumble + rising ethereal shimmer — played on tap
  const playInvoke = useCallback(() => {
    try {
      const ac = getCtx();
      const now = ac.currentTime;

      // --- LOW DRONE (sub bass tremor) ---
      const drone = ac.createOscillator();
      const droneGain = ac.createGain();
      drone.type = "sine";
      drone.frequency.setValueAtTime(48, now);
      drone.frequency.linearRampToValueAtTime(38, now + 1.4);
      droneGain.gain.setValueAtTime(0, now);
      droneGain.gain.linearRampToValueAtTime(0.28, now + 0.08);
      droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      drone.connect(droneGain);
      droneGain.connect(ac.destination);
      drone.start(now);
      drone.stop(now + 1.5);

      // --- RISING SHIMMER (ethereal sweep) ---
      const shimmer = ac.createOscillator();
      const shimmerGain = ac.createGain();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(220, now);
      shimmer.frequency.exponentialRampToValueAtTime(660, now + 1.3);
      shimmerGain.gain.setValueAtTime(0, now);
      shimmerGain.gain.linearRampToValueAtTime(0.10, now + 0.15);
      shimmerGain.gain.linearRampToValueAtTime(0.07, now + 0.9);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      // Light chorus via detuned copy
      const shimmer2 = ac.createOscillator();
      shimmer2.type = "sine";
      shimmer2.frequency.setValueAtTime(223, now);
      shimmer2.frequency.exponentialRampToValueAtTime(664, now + 1.3);
      shimmer2.connect(shimmerGain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ac.destination);
      shimmer.start(now);
      shimmer2.start(now);
      shimmer.stop(now + 1.4);
      shimmer2.stop(now + 1.4);

      // --- HARMONIC OVERTONE (mystical fifth above drone) ---
      const fifth = ac.createOscillator();
      const fifthGain = ac.createGain();
      fifth.type = "triangle";
      fifth.frequency.setValueAtTime(72, now);
      fifthGain.gain.setValueAtTime(0, now);
      fifthGain.gain.linearRampToValueAtTime(0.06, now + 0.2);
      fifthGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      fifth.connect(fifthGain);
      fifthGain.connect(ac.destination);
      fifth.start(now);
      fifth.stop(now + 1.3);

      // --- IMPACT THUD (percussive body feel) ---
      const thud = ac.createOscillator();
      const thudGain = ac.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(90, now);
      thud.frequency.exponentialRampToValueAtTime(30, now + 0.18);
      thudGain.gain.setValueAtTime(0.35, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      thud.connect(thudGain);
      thudGain.connect(ac.destination);
      thud.start(now);
      thud.stop(now + 0.22);
    } catch (_) {}
  }, []);

  // Soft bell-like resolution — played when prediction arrives
  const playReveal = useCallback(() => {
    try {
      const ac = getCtx();
      const now = ac.currentTime;

      // Bell harmonics: fundamental + 2nd + 3rd overtones at falling freq
      const freqs = [523, 784, 1047]; // C5, G5, C6
      freqs.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 1.2);
        const vol = [0.13, 0.07, 0.04][i];
        const delay = i * 0.04;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(vol, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.8);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 1.8);
      });

      // Soft pad swell underneath
      const pad = ac.createOscillator();
      const padGain = ac.createGain();
      pad.type = "triangle";
      pad.frequency.setValueAtTime(131, now); // C3
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      pad.connect(padGain);
      padGain.connect(ac.destination);
      pad.start(now);
      pad.stop(now + 2.0);
    } catch (_) {}
  }, []);

  // Quick harmonic shift — played when switching category
  const playSwitch = useCallback((targetFreq: number = 440) => {
    try {
      const ac = getCtx();
      const now = ac.currentTime;
      // Two short ascending tones — "tuning to new frequency"
      [targetFreq * 0.5, targetFreq].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * 0.92, now + i * 0.07);
        osc.frequency.linearRampToValueAtTime(freq, now + i * 0.07 + 0.12);
        gain.gain.setValueAtTime(0, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.09, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.35);
      });
    } catch (_) {}
  }, []);

  return { playInvoke, playReveal, playSwitch };
}
