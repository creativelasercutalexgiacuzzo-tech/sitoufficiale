# Creative Laser Cut di Alex Giacuzzo – sito vetrina

Sito a pagina unica con galleria filtrabile e modulo contatti collegato a **Brevo**.
È pensato per **GitHub + Render**: ogni volta che carichi una modifica su GitHub, Render aggiorna il sito da solo.

```
├── server.js          server Node (nessuna dipendenza): serve il sito e invia il form a Brevo
├── render.yaml        configurazione automatica di Render
├── package.json
└── public/
    ├── index.html     testi della pagina
    ├── privacy.html   informativa privacy (modello da completare)
    ├── js/config.js   ← NOME, LOGO, TELEFONO, INSTAGRAM, EMAIL (modifica qui)
    ├── js/main.js     galleria, lightbox, invio del form
    ├── css/style.css  colori e stile
    └── img/           foto dei prodotti
        └── logo/      simbolo AG (chiaro/scuro), favicon, icona per iPhone, logo per la firma email
```

---

## 1. Inserisci i dati dell'attività (dal documento di Alex)

1. Apri `public/js/config.js` e compila nome, telefono, Instagram ed email.
2. **Logo**: il simbolo AG è già inserito (`img/logo/ag-mark.svg` per fondi chiari, `ag-mark-chiaro.svg` per fondi scuri).
3. In `public/index.html` cambia `<title>`, `description` e `og:title` con il nome vero: Google legge questi.
4. Se vuoi cambiare i colori per farli combaciare col logo, modifica le variabili in cima a `css/style.css`
   (`--black` = fondi scuri, `--laser` = arancio dei pulsanti, `--ply` = colore compensato, `--cream` = fondo chiaro).
5. Le foto e le didascalie della galleria sono nell'elenco `ITEMS` dentro `js/main.js`:
   aggiungi una riga per ogni nuova foto caricata in `img/`.

## 2. Prova in locale (facoltativo)

```bash
node server.js
# apri http://localhost:3000
```
Senza le variabili di Brevo il form risponde "Modulo non ancora configurato": è normale.

## 3. Carica su GitHub

```bash
git init
git add .
git commit -m "Sito vetrina"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/NOME-REPO.git
git push -u origin main
```
(oppure crea il repository su github.com e trascina i file con "Add file → Upload files").

## 4. Configura Brevo

1. **Mittente verificato**: Brevo → *Senders, Domains & Dedicated IPs* → *Senders* → aggiungi l'email da cui partono i messaggi e confermala.
   Per una migliore consegna conviene autenticare anche il dominio (DKIM/SPF) se l'attività ne ha uno.
2. **Chiave API**: Brevo → *SMTP & API* → *API Keys* → *Generate a new API key*. Copiala subito.
3. *(Facoltativo)* **Lista contatti**: Brevo → *Contacts* → *Lists* → crea una lista e annota il suo **ID** numerico.
   Chi scrive dal sito verrà salvato lì (utile per newsletter, solo con il consenso adeguato).

## 5. Pubblica su Render

1. render.com → **New + → Blueprint** → collega il repository GitHub. Render legge `render.yaml` e crea il servizio.
   (In alternativa: **New + → Web Service**, build `npm install`, start `npm start`.)
2. Nella sezione **Environment** inserisci:

| Variabile          | Valore                                               | Obbligatoria |
|--------------------|------------------------------------------------------|--------------|
| `BREVO_API_KEY`    | la chiave API di Brevo                               | sì           |
| `CONTACT_TO_EMAIL` | dove ricevere le richieste (es. email dell'attività) | sì           |
| `SENDER_EMAIL`     | il mittente verificato su Brevo                      | sì           |
| `SENDER_NAME`      | es. il nome dell'attività                            | no           |
| `BREVO_LIST_ID`    | ID della lista contatti                              | no           |

3. Deploy. Il sito sarà su `https://nome-servizio.onrender.com`.
4. **Dominio personalizzato**: Render → servizio → *Settings → Custom Domains* → aggiungi il dominio e imposta i DNS indicati.

> **Nota sul piano gratuito di Render:** il servizio si "addormenta" dopo 15 minuti senza visite e la prima apertura
> successiva può impiegare 30-50 secondi. Per un'attività conviene il piano *Starter* (sempre attivo).

## Come funziona il form

Il browser invia i dati a `/api/contatto` → il server li controlla (campi obbligatori, consenso privacy,
campo trappola anti-bot, max 5 invii ogni 10 minuti per IP) → Brevo spedisce un'email a `CONTACT_TO_EMAIL`
con **Rispondi** già impostato sull'indirizzo del cliente. La chiave API resta su Render e non compare mai nel codice pubblico.

## Da completare prima di andare online

- [ ] Dati in `config.js` e logo
- [ ] Titolo e descrizione in `index.html`
- [ ] P.IVA nel footer (`piva` in `config.js`), se l'attività ne ha una
- [ ] Completare `privacy.html` (parti evidenziate) e farla verificare
- [ ] Controllare i testi delle FAQ e della sezione "Su misura" con Alex
