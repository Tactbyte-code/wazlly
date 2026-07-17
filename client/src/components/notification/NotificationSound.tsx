/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { useCallback, useRef } from "react";

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isUnlockedRef = useRef(false);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const unlock = useCallback(() => {
    if (isUnlockedRef.current) return;
    try {
      const ctx = getContext();
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      isUnlockedRef.current = true;
    } catch {
      // ignore
    }
  }, [getContext]);

  const playSound = useCallback(() => {
    try {
      const ctx = getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(830, now);
      osc1.frequency.setValueAtTime(1050, now + 0.08);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1250, now + 0.1);
      osc2.frequency.setValueAtTime(1400, now + 0.18);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.setValueAtTime(0.15, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.18);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.1);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.3);
    } catch {
      // ignore audio errors
    }
  }, [getContext]);

  return { playSound, unlock };
}
