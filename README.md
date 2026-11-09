# GramSetu AI

A static English and Telugu government-scheme assistant. The homepage offers text chat, suggested questions, optional browser voice, and links to official scheme details.

## Run on Windows

Extract the ZIP and open PowerShell in the folder containing `package.json`. Python serves the static files for local development.

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory public
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Use Ctrl+C to stop the preview. The website has no production runtime dependencies.

Run the automated checks with Node.js 20 or later.

```powershell
npm.cmd test
```

## Deploy to Vercel

Run the following from the extracted project folder. During `link`, select the existing GramSetu Vercel project if you want to update its deployment. The included configuration serves `public/` directly, with the build and install commands skipped.

```powershell
npx.cmd vercel login
npx.cmd vercel link
npx.cmd vercel deploy
```

After reviewing the preview deployment, publish it to the selected project's production domain.

```powershell
npx.cmd vercel deploy --prod
```

For another static host, publish the contents of `public/`. Hash routes work without server rewrites. Use HTTPS for browser voice features on a hosted site. [Vercel CLI deployment documentation](https://vercel.com/docs/projects/deploy-from-cli)

## Architecture and migration

The baseline was the available `GramSetu_AI_Implementation` copy. The separately supplied `gramsetu.zip` could not be opened in the working environment.

| Area | Change |
| --- | --- |
| `public/index.html` and `styles.css` | Kept the GramSetu identity, navigation shell, visual palette, cards, and accessible dialog structure. Adapted them for a chat-first interface. |
| `public/app.js` and `i18n.js` | Replaced account- and API-driven views with chat, browse, categories, saved schemes, about, and bilingual detail views. |
| `public/data/` | Replaced legacy records with a structured bilingual catalogue and per-record official links. |
| `public/assistant.js` | Normalises English and Telugu queries, matches names, aliases, categories and intents, and keeps context for the current page session. |
| `public/voice.js` | Uses browser speech recognition with on-device language support and reads replies with an available matching voice. |
| `api/`, `server/`, legacy scripts and tests | Removed the Node application server, API routes, MongoDB connector, account registration and verification, password resets, admin tools, notification workers, Resend delivery code and related secrets and deployment settings. The inspected baseline used MongoDB. The static package contains no database or email integration. |

Chat messages remain in page memory. Browser storage holds the language and saved scheme IDs. The assistant answers from the catalogue and points to official channels when details depend on the applicant, location or application window. Voice transcription is editable before sending. Recording stays on-device when the browser provides that capability. Text chat is available when the browser lacks on-device recognition or a Telugu language pack.

## Catalogue

The 27 records include 20 requested central entries and seven records relevant to Andhra Pradesh. Six of the Andhra Pradesh entries are state programmes or services. The rural employment entry describes central legislation as implemented locally.

| Topic | Entries |
| --- | --- |
| Agriculture | PM-KISAN, Pradhan Mantri Fasal Bima Yojana, Kisan Credit Card, Pradhan Mantri Krishi Sinchayee Yojana |
| Education | National Scholarship Portal, PM-USP Central Sector Scholarship, AICTE Pragati, AICTE Saksham |
| Health | Ayushman Bharat PM-JAY, Pradhan Mantri Surakshit Matritva Abhiyan |
| Women and child welfare | Pradhan Mantri Ujjwala Yojana, Sukanya Samriddhi Yojana, Mission Shakti |
| Housing and basic needs | PMAY–Gramin, PMAY–Urban 2.0, Jal Jeevan Mission |
| Enterprise and skills | Pradhan Mantri Mudra Yojana, PM Vishwakarma, PM SVANidhi, Pradhan Mantri Kaushal Vikas Yojana |
| Andhra Pradesh | Annadatha Sukhibhava – PM-KISAN, Talliki Vandanam, Deepam 2.0, NTR Bharosa Pension, APSHCL housing assistance, Dr. NTR Vaidya Seva, rural employment under VB–G RAM G |

Official sources and source review dates are visible in each scheme detail. They include the relevant central ministry and scheme portals, National Scholarship Portal, myScheme, Press Information Bureau, and Andhra Pradesh department, budget and district pages. Online, beneficiary-status, and in-person routes have separate labels. Seasonal or local access depends on official notices.

## Verification

The automated suite covers dependency-free packaging, asset and import resolution, bilingual fields for all 27 entries, HTTPS link structure, all sample questions, Telugu follow-ups, typo recovery, ambiguity, regional and category filters, sensitive-number handling, and voice support and failure paths using simulated browser APIs.

Official pages were reviewed on 9 November 2026. Some government endpoints returned access or timeout errors during independent checks, so live availability can vary. The development environment blocked local preview access, leaving visual browser QA and hardware audio tests outstanding. The table below gives a short smoke test for the deployed preview.

| Check | Expected result |
| --- | --- |
| Ask how to apply for PM-KISAN, then ask “దీనికి ఏ పత్రాలు కావాలి?” | The first reply gives application steps. The follow-up lists PM-KISAN documents in Telugu. |
| Filter Explore to Andhra Pradesh and browse an entry | Seven regional records appear with no other filter. Details show coverage, eligibility, documents, steps and official sources. |
| Save an entry, reload and open Saved schemes | The entry remains available on the same browser. |
| Open a detail link directly, change detail language, and close it | The URL opens the scheme. Detail sections switch together and Close returns to the prior page or chat. |
| Try voice input and read-aloud | An available on-device recognition pack produces editable input. Unsupported voice shows a text fallback. Read-aloud uses a matching voice when installed. |
| Open the site at phone and desktop widths | The chat composer, navigation, cards and modal fit the viewport and remain usable with the keyboard. |
