// ข้อมูลร้านทั้งหมดมาจาก config.js (window.SHOP)
const SHOP = window.SHOP;
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------- เวลา: ใช้เวลาประเทศไทยเสมอ ไม่ว่าคนดูจะอยู่ที่ไหน ----------
function bangkokNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, minutes: toMinutes(`${p.hour}:${p.minute}`), day: dayOf(date) };
}
const toMinutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const dayOf = (isoDate) => new Date(isoDate + "T00:00:00Z").getUTCDay();
const hoursFor = (day) => SHOP.hours.find((h) => h.days.includes(day));
const addDays = (isoDate, n) => {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const thaiDate = (isoDate) => new Date(isoDate + "T00:00:00Z").toLocaleDateString("th-TH", {
  timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ---------- ใส่ข้อมูลร้านลงหน้าเว็บ ----------
$$("[data-shop]").forEach((el) => { el.textContent = SHOP[el.dataset.shop]; });
if (!SHOP.demo) $$("[data-demo-only]").forEach((el) => el.remove());
$("#year").textContent = new Date().getFullYear();

// ---------- ธีมมืด/สว่าง ----------
$("#themeToggle").addEventListener("click", () => {
  const root = document.documentElement;
  const current = root.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) {}
});

// ---------- เมนูมือถือ ----------
const nav = $("#nav");
const menuToggle = $("#menuToggle");
menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", open);
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

// ---------- เมนูอาหาร (แท็บ) ----------
const tabs = $("#menuTabs");
const panels = $("#menuPanels");
SHOP.menu.forEach((cat, i) => {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "tab";
  tab.id = `tab-${cat.id}`;
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", `panel-${cat.id}`);
  tab.setAttribute("aria-selected", i === 0);
  tab.textContent = cat.title;
  tab.addEventListener("click", () => selectTab(cat.id));
  tabs.append(tab);

  const list = document.createElement("ul");
  list.className = "menu-list";
  list.id = `panel-${cat.id}`;
  list.setAttribute("role", "tabpanel");
  list.setAttribute("aria-labelledby", tab.id);
  list.hidden = i !== 0;
  cat.items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "menu-item";
    li.innerHTML = `<div><h3></h3><p></p></div><span class="price"></span>`;
    li.querySelector("h3").textContent = item.name;
    li.querySelector("p").textContent = item.desc;
    li.querySelector(".price").textContent = `฿${item.price}`;
    list.append(li);
  });
  panels.append(list);
});
function selectTab(id) {
  $$(".tab").forEach((t) => t.setAttribute("aria-selected", t.id === `tab-${id}`));
  $$(".menu-list").forEach((p) => { p.hidden = p.id !== `panel-${id}`; });
}
// ใช้ปุ่มลูกศรซ้าย/ขวาเลื่อนแท็บได้ (การเข้าถึงสำหรับคีย์บอร์ด)
tabs.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  const all = [...$$(".tab")];
  const i = all.indexOf(document.activeElement);
  const next = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
  next.focus();
  next.click();
});

// ---------- เวลาเปิด + สถานะ "เปิดอยู่ตอนนี้" ----------
const now = bangkokNow();
SHOP.hours.forEach((h) => {
  const row = document.createElement("div");
  if (h.days.includes(now.day)) row.className = "today";
  row.innerHTML = "<dt></dt><dd></dd>";
  row.querySelector("dt").textContent = h.label;
  row.querySelector("dd").textContent = `${h.open} – ${h.close} น.`;
  $("#hoursList").append(row);
});
function renderOpenStatus() {
  const t = bangkokNow();
  const h = hoursFor(t.day);
  const el = $("#openStatus");
  const isOpen = h && t.minutes >= toMinutes(h.open) && t.minutes < toMinutes(h.close);
  el.classList.toggle("is-open", Boolean(isOpen));
  el.innerHTML = '<span class="dot"></span><span></span>';
  const tomorrow = hoursFor((t.day + 1) % 7);
  el.lastChild.textContent = isOpen
    ? `เปิดอยู่ตอนนี้ · ปิด ${h.close} น.`
    : h && t.minutes < toMinutes(h.open) ? `ยังไม่เปิด · วันนี้เปิด ${h.open} น.`
    : tomorrow ? `ปิดแล้ว · พรุ่งนี้เปิด ${tomorrow.open} น.` : "วันนี้ร้านปิด";
}
renderOpenStatus();
setInterval(renderOpenStatus, 60_000);

