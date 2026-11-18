# Credits and third-party licenses / Crediti e licenze di terze parti

Elementa's own code is MIT-licensed (`LICENSE`) and its own texts are CC BY 4.0 (`LICENSE-CONTENT.md`).
Everything listed here belongs to other people and keeps **its own license**: Elementa does not relicense it.

Il codice di Elementa è MIT (`LICENSE`) e i suoi testi sono CC BY 4.0 (`LICENSE-CONTENT.md`).
Tutto ciò che è elencato qui appartiene ad altri e mantiene **la propria licenza**: Elementa non la cambia.

---

## 1. Photos of the elements / Foto degli elementi (`img/`)

**The complete list, file by file, with author, license and source page, is in [`img/CREDITS.md`](img/CREDITS.md).**
**L'elenco completo, file per file, con autore, licenza e pagina di provenienza, è in [`img/CREDITS.md`](img/CREDITS.md).**

### Main source / Fonte principale

**Chemical Elements – A Virtual Museum**, by **Jumk.de Webprojects** — https://images-of-elements.com

The site states: *«The images are licensed under a Creative Commons Attribution 3.0 Unported License, unless otherwise noted. Attribution by linking to the according element page.»*
License: [CC BY 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).

How Elementa complies / Come Elementa rispetta la licenza:
- every photo shown in the app has a caption with the author and a **link to the element page** on images-of-elements.com, plus a link to the license, as the site requests;
- `img/CREDITS.md` repeats author, license and source for every file;
- changes made: images resized and re-encoded as JPEG. No other edits.

### Exceptions inside that collection / Eccezioni dentro quella raccolta

Some images on images-of-elements.com come from other authors ("unless otherwise noted"). For these files the license is the one stated by the source page:

| File | Author / Autore | License / Licenza |
|---|---|---|
| `43.jpg` technetium | stated as public domain on the source page | Public domain |
| `92.jpg` uranium | public domain (U.S. government photo) | Public domain |
| `93.jpg` neptunium | Los Alamos National Laboratory | Public domain |
| `94.jpg` plutonium | U.S. Department of Energy | Public domain |
| `95.jpg` americium | Bionerd | CC BY 3.0 |
| `99.jpg`, `100.jpg` Ivy Mike explosion | U.S. Department of Energy | Public domain |

`97.jpg` (berkelium) and `98.jpg` (californium): the source pages credit U.S. government laboratories (public domain). Since the file may be an older image of the site itself, it is credited, to be safe, to images-of-elements.com under CC BY 3.0.

### Other source / Altra fonte

| File | Author / Autore | License / Licenza | Source / Fonte |
|---|---|---|---|
| `55.jpg` caesium | Dnn87 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | https://commons.wikimedia.org/wiki/File:Cesium.jpg |

`55.jpg` is the only **ShareAlike** file: if you modify *that image*, you must share your version under CC BY-SA 3.0. It does not affect the rest of the project.
`55.jpg` è l'unico file **ShareAlike**: chi modifica *quella foto* deve condividerla con licenza CC BY-SA 3.0. Non riguarda il resto del progetto.

### Images deliberately NOT included / Immagini escluse di proposito

These elements have a photo on images-of-elements.com, but it is **not freely licensed** or its source could not be verified, so Elementa shows a placeholder instead:

| Element | Reason / Motivo |
|---|---|
| 88 radium, 89 actinium | source of the image could not be verified / provenienza non verificabile |
| 90 thorium | © Theodore Gray, periodictable.com |
| 91 protactinium, 96 curium | © European Union, JRC-ITU |
| 104 rutherfordium | © CERN |
| 105–118 | no real photo exists / non esiste una foto reale |

### How the files were obtained / Come sono stati ottenuti i file

The thumbnails were collected through the open-source project [matterviz](https://github.com/janosh/matterviz) by Janosh Riebesell, which mirrors the images of images-of-elements.com (`/s/<element>.jpg`) and of Wikimedia Commons. Its copies were converted back to JPEG for Elementa.

---

## 2. Data / Dati (`elements.json`)

Physical and chemical properties, electron configurations and isotope data (half-lives, decay modes, abundances) were extracted with the Python library **mendeleev** by Łukasz Mentel — https://github.com/lmmentel/mendeleev — **MIT License**.
mendeleev collects data from IUPAC, NIST, the CRC Handbook of Chemistry and Physics and the NUBASE nuclear evaluation; see its documentation for the original references.

Proprietà fisiche e chimiche, configurazioni elettroniche e dati sugli isotopi sono estratti con la libreria Python **mendeleev** (licenza MIT), che raccoglie dati IUPAC, NIST, CRC Handbook e NUBASE.

## 3. Fonts / Caratteri

**Inter** (Rasmus Andersson) and **JetBrains Mono** (JetBrains), loaded from Google Fonts — [SIL Open Font License 1.1](https://openfontlicense.org).

## 4. Emoji

The icons in «Lo trovi in… / You can find it in…» are Unicode emoji drawn by the visitor's own operating system: no emoji image is distributed with Elementa.
