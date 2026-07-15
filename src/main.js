import { createDevice } from "@rnbo/js";


let context;
let device;

const DEFAULT_READER_VOLUME = 0.75;
const EMPTY_READER_VOLUME = 0;

const readerVolumes = {
  1: DEFAULT_READER_VOLUME,
  2: DEFAULT_READER_VOLUME,
  3: DEFAULT_READER_VOLUME,
  4: DEFAULT_READER_VOLUME
};

const readerParamNames = {
  1: "quad_1_sample",
  2: "quad_2_sample",
  3: "quad_3_sample",
  4: "quad_4_sample"
};

const readerVolumeParamNames = {
  1: "quad_1_vol",
  2: "quad_2_vol",
  3: "quad_3_vol",
  4: "quad_4_vol"
};

function clearAllReaders() {
  for (let i = 1; i <= 4; i++) {
    setRNBOReaderVolume(i, EMPTY_READER_VOLUME);
  }
}

async function setupRNBO() {
  context = createAudioContext();

  const patcherResponse = await fetch("/rnbo/zutan_web.export.json");
  const patcher = await patcherResponse.json();

  device = await createDevice({
    context,
    patcher
  });
  clearAllReaders();

  console.log("RNBO parameters:", device.parameters);

  const dependenciesResponse = await fetch("/rnbo/dependencies.json");
  const dependencies = await dependenciesResponse.json();

  const fixedDependencies = dependencies.map((dep) => {
    if (dep.file) {
      return {
        ...dep,
        file: `/rnbo/${dep.file.replaceAll("\\", "/")}`
      };
    }

    return dep;
  });

  const results = await device.loadDataBufferDependencies(fixedDependencies);

  results.forEach((result) => {
    if (result.type === "success") {
      console.log(`Loaded buffer: ${result.id}`);
    } else {
      console.warn(`Failed to load buffer: ${result.id}`, result.error);
    }
  });

  device.node.connect(context.destination);
  syncReadersToRNBO();

  window.rnboDevice = device;
}

function syncReadersToRNBO() {
  for (let i = 1; i <= 4; i++) {
    const reader = document.querySelector(`.reader[data-reader="${i}"]`);
    const card = reader?.querySelector(".card");

    if (card) {
      const sampleId = Number(card.dataset.sampleId);

      setRNBOReaderValue(i, sampleId);
      setRNBOReaderVolume(i, readerVolumes[i]);
    } else {
      setRNBOReaderVolume(i, EMPTY_READER_VOLUME);
    }
  }
}

function getParamByName(name) {
  if (!device) return null;

  return device.parameters.find((p) => {
    return p.name === name || p.id === name;
  });
}

function setRNBOReaderValue(readerNumber, value) {
  if (!device) return;

  const paramName = readerParamNames[readerNumber];
  const param = getParamByName(paramName);

  if (!param) {
    console.warn(`Could not find RNBO parameter: ${paramName}`);
    return;
  }

  // Your RNBO param range is 0–20, but steps is 0,
  // so JS should force integer values.
  const intValue = Math.round(Number(value));
  const clampedValue = Math.max(0, Math.min(20, intValue));

  param.value = clampedValue;

  console.log(`${paramName} = ${clampedValue}`);
}

function setRNBOReaderVolume(readerNumber, value) {
  if (!device) return;

  const paramName = readerVolumeParamNames[readerNumber];
  const param = getParamByName(paramName);

  if (!param) {
    console.warn(`Could not find RNBO parameter: ${paramName}`);
    return;
  }

  const clampedValue = Math.max(0, Math.min(1, Number(value)));

  param.value = clampedValue;

  console.log(`${paramName} = ${clampedValue}`);
}

const soundCards = [
  { id: 0, name: "エアコン", emoji: "❄️" },
  { id: 1, name: "海辺", emoji: "🏖️" },
  { id: 2, name: "チップス", emoji: "🥔" },
  { id: 3, name: "カウベル", emoji: "🔔" },
  { id: 4, name: "カエル", emoji: "🐸" },
  { id: 5, name: "ボトル", emoji: "🍾" },
  { id: 6, name: "雨", emoji: "🌧️" },
  { id: 7, name: "駅", emoji: "🚉" },
  { id: 8, name: "火", emoji: "🔥" },
  { id: 9, name: "ニワトリ", emoji: "🐓" },
  { id: 10, name: "犬", emoji: "🐕" },
  { id: 11, name: "自転車", emoji: "🚲" },
  { id: 12, name: "電車", emoji: "🚆" },
  { id: 13, name: "森", emoji: "🌲" },
  { id: 14, name: "水", emoji: "💧" },
  { id: 15, name: "滝", emoji: "🏞️" },
  { id: 16, name: "電気", emoji: "⚡" },
  { id: 17, name: "ブタ", emoji: "🐖" },
  { id: 18, name: "猫", emoji: "🐈" },
  { id: 19, name: "風", emoji: "🌬️" }
];

function createCards() {
  const tray = document.querySelector("#card-tray");
  tray.innerHTML = "";

  soundCards.forEach((sound, index) => {
    const card = document.createElement("div");
    card.className = "card";

    // This is the number sent to RNBO.
    card.dataset.sampleId = sound.id;

    card.innerHTML = `
      <div class="card-emoji">${sound.emoji}</div>
      <div class="card-name">${sound.name}</div>
    `;

    card.style.background = cardColor(index);

    tray.appendChild(card);
    makeDraggable(card);
  });
}
function cardColor(i) {
  const colors = [
    "#57506f",
    "#d9b56f",
    "#bd5f55",
    "#7890a1",
    "#7f9b78",
    "#c98f61",
    "#8c6d8f",
    "#b5a56a"
  ];

  return colors[i % colors.length];
}

