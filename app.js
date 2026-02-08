// Klonshie: safe-by-default flashing + synthesized alarm using Web Audio API

const panel = document.getElementById("panel");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

const flashToggle = document.getElementById("flashToggle");
const soundToggle = document.getElementById("soundToggle");

const speed = document.getElementById("speed");
const speedVal = document.getElementById("speedVal");

const volume = document.getElementById("volume");
const volVal = document.getElementById("volVal");

let flashTimer = null;
let flashOn = false;

// Audio
let audioCtx = null;
let masterGain = null;
let oscA = null;
let oscB = null;
let lfo = null;
let lfoGain = null;

function prefersReducedMotion() {
  return window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setPanelState(isOn) {
  // Avoid harsh strobe colors; use gentle contrast shifts
  if (!isOn) {
    panel.style.background = "#0f1422";
    panel.textContent = "Idle";
    return;
  }
  panel.style.background = flashOn ? "#ffffff" : "#1b2240";
  panel.textContent = flashOn ? "⚠️" : "";
}

function startFlashing() {
  stopFlashing();

  if (prefersReducedMotion()) {
    // If user prefers reduced motion, do not flash.
    flashToggle.checked = false;
    panel.textContent = "Reduce Motion is ON — flashing disabled";
    return;
  }

  const hz = parseFloat(speed.value); // 0.5–2.0 Hz range
  const intervalMs = Math.max(250, Math.round(1000 / (hz * 2))); // toggle twice per cycle

  flashTimer = setInterval(() => {
    flashOn = !flashOn;
    setPanelState(true);
  }, intervalMs);

  // immediate visual
  flashOn = false;
  setPanelState(true);
}

function stopFlashing() {
  if (flashTimer) clearInterval(flashTimer);
  flashTimer = null;
  flashOn = false;
  setPanelState(false);
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = parseFloat(volume.value);
    masterGain.connect(audioCtx.destination);
  }
}

function startAlarm() {
  stopAlarm();
  ensureAudio();

  // Two oscillators to make a more “alarm-like” tone without using a real sample
  oscA = audioCtx.createOscillator();
  oscB = audioCtx.createOscillator();
  oscA.type = "square";
  oscB.type = "sawtooth";
  oscA.frequency.value = 520;
  oscB.frequency.value = 780;

  const mix = audioCtx.createGain();
  mix.gain.value = 0.25;
  oscA.connect(mix);
  oscB.connect(mix);

  // LFO to pulse volume like an alarm
  lfo = audioCtx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 2.2; // pulsing rate

  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.22; // depth of pulsing

  lfo.connect(lfoGain);
  lfoGain.connect(mix.gain);

  mix.connect(masterGain);

  oscA.start();
  oscB.start();
  lfo.start();
}

function stopAlarm() {
  if (oscA) oscA.stop();
  if (oscB) oscB.stop();
  if (lfo) lfo.stop();

  oscA = oscB = lfo = null;
  lfoGain = null;
}

function updateSpeedLabel() {
  speedVal.textContent = `${parseFloat(speed.value).toFixed(1)} Hz`;
}

function updateVolumeLabel() {
  const v = parseFloat(volume.value);
  volVal.textContent = `${Math.round(v * 100)}%`;
  if (masterGain) masterGain.gain.value = v;
}

function startAll() {
  panel.textContent = "Running…";
  if (flashToggle.checked) startFlashing();
  if (soundToggle.checked) startAlarm();
}

function stopAll() {
  stopFlashing();
  stopAlarm();
}

startBtn.addEventListener("click", async () => {
  // Required on many browsers: audio starts after a user gesture
  if (soundToggle.checked) {
    ensureAudio();
    if (audioCtx.state === "suspended") await audioCtx.resume();
  }
  startAll();
});

stopBtn.addEventListener("click", () => stopAll());

flashToggle.addEventListener("change", () => {
  if (flashToggle.checked) startFlashing();
  else stopFlashing();
});

soundToggle.addEventListener("change", async () => {
  if (soundToggle.checked) {
    ensureAudio();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    startAlarm();
  } else {
    stopAlarm();
  }
});

speed.addEventListener("input", () => {
  updateSpeedLabel();
  if (flashTimer) startFlashing(); // restart with new speed
});

volume.addEventListener("input", updateVolumeLabel);

// Init
updateSpeedLabel();
updateVolumeLabel();
setPanelState(false);
