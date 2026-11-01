// Confirm the QR library loaded before initializing the app.
if (typeof window.QRCodeStyling === "undefined") {
  const statusElement = document.getElementById("status");
  if (statusElement) {
    statusElement.textContent =
      "QR library could not load. Check your internet connection, then refresh the page.";
    statusElement.style.color = "#ff7777";
  }
  throw new Error("QRCodeStyling library is not loaded. Check the CDN script in index.html.");
}

const $ = (id) => document.getElementById(id);
const qrHost = $("qrCanvas");
let qrCode = null;
let currentPayload = "";
let logoData = null;
let selectedType = "url";

const fieldTemplates = {
  url: [{ name: "url", label: "Website URL", placeholder: "https://example.com", type: "url", wide: true }],
  text: [{ name: "text", label: "Your text", placeholder: "Enter any text...", wide: true }],
  email: [{ name: "email", label: "Email address", placeholder: "hello@example.com", type: "email" }, { name: "subject", label: "Subject", placeholder: "Hello!" }, { name: "body", label: "Message", placeholder: "Write your message...", wide: true }],
  phone: [{ name: "phone", label: "Phone number", placeholder: "+91 98765 43210", wide: true }],
  sms: [{ name: "phone", label: "Phone number", placeholder: "+91 98765 43210" }, { name: "message", label: "SMS message", placeholder: "Type your message" }],
  wifi: [{ name: "ssid", label: "Network name (SSID)", placeholder: "My Wi-Fi", wide: true }, { name: "password", label: "Password", placeholder: "Wi-Fi password", type: "password" }, { name: "security", label: "Security", select: ["WPA", "WEP", "nopass"] }, { name: "hidden", label: "Hidden network", checkbox: true }],
  vcard: [{ name: "first", label: "First name", placeholder: "Jane" }, { name: "last", label: "Last name", placeholder: "Doe" }, { name: "phone", label: "Phone", placeholder: "+1 555 123 4567" }, { name: "email", label: "Email", placeholder: "jane@example.com" }, { name: "org", label: "Organization", placeholder: "Company" }, { name: "website", label: "Website", placeholder: "https://example.com" }],
  event: [{ name: "title", label: "Event title", placeholder: "Team meeting", wide: true }, { name: "location", label: "Location", placeholder: "Office / venue" }, { name: "start", label: "Start date & time", type: "datetime-local" }, { name: "end", label: "End date & time", type: "datetime-local" }, { name: "description", label: "Description", placeholder: "Event details", wide: true }],
  location: [{ name: "lat", label: "Latitude", placeholder: "28.6139" }, { name: "lng", label: "Longitude", placeholder: "77.2090" }],
  whatsapp: [{ name: "phone", label: "WhatsApp number", placeholder: "919876543210" }, { name: "message", label: "Prefilled message", placeholder: "Hello! How can I help?", wide: true }]
};

function renderFields() {
  const host = $("dataFields");
  host.replaceChildren();
  fieldTemplates[selectedType].forEach(f => {
    const label = document.createElement("label");
    label.className = "field" + (f.wide ? " wide-field" : "");
    if (f.wide) label.style.gridColumn = "1 / -1";
    label.append(document.createTextNode(f.label));
    let control;
    if (f.select) {
      control = document.createElement("select");
      f.select.forEach(v => { const o = document.createElement("option"); o.value = v; o.textContent = v === "nopass" ? "No password" : v; control.append(o); });
    } else if (f.checkbox) {
      control = document.createElement("input"); control.type = "checkbox"; control.style.width = "18px"; control.style.height = "18px";
    } else {
      control = document.createElement("input");
      control.type = f.type || "text";
      control.placeholder = f.placeholder || "";
    }
    control.id = "field-" + f.name;
    control.dataset.field = f.name;
    label.append(control);
    host.append(label);
  });
}

