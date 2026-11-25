(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var S = window.SITO || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- Dati dell'attività da config.js ----------
  var handle = (S.instagram || "").replace(/^@/, "");
  var telDigits = (S.telefono || "").replace(/[^\d+]/g, "");
  var waDigits = telDigits.replace(/^\+/, "");
  var values = { nome: S.nome, slogan: S.slogan, telefono: S.telefono, email: S.email, zona: S.zona, piva: S.piva, "instagram-handle": handle ? "@" + handle : "" };
  $$("[data-sito]").forEach(function (el) { var v = values[el.getAttribute("data-sito")]; if (v) el.textContent = v; });
  var hrefs = {
    tel: telDigits ? "tel:" + telDigits : null,
    whatsapp: waDigits && S.whatsapp ? "https://wa.me/" + waDigits : null,
    instagram: handle ? "https://www.instagram.com/" + handle + "/" : null,
    mailto: S.email ? "mailto:" + S.email : null
  };
  $$("[data-sito-href]").forEach(function (el) {
    var h = hrefs[el.getAttribute("data-sito-href")];
    if (h) el.href = h; else (el.closest("li") || el).hidden = true;
  });
  $$("[data-sito-show]").forEach(function (el) { if (!S[el.getAttribute("data-sito-show")]) el.hidden = true; });
  if (S.nome && S.nome !== "Creative Laser Cut") document.title = document.title.replace("Creative Laser Cut", S.nome);
  $("#year").textContent = new Date().getFullYear();

  // ---------- Header: trasparente sull'hero, chiaro dopo lo scroll ----------
  var top = $(".top");
  function onScroll() { top.classList.toggle("is-scrolled", window.scrollY > 40); }
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  // ---------- Menu mobile ----------
  var btn = $(".menu-btn"), nav = $("#nav");
  function setMenu(open) { nav.classList.toggle("is-open", open); top.classList.toggle("menu-open", open); btn.setAttribute("aria-expanded", open); btn.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu"); }
  btn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); btn.focus(); } });

  // ---------- Comparsa allo scroll ----------
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$(".reveal").forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  // ---------- Galleria ----------
  // [file in img/ senza .jpg, didascalia, categoria: regali | natale | casa | modellini]
  var ITEMS = [
    ["portabottiglie-50-anni", "Portabottiglie personalizzato «50»", "regali"],
    ["calendario-giorni-a-natale", "Calendario «Giorni a Natale»", "natale"],
    ["torre-eiffel", "Torre Eiffel da montare", "modellini"],
    ["sottobicchieri-sughero-incisi", "Sottobicchieri in sughero incisi", "regali"],
    ["lanterna-natalizia", "Lanterna natalizia intagliata", "natale"],
    ["portabottiglie-bicicletta", "Portabottiglie a bicicletta", "casa"],
    ["portafedi-parigi", "Portafedi «Parigi»", "regali"],
    ["palline-iniziali-personalizzate", "Palline con iniziale personalizzata", "natale"],
    ["orologio-vinile-moto", "Orologio su vinile – moto", "modellini"],
    ["tagliere-ardesia-inciso", "Tagliere in ardesia inciso", "casa"],
    ["cuore-portapenna", "Cuore portapenna", "regali"],
    ["gnomi-natalizi", "Gnomi natalizi", "natale"],
    ["cabina-telefonica-londra", "Cabina telefonica londinese", "modellini"],
    ["omino-pan-di-zenzero", "Omino di pan di zenzero", "natale"],
    ["portatovaglioli-radio-vintage", "Portatovaglioli radio vintage", "casa"],
    ["portapenna-piuma", "Portapenna a piuma", "regali"],
    ["palline-3d-natale", "Palline 3D", "natale"],
    ["orologio-vinile-musica", "Orologio su vinile – musica", "modellini"],
    ["ruota-panoramica-portagioie", "Ruota panoramica portagioie", "casa"],
    ["gnomi-portacandele", "Gnomi portacandele", "natale"],
    ["scritta-love", "Scritta «Love»", "regali"],
    ["modellino-auto-epoca", "Modellino auto d'epoca", "modellini"],
    ["sfere-spirale", "Sfere a spirale", "natale"],
    ["tris-in-legno", "Tris in legno", "casa"],
    ["palline-iniziali-glitter", "Palline con iniziale glitter", "natale"],
    ["corona-decorativa", "Corona decorativa", "modellini"],
    ["muffola-happy-new-year", "Muffola «Happy New Year»", "natale"],
    ["pecora-porta-sottobicchieri", "Pecorella porta sottobicchieri", "casa"],
    ["alberelli-pendenti", "Alberelli da appendere", "natale"],
    ["sfera-spirale-albero", "Sfera a spirale con fiocco di neve", "natale"],
    ["albero-decorativo-bianco", "Albero decorativo", "natale"]
  ];
  var PAGE = 12, shown = PAGE, current = "tutti";
  var gallery = $("#gallery"), more = $("#more");
  function filtered() { return ITEMS.filter(function (it) { return current === "tutti" || it[2] === current; }); }
  function render() {
    var list = filtered();
    gallery.innerHTML = list.slice(0, shown).map(function (it) {
      return '<button class="tile" type="button" data-id="' + it[0] + '">' +
        '<img src="img/' + it[0] + '.jpg" alt="' + it[1] + '" loading="lazy">' +
        '<span class="tile__cap">' + it[1] + "</span></button>";
    }).join("");
    more.hidden = shown >= list.length;
  }
  function applyFilter(cat) {
    current = cat; shown = PAGE;
    $$(".filter").forEach(function (f) { var on = f.dataset.filter === cat; f.classList.toggle("is-active", on); f.setAttribute("aria-pressed", on); });
    render();
  }
  $$(".filter").forEach(function (f) { f.addEventListener("click", function () { applyFilter(f.dataset.filter); }); });
  $$("[data-goto]").forEach(function (a) { a.addEventListener("click", function () { applyFilter(a.dataset.goto); }); });
  more.addEventListener("click", function () { shown += PAGE; render(); });
  render();

  // ---------- Lightbox ----------
  var lb = $("#lightbox"), lbImg = $("img", lb), lbCap = $("figcaption", lb), cur = 0, lastFocus = null;
  function show(i) {
    var list = filtered(); cur = (i + list.length) % list.length;
    lbImg.src = "img/" + list[cur][0] + ".jpg"; lbImg.alt = list[cur][1]; lbCap.textContent = list[cur][1];
  }
  gallery.addEventListener("click", function (e) {
    var t = e.target.closest(".tile"); if (!t) return;
    var list = filtered(), id = t.dataset.id;
    lastFocus = t;
    show(list.findIndex(function (it) { return it[0] === id; }));
    lb.hidden = false; document.body.style.overflow = "hidden"; $(".lightbox__close").focus();
  });
  function close() { lb.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  $(".lightbox__close").addEventListener("click", close);
  $(".lightbox__prev").addEventListener("click", function () { show(cur - 1); });
  $(".lightbox__next").addEventListener("click", function () { show(cur + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });

  // ---------- Form contatti -> /api/contatto -> Brevo ----------
  var form = $("#contact-form"), status = $(".form__status", form);
  var dateInput = form.querySelector("[name=data]");
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form__status";
    if (!form.checkValidity()) {
      status.textContent = "Controlla i campi obbligatori (*).";
      status.classList.add("is-error"); form.reportValidity(); return;
    }
    var fd = new FormData(form), submit = form.querySelector("[type=submit]");
    var payload = {};
    ["nome", "email", "telefono", "occasione", "data", "messaggio", "sito"].forEach(function (k) { payload[k] = fd.get(k) || ""; });
    payload.privacy = form.privacy.checked;
    submit.disabled = true; submit.textContent = "Invio in corso…";
    fetch("/api/contatto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          status.textContent = "Grazie! Abbiamo ricevuto la tua richiesta e ti risponderemo presto.";
          status.classList.add("is-ok");
        } else {
          status.textContent = res.error || "Invio non riuscito, riprova.";
          status.classList.add("is-error");
        }
      })
      .catch(function () {
        status.textContent = "Connessione non riuscita. Riprova o scrivici su WhatsApp.";
        status.classList.add("is-error");
      })
      .finally(function () { submit.disabled = false; submit.textContent = "Invia la richiesta"; });
  });
})();