// ---------- แผนที่ (OpenStreetMap ฟรี ไม่ต้องใช้ API key) ----------
const { lat, lng } = SHOP.map;
const d = 0.006;
$("#mapFrame").src = "https://www.openstreetmap.org/export/embed.html" +
  `?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
$("#mapsLink").href = mapsUrl;
$("#mapBtn").href = mapsUrl;

// ---------- Dialog ช่วยแสดงข้อความ ----------
const dialog = $("#dialog");
function showDialog(title, bodyNodes, extraActions = []) {
  $("#dialogTitle").textContent = title;
  $("#dialogBody").replaceChildren(...bodyNodes);
  const actions = $("#dialogActions");
  actions.replaceChildren(...extraActions);
  const close = document.createElement("button");
  close.className = "btn btn-primary";
  close.value = "close";
  close.textContent = "ตกลง";
  actions.append(close);
  dialog.showModal();
}
const para = (text) => { const p = document.createElement("p"); p.textContent = text; return p; };

// ---------- ปุ่มโทร / LINE ----------
const isDemoContact = (value) => SHOP.demo || !value;
$("#callBtn").href = SHOP.phone ? `tel:${SHOP.phone}` : "#";
$("#callBtn").addEventListener("click", (e) => {
  if (!isDemoContact(SHOP.phone)) return;
  e.preventDefault();
  showDialog("ปุ่มโทรหาร้าน", [
    para("นี่คือเว็บไซต์ตัวอย่าง ในเว็บจริงปุ่มนี้จะเปิดแอปโทรศัพท์และโทรหาร้านทันที"),
    para("วิธีใช้งานจริง: ใส่เบอร์ร้านในไฟล์ config.js ช่อง phone แล้วตั้ง demo เป็น false"),
  ]);
});
const lineUrl = SHOP.lineId
  ? `https://line.me/R/ti/p/${SHOP.lineId.startsWith("@") ? SHOP.lineId : "~" + SHOP.lineId}`
  : "#";
$("#lineBtn").href = lineUrl;
$("#lineBtn").addEventListener("click", (e) => {
  if (!isDemoContact(SHOP.lineId)) return;
  e.preventDefault();
  showDialog("ปุ่มแชต LINE", [
    para("นี่คือเว็บไซต์ตัวอย่าง ในเว็บจริงปุ่มนี้จะเปิดแชต LINE ของร้านเพื่อสอบถามหรือสั่งล่วงหน้า"),
    para("วิธีใช้งานจริง: ใส่ LINE ID ของร้านใน config.js ช่อง lineId"),
  ]);
});

// ---------- ฟอร์มจองโต๊ะ ----------
const form = $("#bookingForm");
const dateInput = $("#f-date");
dateInput.min = now.date;
dateInput.max = addDays(now.date, 60);

