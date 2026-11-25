// Server minimale per Render: serve il sito statico e inoltra il form contatti a Brevo.
// Nessuna dipendenza esterna (richiede Node 18+ per fetch nativo).
//
// Variabili d'ambiente da impostare su Render (Dashboard > Environment):
//   BREVO_API_KEY      chiave API Brevo (obbligatoria)  -> Brevo > SMTP & API > API Keys
//   CONTACT_TO_EMAIL   email che riceve le richieste (obbligatoria)
//   SENDER_EMAIL       mittente VERIFICATO su Brevo (obbligatoria) -> Brevo > Senders & IP
//   SENDER_NAME        nome mittente (facoltativo, default "Sito web")
//   BREVO_LIST_ID      id lista Brevo dove salvare il contatto (facoltativo)

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// Limite semplice anti-abuso: max 5 invii ogni 10 minuti per IP
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function readBody(req, limit = 20000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error("too_large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function brevo(endpoint, payload) {
  const r = await fetch(`https://api.brevo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok && r.status !== 204) {
    const text = await r.text();
    const err = new Error(`Brevo ${endpoint} ${r.status}: ${text}`);
    err.status = r.status;
    throw err;
  }
}

async function handleContact(req, res) {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (rateLimited(ip)) return json(res, 429, { ok: false, error: "Troppi invii, riprova tra qualche minuto." });

  let data;
  try {
    data = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { ok: false, error: "Richiesta non valida." });
  }

  // Honeypot: i bot compilano il campo nascosto "sito"
  if (data.sito) return json(res, 200, { ok: true });

  const nome = String(data.nome || "").trim().slice(0, 100);
  const email = String(data.email || "").trim().slice(0, 150);
  const telefono = String(data.telefono || "").trim().slice(0, 40);
  const occasione = String(data.occasione || "").trim().slice(0, 80);
  const dataRichiesta = String(data.data || "").trim().slice(0, 20);
  const messaggio = String(data.messaggio || "").trim().slice(0, 4000);
  const privacy = data.privacy === true;

  if (!nome || !messaggio || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { ok: false, error: "Compila nome, email valida e messaggio." });
  }
  if (!privacy) return json(res, 400, { ok: false, error: "Serve il consenso al trattamento dei dati." });

  const { BREVO_API_KEY, CONTACT_TO_EMAIL, SENDER_EMAIL } = process.env;
  if (!BREVO_API_KEY || !CONTACT_TO_EMAIL || !SENDER_EMAIL) {
    console.error("Configurazione Brevo mancante: imposta BREVO_API_KEY, CONTACT_TO_EMAIL, SENDER_EMAIL");
    return json(res, 500, { ok: false, error: "Modulo non ancora configurato. Contattaci per telefono o Instagram." });
  }

  try {
    await brevo("smtp/email", {
      sender: { email: SENDER_EMAIL, name: process.env.SENDER_NAME || "Sito web" },
      to: [{ email: CONTACT_TO_EMAIL }],
      replyTo: { email, name: nome },
      subject: `Nuova richiesta dal sito – ${nome}${occasione ? " (" + occasione + ")" : ""}`,
      htmlContent: `
        <h2>Nuova richiesta di contatto</h2>
        <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telefono:</strong> ${escapeHtml(telefono || "—")}</p>
        <p><strong>Occasione:</strong> ${escapeHtml(occasione || "—")}</p>
        <p><strong>Serve entro:</strong> ${escapeHtml(dataRichiesta || "—")}</p>
        <p><strong>Messaggio:</strong><br>${escapeHtml(messaggio).replace(/\n/g, "<br>")}</p>`,
    });

    // Facoltativo: salva il contatto in una lista Brevo
    const listId = parseInt(process.env.BREVO_LIST_ID, 10);
    if (listId) {
      // Gli account Brevo italiani usano l'attributo NOME, quelli inglesi FIRSTNAME:
      // se l'attributo non esiste si riprova salvando solo email + lista.
      const base = { email, listIds: [listId], updateEnabled: true };
      try {
        await brevo("contacts", { ...base, attributes: { NOME: nome, FIRSTNAME: nome } });
      } catch (e) {
        try {
          await brevo("contacts", base);
        } catch (e2) {
          console.warn("Contatto non salvato in lista:", e2.message);
        }
      }
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("Invio Brevo fallito:", e.message);
    return json(res, 502, { ok: false, error: "Invio non riuscito. Riprova o contattaci per telefono." });
  }
}

// Pagina di controllo: dice SOLO se le variabili ci sono e se Brevo accetta la chiave (mai i valori).
let lastStatus = { at: 0, body: null };
async function handleStatus(req, res) {
  if (Date.now() - lastStatus.at < 60000 && lastStatus.body) return json(res, 200, lastStatus.body);
  const body = {
    BREVO_API_KEY: Boolean(process.env.BREVO_API_KEY),
    CONTACT_TO_EMAIL: Boolean(process.env.CONTACT_TO_EMAIL),
    SENDER_EMAIL: Boolean(process.env.SENDER_EMAIL),
    brevo: "non verificato",
  };
  if (body.BREVO_API_KEY) {
    try {
      const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": process.env.BREVO_API_KEY, Accept: "application/json" } });
      const t = await r.text();
      if (r.ok) body.brevo = "chiave valida";
      else if (/ip/i.test(t) && r.status === 401) body.brevo = "BLOCCATO: Brevo non riconosce l'indirizzo IP di Render (disattiva il blocco IP in Brevo > Security > Authorised IPs)";
      else if (r.status === 401) body.brevo = "chiave API non valida o disattivata";
      else body.brevo = `errore Brevo ${r.status}`;
    } catch (e) {
      body.brevo = "Brevo non raggiungibile";
    }
    try {
      const r = await fetch("https://api.brevo.com/v3/senders", { headers: { "api-key": process.env.BREVO_API_KEY, Accept: "application/json" } });
      if (r.ok && process.env.SENDER_EMAIL) {
        const data = await r.json();
        const s = (data.senders || []).find((x) => String(x.email).toLowerCase() === process.env.SENDER_EMAIL.toLowerCase());
        body.mittente = !s ? "SENDER_EMAIL non presente tra i mittenti Brevo" : s.active ? "mittente verificato" : "mittente presente ma NON verificato (conferma l'email ricevuta da Brevo)";
      }
    } catch (e) { /* facoltativo */ }
  }
  lastStatus = { at: Date.now(), body };
  return json(res, 200, body);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return fs.createReadStream(path.join(PUBLIC_DIR, "404.html")).on("error", () => res.end("Pagina non trovata")).pipe(res);
    }
    const ext = path.extname(filePath).toLowerCase();
    const cache = [".jpg", ".jpeg", ".png", ".webp", ".svg"].includes(ext) ? "public, max-age=604800" : "no-cache";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache });
    fs.createReadStream(filePath).pipe(res);
  });
}

http
  .createServer((req, res) => {
    if (req.url === "/api/contatto" && req.method === "POST") return handleContact(req, res);
    if (req.url === "/healthz") return json(res, 200, { ok: true });
    if (req.url === "/api/stato") return handleStatus(req, res);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      return res.end();
    }
    serveStatic(req, res);
  })
  .listen(PORT, () => console.log(`Sito online sulla porta ${PORT}`));
