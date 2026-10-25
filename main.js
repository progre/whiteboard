const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const penButton = document.querySelector("#pen");
const eraserButton = document.querySelector("#eraser");
const preview = document.querySelector("#eraser-preview");

const PEN_WIDTH = 3;
const ERASER_WIDTH = 48;

let tool = "pen";
let current = "pen";
let activePointer = null;
let last = null;

function applyStyle(mode) {
  const isEraser = mode === "eraser";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.lineWidth = isEraser ? ERASER_WIDTH : PEN_WIDTH;
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
}

function resize() {
  const saved = document.createElement("canvas");
  saved.width = canvas.width;
  saved.height = canvas.height;
  saved.getContext("2d").drawImage(canvas, 0, 0);

  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(saved, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  applyStyle(current);
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

function drawTo(x, y) {
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(x, y);
  ctx.stroke();
  last = { x, y };
}

function drawDot(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.fill();
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
  applyStyle(current);
  last = { x: e.clientX, y: e.clientY };
  drawDot(last.x, last.y);
  showPreview(e.clientX, e.clientY);
});

canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId !== activePointer) return;
  const events = e.getCoalescedEvents?.() ?? [e];
  events.forEach((p) => drawTo(p.clientX, p.clientY));
  showPreview(e.clientX, e.clientY);
});

function endStroke(e) {
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  preview.hidden = true;
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
resize();