function validate(data) {
  const errors = {};
  if (data.name.length < 2) errors.name = "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร";
  if (!/^0\d{8,9}$/.test(data.phone)) errors.phone = "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก";

  const today = bangkokNow();
  if (!data.date) errors.date = "กรุณาเลือกวันที่";
  else if (data.date < today.date) errors.date = "เลือกวันที่ผ่านมาแล้วไม่ได้";
  else if (data.date > addDays(today.date, 60)) errors.date = "จองล่วงหน้าได้ไม่เกิน 60 วัน";

  if (!data.time) errors.time = "กรุณาเลือกเวลา";
  else if (!errors.date) {
    const h = hoursFor(dayOf(data.date));
    const t = toMinutes(data.time);
    // รับจองถึง 1 ชั่วโมงก่อนร้านปิด
    if (!h) errors.time = "วันนี้ร้านปิด";
    else if (t < toMinutes(h.open) || t > toMinutes(h.close) - 60) {
      errors.time = `วันนั้นรับจอง ${h.open} – ${minutesToHHMM(toMinutes(h.close) - 60)} น.`;
    } else if (data.date === today.date && t <= today.minutes) {
      errors.time = "เวลานี้ผ่านไปแล้ว";
    }
  }
  if (!data.guests) errors.guests = "กรุณาเลือกจำนวนคน";
  return errors;
}
const minutesToHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function readForm() {
  const f = new FormData(form);
  return {
    name: String(f.get("name")).trim(),
    phone: String(f.get("phone")).replace(/[\s-]/g, ""),
    date: f.get("date"),
    time: f.get("time"),
    guests: f.get("guests"),
    note: String(f.get("note")).trim(),
  };
}

function showErrors(errors) {
  $$(".error").forEach((el) => {
    const msg = errors[el.dataset.for] || "";
    el.textContent = msg;
    el.closest(".field").classList.toggle("invalid", Boolean(msg));
    const input = el.closest(".field").querySelector("input, select");
    input.setAttribute("aria-invalid", Boolean(msg));
  });
}

// ตรวจซ้ำทันทีเมื่อแก้ช่องที่เคยผิด
form.addEventListener("input", (e) => {
  const field = e.target.closest(".field");
  if (field?.classList.contains("invalid")) showErrors(validate(readForm()));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = readForm();
  const errors = validate(data);
  showErrors(errors);
  if (Object.keys(errors).length) {
    form.querySelector(".invalid input, .invalid select")?.focus();
    return;
  }

  // ส่งไป webhook (เช่น n8n) เฉพาะเมื่อไม่ใช่โหมดตัวอย่างและตั้งค่า URL ไว้
  if (!SHOP.demo && SHOP.bookingWebhookUrl) {
    const btn = $("#submitBtn");
    btn.disabled = true;
    btn.textContent = "กำลังส่ง…";
    try {
      const res = await fetch(SHOP.bookingWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source: "website" }),
      });
      if (!res.ok) throw new Error(res.status);
    } catch (err) {
      showDialog("ส่งไม่สำเร็จ", [para("ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่หรือโทรหาร้าน")]);
      return;
    } finally {
      btn.disabled = false;
      btn.textContent = "ยืนยันการจอง";
    }
  }

  showSuccess(data);
  form.reset();
});

function showSuccess(data) {
  const summary = [
    ["ชื่อ", data.name], ["เบอร์", data.phone], ["วันที่", thaiDate(data.date)],
    ["เวลา", `${data.time} น.`], ["จำนวน", `${data.guests} คน`],
  ];
  if (data.note) summary.push(["หมายเหตุ", data.note]);

  const dl = document.createElement("dl");
  summary.forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    dl.append(dt, dd);
  });

  // ปุ่มส่งรายละเอียดต่อทาง LINE (เปิดหน้าแชร์ของ LINE ให้ผู้ใช้เลือกแชตเอง)
  const text = `จองโต๊ะ ${SHOP.name}\n` + summary.map(([k, v]) => `${k}: ${v}`).join("\n");
  const share = document.createElement("a");
  share.className = "btn btn-ghost";
  share.href = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
  share.target = "_blank";
  share.rel = "noopener";
  share.textContent = "ส่งรายละเอียดทาง LINE";

  showDialog(
    SHOP.demo ? "ตัวอย่าง: จองสำเร็จ" : "ได้รับการจองแล้ว",
    [
      para(SHOP.demo
        ? "โหมดตัวอย่าง: ข้อมูลนี้ไม่ได้ถูกส่งไปที่ใด ในเว็บจริงร้านจะได้รับรายการนี้ทันที"
        : "ร้านได้รับรายการจองแล้ว จะติดต่อกลับเพื่อยืนยันอีกครั้ง"),
      dl,
    ],
    [share],
  );
}
