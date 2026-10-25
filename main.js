const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const penButton = document.querySelector("#pen");
const eraserButton = document.querySelector("#eraser");
const preview = document.querySelector("#eraser-preview");

const PEN_WIDTH = 3;
const ERASER_WIDTH = 48;
const STORAGE_KEY = "whiteboard";

let tool = "pen";
let current = "pen";
let activePointer = null;

// iOS 16.3 以前は screen.orientation がないため、旧来の window.orientation を使う
function currentAngle() {
  return screen.orientation?.angle ?? globalThis.orientation ?? 0;
}

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseAngle, strokes }));
  } catch {
    // 容量超過などで保存できなくても描画は続ける
  }
}

const saved = loadSaved();
const baseAngle = saved?.baseAngle ?? currentAngle();
const strokes = saved?.strokes ?? [];

// 紙の向きは画面と一緒に回るため、起動時からの回転量で描画を回す
function paperRotation() {
  const turned = (((currentAngle() - baseAngle) % 360) + 360) % 360;
  return (-turned * Math.PI) / 180;
}

function toView(offset) {
  const a = paperRotation();
  return {
    x: innerWidth / 2 + offset.x * Math.cos(a) - offset.y * Math.sin(a),
    y: innerHeight / 2 + offset.x * Math.sin(a) + offset.y * Math.cos(a),
  };
}

function toOffset(point) {
  const a = -paperRotation();
  const dx = point.x - innerWidth / 2;
  const dy = point.y - innerHeight / 2;
  return {
    x: dx * Math.cos(a) - dy * Math.sin(a),
    y: dx * Math.sin(a) + dy * Math.cos(a),
  };
}

function applyStyle(mode) {
  const isEraser = mode === "eraser";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.lineWidth = isEraser ? ERASER_WIDTH : PEN_WIDTH;
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
}

function replay(stroke) {
  applyStyle(stroke.mode);
  const points = stroke.points.map(toView);
  ctx.beginPath();
  if (points.length === 1) {
    ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.stroke();
}

function render() {
  const dpr = devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  strokes.forEach(replay);
  applyStyle(current);
}

function resize() {
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  render();
}

function showPreview(x, y) {
  preview.hidden = current !== "eraser";
  preview.style.left = x + "px";
  preview.style.top = y + "px";
}

function enterFullscreen() {
  if (document.fullscreenElement || !document.fullscreenEnabled) return;
  document.documentElement.requestFullscreen().catch(() => {});
}

function drawSegment(from, to) {
  const a = toView(from);
  const b = toView(to);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function selectTool(next) {
  tool = next;
  current = next;
  penButton.setAttribute("aria-pressed", String(next === "pen"));
  eraserButton.setAttribute("aria-pressed", String(next === "eraser"));
}

canvas.addEventListener("pointerdown", (e) => {
  if (activePointer !== null) return;
  activePointer = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  const isStylusEraser = e.pointerType === "pen" && (e.buttons & 32) !== 0;
  current = isStylusEraser ? "eraser" : tool;
  strokes.push({
    mode: current,
    points: [toOffset({ x: e.clientX, y: e.clientY })],
  });
  replay(strokes.at(-1));
  applyStyle(current);
  showPreview(e.clientX, e.clientY);
});

canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId !== activePointer) return;
  const stroke = strokes.at(-1);
  const events = e.getCoalescedEvents?.() ?? [e];
  events.forEach((p) => {
    const next = toOffset(p);
    drawSegment(stroke.points.at(-1), next);
    stroke.points.push(next);
  });
  showPreview(e.clientX, e.clientY);
});

function endStroke(e) {
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  preview.hidden = true;
  save();
}

canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("pointerdown", enterFullscreen);
document.addEventListener("touchmove", (e) => e.preventDefault(), {
  passive: false,
});
document.addEventListener("gesturestart", (e) => e.preventDefault());

penButton.addEventListener("click", () => selectTool("pen"));
eraserButton.addEventListener("click", () => selectTool("eraser"));

preview.style.width = ERASER_WIDTH + "px";
preview.style.height = ERASER_WIDTH + "px";
addEventListener("resize", resize);
screen.orientation?.addEventListener("change", resize);
addEventListener("orientationchange", resize);
resize();