function val(name) {
  const el = $("field-" + name);
  return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : "";
}
function buildPayload() {
  switch (selectedType) {
    case "url": {
      const u = val("url"); if (!u) throw Error("Enter a website URL.");
      return /^https?:\/\//i.test(u) ? u : "https://" + u;
    }
    case "text": if (!val("text")) throw Error("Enter some text."); return val("text");
    case "email": {
      const e = val("email"); if (!e) throw Error("Enter an email address.");
      return `mailto:${e}?subject=${encodeURIComponent(val("subject"))}&body=${encodeURIComponent(val("body"))}`;
    }
    case "phone": if (!val("phone")) throw Error("Enter a phone number."); return "tel:" + val("phone");
    case "sms": if (!val("phone")) throw Error("Enter a phone number."); return `SMSTO:${val("phone")}:${val("message")}`;
    case "wifi": {
      const s = val("ssid"); if (!s) throw Error("Enter your Wi-Fi network name.");
      const esc = x => String(x).replace(/([\\;,:"])/g, "\\$1");
      return `WIFI:T:${val("security")};S:${esc(s)};P:${esc(val("password"))};H:${val("hidden") ? "true" : "false"};;`;
    }
    case "vcard": {
      if (!val("first") && !val("last") && !val("phone") && !val("email")) throw Error("Enter at least one contact detail.");
      return ["BEGIN:VCARD", "VERSION:3.0", `N:${val("last")};${val("first")}`, `FN:${val("first")} ${val("last")}`, `ORG:${val("org")}`, `TEL:${val("phone")}`, `EMAIL:${val("email")}`, `URL:${val("website")}`, "END:VCARD"].join("\n");
    }
    case "event": {
      if (!val("title") || !val("start") || !val("end")) throw Error("Enter event title, start and end date.");
      const date = s => s.replace(/[-:]/g, "").replace("T", "") + "00";
      return ["BEGIN:VEVENT", `SUMMARY:${val("title")}`, `LOCATION:${val("location")}`, `DTSTART:${date(val("start"))}`, `DTEND:${date(val("end"))}`, `DESCRIPTION:${val("description")}`, "END:VEVENT"].join("\n");
    }
    case "location": {
      const lat = val("lat"), lng = val("lng");
      if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) throw Error("Enter valid latitude and longitude.");
      return `geo:${lat},${lng}`;
    }
    case "whatsapp": {
      const p = val("phone").replace(/\D/g, ""); if (!p) throw Error("Enter a WhatsApp number with country code.");
      return `https://wa.me/${p}${val("message") ? "?text=" + encodeURIComponent(val("message")) : ""}`;
    }
  }
}

function getOptions() {
  return {
    width: Number($("outputSize").value), height: Number($("outputSize").value),
    type: "canvas", data: currentPayload, margin: 12,
    qrOptions: { errorCorrectionLevel: logoData ? "H" : "Q" },
    image: logoData || undefined, imageOptions: { crossOrigin: "anonymous", margin: 7, imageSize: 0.22, hideBackgroundDots: true },
    dotsOptions: { color: $("foreground").value, type: $("dotStyle").value },
    backgroundOptions: { color: $("background").value },
    cornersSquareOptions: { color: $("foreground").value, type: $("cornerStyle").value },
    cornersDotOptions: { color: $("foreground").value, type: $("cornerDotStyle").value }
  };
}
function generate(silent) {
  try {
    currentPayload = buildPayload();
    qrHost.replaceChildren();
    qrCode = new QRCodeStyling(getOptions());
    qrCode.append(qrHost);
    $("downloadBtn").disabled = false;
    if (!silent) {
      $("status").textContent = "✓ QR code ready. Pick a format and download.";
      $("status").style.color = "#71d7a1";
      if (matchMedia("(max-width:1024px)").matches) $("preview").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    if (!silent) { $("status").textContent = err.message; $("status").style.color = "#ff7777"; }
  }
}
$("generateBtn").addEventListener("click", () => generate());
$("typeGrid").addEventListener("click", e => {
  const btn = e.target.closest(".type-btn"); if (!btn) return;
  selectedType = btn.dataset.type;
  document.querySelectorAll(".type-btn").forEach(b => b.classList.toggle("active", b === btn));
  renderFields();
});
const live = () => { if (currentPayload) generate(true); };
const PAL = { fg: [["#111827", "Black"], ["#2563eb", "Blue"], ["#059669", "Green"], ["#dc2626", "Red"], ["#7c3aed", "Purple"], ["#ea580c", "Orange"]], bg: [["#ffffff", "White"], ["#f1f5f9", "Grey"], ["#fef3c7", "Cream"], ["#dbeafe", "Light blue"]] };
const THEMES = [["Classic", "#111827", "#ffffff", "square", "square", "square"], ["Ocean", "#2563eb", "#ffffff", "rounded", "extra-rounded", "dot"], ["Forest", "#047857", "#ecfdf5", "dots", "dot", "dot"], ["Sunset", "#ea580c", "#fff7ed", "extra-rounded", "extra-rounded", "dot"], ["Violet", "#7c3aed", "#f5f3ff", "classy", "square", "dot"], ["Berry", "#be185d", "#fdf2f8", "rounded", "extra-rounded", "dot"]];
const SHAPE = { square: '<rect x="3" y="3" width="18" height="18"/>', rounded: '<rect x="3" y="3" width="18" height="18" rx="4"/>', "extra-rounded": '<rect x="3" y="3" width="18" height="18" rx="8"/>', dots: '<circle cx="12" cy="12" r="9"/>', dot: '<circle cx="12" cy="12" r="9"/>', classy: '<path d="M3 12A9 9 0 0 1 12 3H21V12A9 9 0 0 1 12 21H3Z"/>' };
function buildSwatches(host, id, list) {
  list.slice().reverse().forEach(([c, n]) => { const b = document.createElement("button"); b.type = "button"; b.className = "swatch"; b.style.background = c; b.title = n; b.setAttribute("aria-label", n); b.dataset.c = c; b.onclick = () => { $(id).value = c; syncUI(); live(); }; $(host).prepend(b); });
  $(id).addEventListener("input", () => { syncUI(); live(); });
}
function buildChoices() {
  document.querySelectorAll(".choices").forEach(h => {
    const sel = $(h.dataset.for);
    [...sel.options].forEach(o => {
      const b = document.createElement("button"); b.type = "button"; b.className = "choice"; b.dataset.v = o.value;
      b.innerHTML = (SHAPE[o.value] ? `<svg viewBox="0 0 24 24" class="${sel.id === "cornerStyle" ? "ring" : ""}" aria-hidden="true">${SHAPE[o.value]}</svg>` : "") + `<span>${o.textContent}</span>`;
      b.onclick = () => { sel.value = o.value; syncUI(); live(); }; h.append(b);
    });
  });
}
function applyTheme(i) { const [, f, g, d, c, k] = THEMES[i]; $("foreground").value = f; $("background").value = g; $("dotStyle").value = d; $("cornerStyle").value = c; $("cornerDotStyle").value = k; syncUI(); }
function lum(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); }
function syncUI() {
  [["foreground", "fgSwatches"], ["background", "bgSwatches"]].forEach(([id, host]) => {
    const h = $(host); let hit = false;
    h.querySelectorAll(".swatch[data-c]").forEach(b => { const on = b.dataset.c === $(id).value.toLowerCase(); b.classList.toggle("active", on); hit = hit || on; });
    const c = h.querySelector(".custom"); c.classList.toggle("active", !hit); c.style.background = hit ? "" : $(id).value;
  });
  document.querySelectorAll(".choices").forEach(h => h.querySelectorAll(".choice").forEach(b => { const on = b.dataset.v === $(h.dataset.for).value; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on); }));
  const a = lum($("foreground").value), b = lum($("background").value), r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05), w = $("contrastNote");
  w.hidden = !(a >= b || r < 3);
  w.textContent = a >= b ? "Tip: keep the QR color darker than the background, or some scanners may not read it." : "These two colors are too similar. Some scanners may not read the code.";
}
$("dataFields").addEventListener("input", () => { clearTimeout(window._lt); window._lt = setTimeout(() => generate(true), 400); });
$("logoUpload").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { $("status").textContent = "Please choose a PNG, JPG or WebP logo."; return; }
  if (file.size > 2 * 1024 * 1024) { $("status").textContent = "Logo must be smaller than 2 MB."; return; }
  const reader = new FileReader(); reader.onload = () => { logoData = reader.result; $("removeLogo").hidden = false; live(); $("status").textContent = "✓ Logo added."; }; reader.readAsDataURL(file);
});
$("resetBtn").addEventListener("click", () => {
  selectedType = "url"; document.querySelectorAll(".type-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
  logoData = null; $("logoUpload").value = "";
  applyTheme(1); $("outputSize").value = "1024"; $("removeLogo").hidden = true; $("downloadBtn").disabled = true; syncUI();
  renderFields(); currentPayload = ""; qrCode = null; qrHost.innerHTML = '<div class="placeholder"><div class="placeholder-icon">▦</div><strong>Your QR code appears here</strong><span>Choose a type and enter your data</span></div>'; $("status").textContent = "Form reset.";
});
async function download(format) {
  if (!qrCode) { $("status").textContent = "Generate a QR code first."; return; }
  try {
    if (format === "pdf") {
      const blob = await qrCode.getRawData("png"); const url = URL.createObjectURL(blob);
      const img = new Image(); img.src = url; await img.decode();
      const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const side = 150; pdf.addImage(img, "PNG", (210 - side) / 2, 35, side, side); pdf.setFontSize(12); pdf.text("QR Studio", 105, 200, { align: "center" }); pdf.save("qr-code.pdf"); URL.revokeObjectURL(url);
    } else {
      await qrCode.download({ name: "qr-code", extension: format });
    }
    $("status").textContent = `✓ ${format.toUpperCase()} download started.`;
  } catch (err) { $("status").textContent = "Download failed. Please try again."; }
}
let selectedFormat = "png";
document.querySelectorAll(".format-btn").forEach(b => b.addEventListener("click", () => { selectedFormat = b.dataset.format; document.querySelectorAll(".format-btn").forEach(x => { x.classList.toggle("active", x === b); x.setAttribute("aria-checked", x === b); }); $("downloadBtn").textContent = "Download " + selectedFormat.toUpperCase(); }));
$("downloadBtn").addEventListener("click", () => download(selectedFormat));
$("downloadAll").addEventListener("click", async () => {
  if (!qrCode) { $("status").textContent = "Generate a QR code first."; return; }
  for (const f of ["png", "svg", "pdf", "webp"]) { await download(f); await new Promise(r => setTimeout(r, 350)); }
});
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("qr-studio-theme", document.body.classList.contains("light") ? "light" : "dark");
});
if (localStorage.getItem("qr-studio-theme") === "light") document.body.classList.add("light");
renderFields();
$("removeLogo").onclick = () => { logoData = null; $("logoUpload").value = ""; $("removeLogo").hidden = true; live(); };
buildSwatches("fgSwatches", "foreground", PAL.fg); buildSwatches("bgSwatches", "background", PAL.bg);
THEMES.forEach(([n, f, g], i) => { const b = document.createElement("button"); b.type = "button"; b.className = "theme"; b.innerHTML = `<i style="background:${g};color:${f}"><u></u></i><span>${n}</span>`; b.onclick = () => { applyTheme(i); live(); }; $("themeGrid").append(b); });
buildChoices(); applyTheme(1);

