# Kellokalle 🏃‍♂️⏱️

**Kellokalle** on **Kallen (Claude Code)** koodaama!!) suunnistuskilpailujen lähtökellosovellus, joka on toteutettu PWA-tekniikoilla. Sovellus näyttää seuraavat lähtijät, heidän kilpailutietonsa ja hoitaa lähtölaskennan äänimerkeillä ja nimien lukemisella.

## Ominaisuudet

- **IOF 3 XML tuki**: Lukee lähtölistat IOF 3 formaatin mukaisista XML-tiedostoista
  - Kilpailunumero (BibNumber)
  - Kilpailukortti (ControlCard)
  - Lähtöpaikka (StartName) - esim. "Start 1", "Start 2"
- **Lähtöpaikan valinta**: Mahdollisuus valita tietty lähtöpaikka ja näyttää vain sen lähtijät
- **Lähtölaskenta**: Automaattinen lähtölaskenta visuaalisella countdownilla
- **Äänimerkit**: Viisi lyhyttä piippausta (sekunnin välein) + yksi pitkä piippaus lähdön hetkellä (Web Audio API)
  - Safari/iOS yhteensopivuus: Äänet aktivoidaan käyttäjän painamalla nappia
- **Nimien lukeminen**: Lukee ääneen **seuraavien** lähtijöiden nimet 5 sekuntia lähdön jälkeen (Web Speech API)
  - Safari/iOS yhteensopivuus: Toimii iPadilla äänen aktivoinnin jälkeen
- **Isot fontit**: Näyttö optimoitu tabletille lähtöviivalla - kilpailijoiden nimet, sarjat ja kilpailukortit näkyvät selkeästi
- **Simulaatiotila**: Virtuaalikello joka alkaa automaattisesti 1 minuutti ennen ensimmäistä lähtöä (testaus & esittelyt)
  - Kellon nopeutuspainikkeet: +10s, +30s, +1min
  - Selkeä visuaalinen merkintä simulaatiotilasta
- **Offline-tuki**: Lähtölista tallennetaan paikallisesti (Web Storage API) ja sovellus toimii ilman verkkoyhteyttä
- **PWA**: Asennetavissa kotinäytölle ja toimii täysinäytössä
- **Automaattinen käynnistys**: Käynnistyy automaattisesti viimeisimpään lähtölistaan

## Teknologiat

- **Vite**: Nopea build-työkalu
- **TypeScript**: Tyypitetty JavaScript
- **React**: Käyttöliittymäkirjasto
- **Web Audio API**: Äänimerkit
- **Web Speech API**: Nimien lukeminen
- **Web Storage API**: Paikallinen tallennus
- **PWA**: Progressive Web App -tuki

## Käyttö

### Kehitysympäristö

```bash
npm install
npm run dev
```

Sovellus käynnistyy osoitteessa http://localhost:5173

### Tuotantoversio

```bash
npm run build
npm run preview
```

### Testit

Sovelluksessa on Playwright-testit jotka varmistavat toiminnallisuuden:

```bash
# Aja testit headless-tilassa
npm test

# Aja testit UI-tilassa
npm run test:ui

# Aja testit näkyvällä selaimella
npm run test:headed
```

Testit kattavat:
- Sovelluksen käynnistymisen
- Konfigurointinäkymän toiminnot
- Lähtölistan latauksen
- Lähtökellonäkymän näyttämisen
- Navigoinnin näkymien välillä
- Paikallisen tallennuksen ja välimuistin
- Simulaatiotilan toiminnallisuuden
  - Valintaruudun toiminnan
  - SIMULAATIO-merkin näyttämisen
  - Kellon nopeutuspainikkeiden toiminnan
  - Normaalin ja simulaatiotilan erot

### Sovelluksen käyttö

1. **Konfigurointi**:
   - Anna IOF 3 XML-tiedoston URL (esim. tulospalvelu.fi)
   - Valitse haluatko käyttää simulaatiotilaa (oletuksena päällä)
   - Tai käytä esimerkkitiedostoa painamalla "Käytä esimerkkiä"
   - Lähtölista ladataan ja tallennetaan paikallisesti
   - Jos kilpailussa on useita lähtöpaikkoja, valitse haluamasi lähtöpaikka pudotusvalikosta (oletuksena näytetään kaikki lähdöt)

2. **Lähtökello**:
   - **Safari/iOS**: Aktivoi äänet klikkaamalla "🔊 Aktivoi äänet" -nappia ensimmäisellä kerralla
   - Sovellus näyttää seuraavat lähtijät ja ajan lähtöön
   - 5 sekuntia ennen lähtöä alkaa äänimerkit (5 lyhyttä + 1 pitkä piippi)
   - 5 sekuntia lähdön jälkeen sovellus lukee seuraavien lähtijöiden nimet
   - Countdown näkyy värillisesti: vihreä (>30s), oranssi (>5s), punainen (≤5s)
   - Simulaatiotilassa: Käytä +10s, +30s tai +1min -nappeja kellon nopeuttamiseen

3. **Asetukset**:
   - Paina "⚙️ Asetukset" -nappia palataksesi konfigurointinäkymään
   - Voit vaihtaa lähtölistaa milloin tahansa

## IOF 3 XML -tiedostot

Sovellus tukee IOF 3 formaatin mukaisia lähtölistatiedostoja. Esimerkkilähde:
- https://online.tulospalvelu.fi/tulokset-new/en/

XML-tiedoston tulee sisältää:
- `<Event>` - Kilpailutiedot
- `<ClassStart>` - Sarjojen lähdöt
- `<PersonStart>` - Kilpailijoiden tiedot (nimi, seura, kilpailukortti, lähtöaika)

## PWA -ominaisuudet

Sovellus on PWA (Progressive Web App), joten se:
- Toimii offline-tilassa
- On asennetavissa kotinäytölle (mobiili & tablet)
- Toimii täysinäytössä landscape-tilassa (optimoitu tabletille)
- Tallentaa lähtölistan paikallisesti selaimeen
- Käynnistyy automaattisesti viimeisimpään lähtölistaan

## Tiedostorakenne

```
src/
├── components/
│   ├── ConfigView.tsx      # Konfigurointinäkymä (simulaatiotilan valinta)
│   └── StartClockView.tsx  # Lähtökellonäkymä (virtuaalikellon näyttö)
├── utils/
│   ├── xmlParser.ts        # IOF 3 XML parseri
│   ├── audioService.ts     # Web Audio API palvelu
│   ├── speechService.ts    # Web Speech API palvelu
│   ├── virtualClock.ts     # Virtuaalikellon hallinta (simulaatio)
│   └── storage.ts          # Web Storage API palvelu
├── types.ts                # TypeScript tyypit
├── App.tsx                 # Pääkomponentti
├── main.tsx               # Sovelluksen käynnistys
└── index.css              # Globaalit tyylit

public/
├── manifest.json          # PWA manifest
└── sw.js                  # Service Worker
```

## Lisenssi

GPL
