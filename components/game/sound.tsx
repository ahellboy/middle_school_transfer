"use client";

import { useEffect, useState } from "react";

class RoomAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgm: HTMLAudioElement | null = null;
  muted = false;
  private started = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("track-sound") === "off";
    } catch {
      this.muted = false;
    }
  }

  unlock() {
    this.ensure();
    if (!this.muted && !this.started) this.startMusic();
  }

  toggle() {
    this.muted = !this.muted;
    try {
      localStorage.setItem("track-sound", this.muted ? "off" : "on");
    } catch {
      /* the choice still applies for this visit */
    }
    if (this.muted) this.silenceMusic();
    else this.unlock();
    return this.muted;
  }

  tap() {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    this.tone(ctx, 620 + Math.random() * 80, 880, 0.16, 0.09, "sine");
  }

  button() {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    this.tone(ctx, 340, 260, 0.09, 0.05, "triangle");
  }

  result() {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      this.tone(ctx, freq, freq, 0.55, index === 3 ? 0.07 : 0.045, "sine", ctx.currentTime + index * 0.16);
    });
  }

  stop() {
    this.silenceMusic();
    this.bgm = null;
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  private ensure() {
    if (!this.ctx) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private ensureBgm() {
    if (this.bgm) return;
    const bgm = new Audio("/BGM1.mp3");
    bgm.loop = true;
    bgm.volume = 0.45;
    this.bgm = bgm;
  }

  private startMusic() {
    if (this.started || this.muted) return;
    this.ensureBgm();
    this.started = true;
    void this.bgm?.play();
  }

  private silenceMusic() {
    this.started = false;
    if (!this.bgm) return;
    this.bgm.pause();
  }

  private tone(
    ctx: AudioContext,
    from: number,
    to: number,
    duration: number,
    peak: number,
    type: OscillatorType,
    when = ctx.currentTime,
  ) {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), when + Math.min(0.07, duration));
    filter.type = "lowpass";
    filter.frequency.value = 2200;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }
}

let audio: RoomAudio | null = null;

export function roomSound() {
  if (!audio) audio = new RoomAudio();
  return audio;
}

export function SoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(roomSound().muted);
  }, []);

  return (
    <div className="sound-row no-print">
      <button
        type="button"
        className="sound-toggle"
        aria-pressed={!muted}
        onClick={() => setMuted(roomSound().toggle())}
      >
        {muted ? "打开音乐" : "音乐开着"}
      </button>
    </div>
  );
}