// ---- Scan (decode) ----
let stream = null, raf = 0;
const QR_URLS = ["https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js", "https://unpkg.com/jsqr@1.4.0/dist/jsQR.js", "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.js"];
async function ensureQR() {
  if (window.jsQR) return true;
  for (const u of QR_URLS) {
    try { await new Promise((ok, no) => { const s = document.createElement("script"); s.src = u; s.onload = ok; s.onerror = no; document.head.append(s); }); } catch { }
    if (window.jsQR) return true;
  }
  smsg("Scanner library could not load. Check your internet and refresh."); return false;
}
const smsg = t => { $("scanMsg").textContent = t; $("scanMsg").style.color = "#ff7777"; };
function kind(s) { return /^https?:\/\//i.test(s) ? "Website link" : /^WIFI:/i.test(s) ? "Wi-Fi network" : /^mailto:/i.test(s) ? "Email" : /^tel:/i.test(s) ? "Phone number" : /^(SMSTO|sms):/i.test(s) ? "SMS" : /^geo:/i.test(s) ? "Location" : /^BEGIN:VCARD/i.test(s) ? "Contact card" : /^BEGIN:VEVENT/i.test(s) ? "Calendar event" : "Text"; }
function showResult(t) {
  $("scanMsg").textContent = ""; $("scanKind").textContent = kind(t); $("scanText").textContent = t; $("scanResult").hidden = false;
  const open = /^https?:\/\//i.test(t); $("scanOpen").hidden = !open; if (open) $("scanOpen").href = t;
}
async function decodeCanvas(c) {
  if ("BarcodeDetector" in window) {
    try { const r = await new BarcodeDetector({ formats: ["qr_code"] }).detect(c); if (r.length) return r[0].rawValue; } catch { }
  }
  if (!window.jsQR) return null;
  for (const k of [1, .6, .35, .2]) {
    const w = Math.round(c.width * k), h = Math.round(c.height * k); if (w < 80) break;
    const t = document.createElement("canvas"); t.width = w; t.height = h; const x = t.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, w, h);
    const r = jsQR(x.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" }); if (r) return r.data;
  }
  return null;
}
$("scanFile").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return; stopCam(); if (!await ensureQR()) return; $("scanResult").hidden = true; $("scanMsg").textContent = "";
  const img = new Image(); img.src = URL.createObjectURL(f);
  try { await img.decode(); } catch { smsg("This image could not be opened."); return; }
  const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  const r = await decodeCanvas(c); if (r) showResult(r); else smsg("No QR code found. Try a clearer, closer image. Very round dots or a big logo can make a QR hard to read.");
  e.target.value = "";
});
async function startCam() {
  $("scanResult").hidden = true; $("scanMsg").textContent = "";
  if (!await ensureQR()) return;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); } catch { smsg("Camera not available. Allow camera access, or upload an image instead."); return; }
  const v = $("scanVideo"); v.srcObject = stream; v.hidden = false; await v.play(); $("camBtn").textContent = "Stop camera"; tick();
}
let busy = false;
async function tick() {
  const v = $("scanVideo"); if (!stream) return;
  if (!busy && v.readyState === v.HAVE_ENOUGH_DATA) {
    busy = true; const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d", { willReadFrequently: true }).drawImage(v, 0, 0);
    const r = await decodeCanvas(c); busy = false; if (r) { showResult(r); stopCam(); return; }
  }
  raf = requestAnimationFrame(tick);
}
function stopCam() { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $("scanVideo").hidden = true; $("camBtn").textContent = "Use camera"; }
$("camBtn").addEventListener("click", () => stream ? stopCam() : startCam());
$("scanCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("scanText").textContent); $("scanCopy").textContent = "Copied ✓"; setTimeout(() => $("scanCopy").textContent = "Copy", 1500); } catch { smsg("Could not copy. Select the text and copy it manually."); } });
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  const scan = t.dataset.view === "scan";
  document.querySelectorAll(".tab").forEach(x => { x.classList.toggle("active", x === t); x.setAttribute("aria-selected", x === t); });
  $("createView").hidden = scan; $("scanView").hidden = !scan; if (!scan) stopCam();
}));