function makeDraggable(card) {
  let offsetX = 0;
  let offsetY = 0;

  card.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    const rect = card.getBoundingClientRect();

    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    // Lock current size before moving it out of the grid
    card.style.width = `${rect.width}px`;
    card.style.height = `${rect.height}px`;

    const oldReader = card.closest(".reader");

    if (oldReader) {
  const oldReaderNumber = Number(oldReader.dataset.reader);
  oldReader.classList.remove("active");

  setRNBOReaderVolume(oldReaderNumber, EMPTY_READER_VOLUME);
}
    document.body.appendChild(card);

    card.classList.add("dragging");
    card.classList.remove("in-reader");

    card.style.left = `${event.clientX - offsetX}px`;
    card.style.top = `${event.clientY - offsetY}px`;

    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (!card.classList.contains("dragging")) return;

    card.style.left = `${event.clientX - offsetX}px`;
    card.style.top = `${event.clientY - offsetY}px`;
  });

  card.addEventListener("pointerup", (event) => {
    if (!card.classList.contains("dragging")) return;

    card.classList.remove("dragging");

    const reader = getReaderUnderPointer(event.clientX, event.clientY);

    if (reader) {
      placeCardOnReader(card, reader);
    } else {
      returnCardToTray(card);
    }

    card.releasePointerCapture(event.pointerId);
  });
}

function moveCard(card, x, y, offsetX, offsetY) {
  card.style.left = `${x - offsetX}px`;
  card.style.top = `${y - offsetY}px`;
}

function getReaderUnderPointer(x, y) {
  const readers = document.querySelectorAll(".reader");

  for (const reader of readers) {
    const rect = reader.getBoundingClientRect();

    const inside =
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom;

    if (inside) return reader;
  }

  return null;
}

function placeCardOnReader(card, reader) {
  const existingCard = reader.querySelector(".card");

  if (existingCard && existingCard !== card) {
    returnCardToTray(existingCard);
  }

  reader.appendChild(card);

  card.classList.add("in-reader");

  card.style.left = "";
  card.style.top = "";
  card.style.width = "";
  card.style.height = "";

 reader.classList.add("active");

const readerNumber = Number(reader.dataset.reader);
const sampleId = Number(card.dataset.sampleId);

setRNBOReaderValue(readerNumber, sampleId);
setRNBOReaderVolume(readerNumber, readerVolumes[readerNumber]);
}

function returnCardToTray(card) {
  const tray = document.querySelector("#card-tray");

  tray.appendChild(card);

  card.classList.remove("dragging");
  card.classList.remove("in-reader");

  card.style.left = "";
  card.style.top = "";
  card.style.width = "";
  card.style.height = "";
}

function createVolumeKnobs() {
  const knobs = document.querySelectorAll(".knob");

  knobs.forEach((knob) => {
    const readerNumber = Number(knob.dataset.reader);

    updateKnobVisual(knob, readerVolumes[readerNumber]);

    knob.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      knob.setPointerCapture(event.pointerId);

      updateKnobFromPointer(knob, event);
    });

    knob.addEventListener("pointermove", (event) => {
      if (!knob.hasPointerCapture(event.pointerId)) return;
      updateKnobFromPointer(knob, event);
    });

    knob.addEventListener("pointerup", (event) => {
      if (knob.hasPointerCapture(event.pointerId)) {
        knob.releasePointerCapture(event.pointerId);
      }
    });
  });
}

function updateKnobFromPointer(knob, event) {
  const readerNumber = Number(knob.dataset.reader);

  const rect = knob.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;

  let angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // Convert so the knob range feels like:
  // bottom-left = 0, top = middle-ish, bottom-right = 1
  angle += 90;

  if (angle < 0) angle += 360;

  // Limit knob travel to 270 degrees.
  // Dead zone is at the bottom.
  let value = angle / 270;

  if (angle > 270) {
    value = angle < 315 ? 1 : 0;
  }

  value = Math.max(0, Math.min(1, value));

  readerVolumes[readerNumber] = value;

  updateKnobVisual(knob, value);

  // Only update RNBO volume if a card is actually on that reader.
  const reader = document.querySelector(`.reader[data-reader="${readerNumber}"]`);
  const hasCard = !!reader.querySelector(".card");

  if (hasCard) {
    setRNBOReaderVolume(readerNumber, value);
  }
}

function updateKnobVisual(knob, value) {
  // Rotate from -135deg to +135deg
  const angle = -135 + value * 270;
  knob.style.transform = `rotate(${angle}deg)`;
}

let rnboReadyPromise = null;
let audioUnlocked = false;

function createAudioContext() {
  if (!context) {
    const WAContext = window.AudioContext || window.webkitAudioContext;
    context = new WAContext();
  }

  return context;
}

function prepareRNBO() {
  if (!rnboReadyPromise) {
    rnboReadyPromise = setupRNBO().catch((err) => {
      console.error("RNBO setup failed:", err);
      rnboReadyPromise = null;
    });
  }

  return rnboReadyPromise;
}

async function unlockAudioFromInteraction() {
  createAudioContext();
  prepareRNBO();

  if (audioUnlocked) return;

  if (context.state !== "running") {
    await context.resume();
  }

  audioUnlocked = true;
  console.log("Audio unlocked");
}

// First interaction anywhere on the page starts audio.
// Dragging a card or touching a knob counts.
window.addEventListener("pointerdown", unlockAudioFromInteraction, {
  capture: true
});

window.addEventListener("keydown", unlockAudioFromInteraction, {
  capture: true
});

// Start loading RNBO immediately, but actual audio waits for interaction.
prepareRNBO();

createCards();
createVolumeKnobs();
