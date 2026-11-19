/* Elementa — «Learn more»: links for every element and the bridge to Strata (the geologic time scale)
   Texts: CC BY 4.0, © 2026 Simone Pompei (see LICENSE-CONTENT.md) */
'use strict';
const FURTHER = (() => {
  // Italian Wikipedia titles that need «(elemento chimico)»: the plain name is a different page (checked by hand)
  const IT_DISAMBIG = new Set([20, 31, 46, 50, 80, 88]);   // Calcio, Gallio, Palladio, Stagno, Mercurio, Radio
  const EN_TITLE = { 80: 'Mercury_(element)' };
  const STRATA = 'https://simmonsstummer.github.io/strata/';
  // elements that tell a story in Earth's history, with the Strata card to open
  const GEO = {
    u: ['zircon', "L'uranio-238 decade in piombo-206 in 4,47 miliardi di anni (tempo di dimezzamento): misurando quanto piombo si è accumulato nei cristalli di zircone si datano le rocce più antiche della Terra.", 'Uranium-238 decays into lead-206 with a half-life of 4.47 billion years: measuring how much lead has built up in zircon crystals dates the oldest rocks on Earth.'],
    pb: ['earth', "Nel 1956 Clair Patterson misurò gli isotopi del piombo nei meteoriti e ottenne per la prima volta l'età della Terra: circa 4,55 miliardi di anni.", 'In 1956 Clair Patterson measured lead isotopes in meteorites and obtained the age of Earth for the first time: about 4.55 billion years.'],
    zr: ['zircon', "Lo zircone è quasi indistruttibile e intrappola uranio ma non piombo: per questo è l'orologio preferito dai geologi. Il cristallo più antico, delle Jack Hills, ha 4,4 miliardi di anni.", 'Zircon is almost indestructible and traps uranium but not lead: that is why it is geologists\' favourite clock. The oldest crystal, from the Jack Hills, is 4.4 billion years old.'],
    ir: ['chicxulub', "Un sottile strato d'argilla troppo ricco di iridio, trovato a Gubbio nel 1980, rivelò l'impatto dell'asteroide che 66 milioni di anni fa causò l'estinzione dei dinosauri non aviani.", 'A thin clay layer far too rich in iridium, found at Gubbio in 1980, revealed the asteroid impact that wiped out the non-avian dinosaurs 66 million years ago.'],
    fe: ['oxygen', "Le formazioni di ferro a bande registrano l'arrivo dell'ossigeno nei mari e nell'aria, oltre 2,4 miliardi di anni fa; i minerali di ferro magnetici delle rocce conservano anche le inversioni del campo magnetico.", 'Banded iron formations record the arrival of oxygen in the seas and in the air, over 2.4 billion years ago; magnetic iron minerals in rocks also keep a record of magnetic field reversals.'],
    o: ['oxygen', "L'ossigeno si accumula nell'atmosfera con la Grande Ossidazione; e il rapporto tra i suoi isotopi nei gusci fossili è un termometro del clima del passato.", 'Oxygen builds up in the atmosphere with the Great Oxidation; and the ratio of its isotopes in fossil shells is a thermometer of past climates.'],
    c: ['petm', "Gli isotopi del carbonio nelle rocce registrano le grandi crisi del ciclo del carbonio, come il riscaldamento improvviso di 56 milioni di anni fa; il carbone viene dalle foreste del Carbonifero.", 'Carbon isotopes in rocks record the great upheavals of the carbon cycle, such as the sudden warming 56 million years ago; coal comes from the forests of the Carboniferous.'],
    ca: ['triassic', "Calcari e dolomie, fatti di carbonato di calcio, formano le Dolomiti e gran parte delle montagne italiane: sono scogliere e fondali di mari antichi.", 'Limestones and dolostones, made of calcium carbonate, form the Dolomites and most of Italy\'s mountains: they are ancient reefs and sea floors.'],
    mg: ['ligurian-ocean', "Il magnesio è nella dolomite delle Dolomiti e nelle serpentiniti delle ofioliti, i resti dell'antico oceano ligure-piemontese che oggi formano il Monviso.", 'Magnesium is in the dolomite of the Dolomites and in the serpentinites of ophiolites, the remains of the ancient Ligurian-Piedmont ocean that now form Monviso.'],
    na: ['messinian', "Circa 6 milioni di anni fa il Mediterraneo si prosciugò e lasciò sul fondo strati di sale (cloruro di sodio) spessi fino a chilometri.", 'About 6 million years ago the Mediterranean dried out, leaving layers of salt (sodium chloride) up to kilometres thick on its floor.'],
    cl: ['messinian', "Il cloro del salgemma racconta la crisi di salinità del Messiniano, quando il Mediterraneo evaporò.", 'The chlorine in rock salt tells the story of the Messinian salinity crisis, when the Mediterranean evaporated.'],
    s: ['messinian', "Lo zolfo è nel gesso (solfato di calcio) che il Mediterraneo prosciugato lasciò in Sicilia e in Romagna, e da cui un tempo si estraeva lo zolfo siciliano.", 'Sulfur is in the gypsum (calcium sulfate) the dried-out Mediterranean left in Sicily and Romagna, from which Sicilian sulfur was once mined.'],
    k: ['reversal', "Il decadimento del potassio-40 in argon-40 serve a datare le lave: così è stata costruita la scala delle inversioni del campo magnetico terrestre.", 'The decay of potassium-40 into argon-40 is used to date lavas: that is how the timescale of Earth\'s magnetic reversals was built.'],
    ar: ['reversal', "L'argon-40 nato dal potassio-40 resta intrappolato nei minerali delle lave: misurarlo dice quando la lava si è raffreddata.", 'Argon-40 made by potassium-40 stays trapped in lava minerals: measuring it tells when the lava cooled.'],
  };
  const L = o => o[App.lang] ?? o.en;
  function html(e) {
    const T = { it: e.tx.it.n, en: e.tx.en.n };
    const itTitle = T.it.replace(/ /g, '_') + (IT_DISAMBIG.has(e.z) ? '_(elemento_chimico)' : '');
    const enTitle = EN_TITLE[e.z] || T.en.replace(/ /g, '_');
    const wiki = { it: `https://it.wikipedia.org/wiki/${encodeURIComponent(itTitle)}`, en: `https://en.wikipedia.org/wiki/${encodeURIComponent(enTitle)}` };
    const other = App.lang === 'it' ? 'en' : 'it', low = T.en.toLowerCase();
    const links = [
      [`Wikipedia (${App.lang.toUpperCase()})`, wiki[App.lang]],
      [`Wikipedia (${other.toUpperCase()})`, wiki[other]],
      ['Royal Society of Chemistry · Periodic Table', `https://periodic-table.rsc.org/element/${e.z}/${low}`],
      ['PubChem (NIH)', `https://pubchem.ncbi.nlm.nih.gov/element/${e.z}`],
      [t('more.gray'), `https://theodoregray.com/PeriodicTable/Elements/${String(e.z).padStart(3, '0')}`],
      ['Periodic Videos (University of Nottingham, YouTube)', 'https://www.youtube.com/@periodicvideos'],
    ];
    let h = `<div class="card"><h3>📚 ${t('more.title')}</h3><ul class="more">${links.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul></div>`;
    const g = GEO[e.s.toLowerCase()];
    if (g) h += `<div class="card strata"><h3>🪨 ${t('more.earth')}</h3><p>${esc(App.lang === 'it' ? g[1] : g[2])}</p>
      <p style="margin-top:8px"><a href="${STRATA}#${g[0]}" target="_blank" rel="noopener">${t('more.strata')} →</a></p></div>`;
    return h;
  }
  return { html, STRATA };
})();
