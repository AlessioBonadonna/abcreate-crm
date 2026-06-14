# AB Create CRM

Mini-CRM di outreach per freelance: **trova lead locali → analizza i loro siti → genera messaggi → traccia i contatti e i follow-up**, tutto in un'unica app che gira in locale.

Ricostruzione della v1 (`local-lead-finder`, Python/FastAPI) nello stack Nuxt/TypeScript, con i 4 limiti della v1 risolti: dati migliori e pluggabili, persistenza completa, messaggi value-first con prezzi reali, architettura a componenti.

## Stack

- **Nuxt 4** + **TypeScript strict**, Vue 3 `<script setup>`
- **Nitro** server routes (`server/api/…`) — niente backend separato
- **Prisma** + **SQLite** (`prisma/dev.db`) per la persistenza
- **Tailwind CSS**
- `exceljs` (export XLSX), `cheerio` (analisi siti), `zod` (validazione API)
- Nessuna autenticazione (uso personale, gira in locale)

## Setup

Richiede **Node 20+**.

```bash
# 1. dipendenze
yarn install

# 2. configura l'ambiente
cp .env.example .env        # DATABASE_URL già pronto; Google Places opzionale

# 3. crea il database + il client Prisma (prima volta)
yarn db:init                # prisma migrate dev --name init

# 4. dati iniziali (categorie, template, impostazioni con i prezzi reali)
yarn db:seed

# 5. avvia
yarn dev                    # http://localhost:3000
```

Comandi utili: `yarn db:studio` (GUI del DB), `yarn db:migrate` (nuove migrazioni), `yarn typecheck`.

> **Nota Prisma:** al primo `yarn install` / `db:init`, Prisma scarica i suoi engine nativi da `binaries.prisma.sh`. Serve connessione a internet la prima volta (sul tuo Mac è automatico).

## Architettura dati — provider pluggabili

La discovery non dipende da una sola fonte. C'è un'interfaccia `LeadProvider` (`server/services/providers/types.ts`) con due implementazioni intercambiabili:

- **`OsmProvider`** (default, gratis) — Overpass API + Nominatim per il geocoding delle città. Query per tag OSM, estrazione nome/indirizzo/sito/email/telefono/orari/coordinate, esclusione catene. **Sempre attivo, nessuna chiave.**
- **`GooglePlacesProvider`** (opzionale) — Places API (Text Search + Place Details) per arricchire i lead con telefono, sito, rating e recensioni. Attivo **solo** se `GOOGLE_PLACES_API_KEY` è presente in `.env`; altrimenti l'app funziona comunque con il solo OSM.

**Enrichment:** quando Places è attivo, i lead OSM senza telefono/sito possono essere completati via Places (match per nome + città). Il campo `enrichedVia` registra la fonte dell'arricchimento.

**Rate limiting:** delay configurabile tra le chiamate esterne (`providerDelayMs` nelle impostazioni, default 1100 ms), rispettato da ogni provider.

### Costo Google Places

Google Places offre **~200 $/mese di credito gratuito**, più che sufficiente per un uso freelance (migliaia di ricerche/mese). È **opzionale**: senza chiave l'app gira benissimo solo con OpenStreetMap, che è gratis e illimitato. Se hai una chiave gratuita, tanto vale attivarla per avere telefoni e siti più completi.

## Scoring (0-10) — portato dalla v1

| Caso | Punteggio |
|---|---|
| Sito mancante | 9 |
| Sito non raggiungibile | 8 |
| Sito presente (base) | 2 + segnali |

Segnali additivi (cap a 10): `+2` HTTP≥400 · `+1` no HTTPS · `+1` title assente · `+1` meta assente · `+2` no WhatsApp · `+2` no form · `+1` no Google Maps · `+1` no pagina contatti · `+1` testo <800 char · `+1` no email/tel sul sito.

Priorità: **HIGH ≥7** · **MEDIUM 4-6** · **LOW ≤3**.

## Messaggi

Generati in due canali (**WhatsApp/DM** più corto e informale; **Email** con oggetto), **value-first**: aprono col problema/valore per quel settore, il prezzo arriva dopo in modo soft.

Prezzi reali AB Create (corretti rispetto alla v1): **Landing €400 · Sito vetrina €700 · Gestionale €800+**, consegna **2 settimane**. Sender configurabile (default "AB Create"). Portfolio citato: abcreate.it, spaziopresente.it, progettoservizilivorno.it. I template sono modificabili (tabella `MessageTemplate`).

> L'invio è **sempre manuale**: l'app genera e copia i messaggi, non li invia mai automaticamente.

## Etica & uso responsabile (dalla v1)

- **Nessun invio automatico** di email/WhatsApp — solo generazione e copia.
- **Rate limiting** su tutte le API esterne.
- I dati provengono da fonti pubbliche (OSM, Places) ma **vanno verificati a mano prima del contatto**: un'attività potrebbe aver chiuso o cambiato recapiti. Tratta i contatti nel rispetto del GDPR.
- **Nessuno scraping** di Google Maps via HTML — solo API ufficiali o OSM.

## Struttura

```
server/
  services/        logica di dominio
    providers/     LeadProvider: osm.ts, places.ts, types.ts, index.ts
    analyzer.ts    analisi sito (cheerio)
    scoring.ts     opportunity score 0-10
    messaging.ts   generazione messaggi multi-canale
    dedup.ts       chiave di dedup persistente
    searchRunner.ts orchestrazione discovery→dedup→persist→analyze
    settings.ts
  api/             endpoint Nitro sottili
shared/            tipi + costanti condivisi app/server
app/               pagine, componenti, composable Vue
prisma/            schema.prisma + seed.ts
scripts/verify.ts  test offline della logica di dominio
```

### Stato per milestone — tutte completate

- ✅ **M1** scaffold + schema + migrazione + seed
- ✅ **M2** `OsmProvider` + dedup persistente + ricerca asincrona con progress
- ✅ **M3** analyzer + scoring + segmentazione + messaggi (prezzi corretti)
- ✅ **M4** lista lead (filtri/ordinamento/paginazione/azioni rapide) + dettaglio (messaggi editabili multi-canale, canale, note, follow-up, storico attività)
- ✅ **M5** dashboard (contatori pipeline, follow-up oggi, conversione) + vista Kanban con drag &amp; drop + export XLSX (`exceljs`) e CSV dei lead filtrati
- ✅ **M6** `GooglePlacesProvider` opzionale + enrichment dei lead OSM senza telefono/sito (`enrichedVia`)
- ✅ **M7** pagina Template messaggi (CRUD) + pagina Impostazioni (sender, prezzi, portfolio, delay, Places on/off)

## Verifica della logica

```bash
yarn tsx --tsconfig ./tsconfig.verify.json scripts/verify.ts
```

Esegue offline i test di scoring, dedup, messaggi, query Overpass e parsing del sito (23 assert).
