/*
 * Welke versie draait hier?
 *
 * De studio bestaat omdat er meerdere sessies tegelijk aan dit spel werken: er
 * staan tientallen takken op origin en een handvol daarvan is een openstaande PR.
 * Wie iets nakijkt moet zonder na te denken kunnen zien wát hij nakijkt -- anders
 * keur je een wereld goed op code van gisteren.
 *
 * Alles hier is lézen, met drie uitzonderingen die je zelf aanklikt (haal op,
 * werk bij, wissel). Geen enkele functie gooit werk weg: staat er iets open in de
 * werkmap, dan weigert de wissel met een uitleg in plaats van een reset.
 *
 * Gebruik:
 *   const v = require('./versie');
 *   v.feiten()                  -> { tak, sha, onderwerp, vuil, voor, achter, ... }
 *   await v.haalOp()            -> git fetch --all --prune (nooit een merge)
 *   await v.bronnen()           -> { prs, takken } om uit te kiezen
 *   await v.wissel('origin/x')  -> { ok, tekst } of { ok:false, tekst }
 *   await v.bijwerken()         -> alleen fast-forward, anders een uitleg
 */
const { execFile, execFileSync } = require('child_process');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');

/* Git aanroepen. Twee smaken, en allebei geven ze nooit een uitzondering terug
   waar de studio op omvalt: een tak die niet bestaat, geen verte, geen git --
   dat zijn allemaal gewone antwoorden ("weet ik niet"), geen storingen. */
function gitStil(args, val) {
  try {
    return String(execFileSync('git', args, { cwd: ROOT, encoding: 'utf8',
      maxBuffer: 8e6, stdio: ['ignore', 'pipe', 'ignore'] })).trim();
  } catch (e) { return val == null ? '' : val; }
}
function git(args, tijd) {
  return new Promise((ok, fout) => {
    execFile('git', args, { cwd: ROOT, maxBuffer: 8e6, timeout: tijd || 60000 },
      (e, uit, err) => e ? fout(new Error(String(err || uit || e.message).trim())) : ok(String(uit).trim()));
  });
}

/* ---- Wat draait er nu? -----------------------------------------------------
   Eén kaartje met alles wat het chipje bovenin de studio nodig heeft. Bewust
   synchroon en bewust goedkoop (zes git-aanroepen op de index, geen netwerk):
   hij wordt bij élk verzoek opnieuw opgehaald, zodat een wissel buiten de studio
   om -- een `git checkout` in een andere terminal -- meteen te zien is zonder de
   server te herstarten. */
function feiten() {
  if (!gitStil(['rev-parse', '--is-inside-work-tree'])) {
    return { git: false, tak: null, sha: null, samenvatting: 'geen git-map' };
  }
  const tak = gitStil(['rev-parse', '--abbrev-ref', 'HEAD']);
  const los = tak === 'HEAD';                       // losse kop: we kijken naar een PR
  const sha = gitStil(['rev-parse', '--short', 'HEAD']);
  const volSha = gitStil(['rev-parse', 'HEAD']);
  const onderwerp = gitStil(['log', '-1', '--format=%s']);
  const wanneer = gitStil(['log', '-1', '--format=%cI']);
  const auteur = gitStil(['log', '-1', '--format=%an']);
  const vuileRegels = gitStil(['status', '--porcelain']).split('\n').filter(Boolean);

  /* Voor/achter ten opzichte van de eigen verte. Zonder upstream (een verse lokale
     tak, of een losse kop) is er niets te vergelijken en blijft het leeg -- dat is
     iets anders dan "gelijk". */
  /* Eerst de ingestelde upstream, en anders origin/<tak> als die bestaat. Dat
     tweede is geen luxe: een tak die door een clouddienst gepusht is en hier met
     `git checkout` is opgehaald heeft vaak géén upstream ingesteld, en dan zou de
     studio "staat alleen hier" zeggen terwijl er op origin nieuwer werk staat --
     precies de vergissing die dit vak hoort te voorkomen. */
  let upstream = gitStil(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  if (!upstream && tak && !los
      && gitStil(['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/' + tak])) {
    upstream = 'origin/' + tak;
  }
  let voor = null, achter = null;
  if (upstream) {
    const telling = gitStil(['rev-list', '--left-right', '--count', upstream + '...HEAD']);
    const [a, v] = telling.split(/\s+/).map(Number);
    if (!isNaN(a) && !isNaN(v)) { achter = a; voor = v; }
  }

  /* En ten opzichte van main, want dát is wat er op de telefoon van een kind
     draait. Een tak die 40 commits achterloopt op main test misschien iets dat
     allang anders is opgelost. */
  const mainRef = gitStil(['rev-parse', '--verify', '--quiet', 'origin/main']) ? 'origin/main'
    : (gitStil(['rev-parse', '--verify', '--quiet', 'main']) ? 'main' : null);
  let vanMain = null;
  if (mainRef) {
    const t = gitStil(['rev-list', '--left-right', '--count', mainRef + '...HEAD']);
    const [a, v] = t.split(/\s+/).map(Number);
    if (!isNaN(a) && !isNaN(v)) vanMain = { achter: a, voor: v, ref: mainRef };
  }

  const prNr = los ? prVoorSha(volSha) : null;
  const naam = los ? (prNr ? 'PR #' + prNr : 'losse kop') : tak;
  return {
    git: true, tak, los, naam, pr: prNr, sha, volSha, onderwerp, wanneer, auteur,
    vuil: vuileRegels.length, vuileRegels: vuileRegels.slice(0, 12),
    upstream: upstream || null, voor, achter, vanMain,
    isMain: tak === 'main',
    samenvatting: samenvatting({ naam, sha, vuil: vuileRegels.length, voor, achter, upstream }),
    opgehaald: laatsteFetch(),
  };
}

/* De regel die bovenin staat. Eén regel, in de taal van iemand die geen git
   kent: "main · a83f219 · gelijk" of "PR #42 · c91e220 · 3 nieuw op de verte". */
function samenvatting(f) {
  const d = [f.naam, f.sha];
  if (f.vuil) d.push(f.vuil + ' open ' + (f.vuil === 1 ? 'wijziging' : 'wijzigingen'));
  else if (!f.upstream) d.push('alleen hier');
  else if (f.achter && f.voor) d.push(f.achter + ' nieuw daar, ' + f.voor + ' hier');
  else if (f.achter) d.push(f.achter + ' nieuw op de verte');
  else if (f.voor) d.push(f.voor + ' nog niet gepusht');
  else d.push('gelijk');
  return d.join(' · ');
}

/* Wanneer is er voor het laatst opgehaald? FETCH_HEAD wordt door élke fetch
   aangeraakt, dus dat is de eerlijkste klok -- en hij overleeft een herstart van
   de server, in tegenstelling tot een variabele hier. */
function laatsteFetch() {
  try {
    const fs = require('fs');
    const f = path.join(gitStil(['rev-parse', '--git-dir']) || '.git', 'FETCH_HEAD');
    const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
    return fs.statSync(p).mtime.toISOString();
  } catch (e) { return null; }
}

/* ---- PR-nummers zonder GitHub -----------------------------------------------
   GitHub houdt van elke PR een ref bij (refs/pull/<n>/head). Die staan niet in
   een gewone kloon, maar `git ls-remote` haalt de lijst op zonder één object te
   downloaden -- een halve seconde, en daarmee weet je van élke commit of er een
   PR omheen zit. Dat is precies genoeg voor de vraag "wát kijk ik nu na?".

   Wat het NIET weet is of die PR nog openstaat en hoe hij heet; daarvoor is de
   API van GitHub nodig (zie prLijst). Werkt die niet -- geen net, of de
   bezoeklimiet van een gedeeld IP -- dan blijft dit over, en "PR #42" zonder
   titel is nog altijd oneindig veel beter dan een losse sha. */
let prCache = null;                                  // { tijd, kaart: sha -> nummer }
function prRefs() {
  if (prCache && Date.now() - prCache.tijd < 120000) return prCache.kaart;
  const kaart = {};
  const uit = gitStil(['ls-remote', 'origin', 'refs/pull/*/head']);
  uit.split('\n').filter(Boolean).forEach(r => {
    const [sha, ref] = r.split('\t');
    const m = /refs\/pull\/(\d+)\/head/.exec(ref || '');
    if (m) kaart[sha] = Number(m[1]);
  });
  prCache = { tijd: Date.now(), kaart };
  return kaart;
}
function prVoorSha(sha) {
  if (!sha) return null;
  try { return prRefs()[sha] || null; } catch (e) { return null; }
}

/* De openstaande PR's mét hun titel. Alleen de API van GitHub weet dit; hij
   wordt daarom met een korte wachttijd bevraagd en het antwoord wordt twee
   minuten bewaard. Lukt het niet, dan is dat geen fout maar een lege lijst plus
   een reden -- de studio valt dan terug op de takken, en die zijn er toch al. */
let apiCache = null;
function eigenaarRepo() {
  const url = gitStil(['remote', 'get-url', 'origin']);
  const m = /github\.com[:/]+([^/]+)\/([^/.]+)/.exec(url);
  return m ? { eigenaar: m[1], repo: m[2] } : null;
}
function prLijst() {
  if (apiCache && Date.now() - apiCache.tijd < 120000) return Promise.resolve(apiCache.uit);
  const wie = eigenaarRepo();
  if (!wie) return Promise.resolve({ prs: [], reden: 'origin wijst niet naar GitHub' });
  const kop = { 'user-agent': 'rekensterren-studio', accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) kop.authorization = 'Bearer ' + token;
  return new Promise(klaar => {
    const af = uit => { apiCache = { tijd: Date.now(), uit }; klaar(uit); };
    const req = https.get({ host: 'api.github.com', headers: kop,
      path: `/repos/${wie.eigenaar}/${wie.repo}/pulls?state=open&per_page=30&sort=updated&direction=desc` },
      r => {
        let b = '';
        r.on('data', c => { b += c; if (b.length > 4e6) req.destroy(); });
        r.on('end', () => {
          if (r.statusCode !== 200) {
            return af({ prs: [], reden: 'GitHub gaf ' + r.statusCode
              + (r.statusCode === 403 ? ' (bezoeklimiet — zet GITHUB_TOKEN voor meer)' : '')
              + (r.statusCode === 401 ? ' (GITHUB_TOKEN wordt niet aanvaard)' : '') });
          }
          try {
            const lijst = JSON.parse(b).map(p => ({
              nummer: p.number, titel: p.title, tak: p.head && p.head.ref,
              sha: p.head && p.head.sha, concept: !!p.draft,
              bijgewerkt: p.updated_at, url: p.html_url,
            }));
            af({ prs: lijst, reden: null });
          } catch (e) { af({ prs: [], reden: 'onleesbaar antwoord van GitHub' }); }
        });
      });
    req.on('error', e => af({ prs: [], reden: 'geen verbinding met GitHub (' + e.code + ')' }));
    req.setTimeout(5000, () => { req.destroy(); af({ prs: [], reden: 'GitHub antwoordde niet binnen 5s' }); });
  });
}

/* ---- Waar kun je uit kiezen? -----------------------------------------------
   Drie soorten, en in deze volgorde, want dit is de volgorde waarin je ze zoekt:
   main, de openstaande PR's, en de takken die er verder zijn. Van de takken
   alleen de recente: er staan er hier zeventig op origin en de helft daarvan is
   maanden geleden gesamenvoegd. Wat ouder is dan de lijst vraag je met de hand
   op met `git checkout` -- en dan weet je ook wat je doet. */
const MAX_TAKKEN = 24;
async function bronnen() {
  const nu = feiten();
  const { prs, reden } = await prLijst();
  const prVanTak = {};
  prs.forEach(p => { if (p.tak) prVanTak[p.tak] = p; });

  const vorm = '%(refname:short)\t%(objectname:short)\t%(committerdate:iso8601)\t%(contents:subject)';
  const lees = ref => gitStil(['for-each-ref', '--sort=-committerdate', '--format=' + vorm, ref])
    .split('\n').filter(Boolean).map(r => {
      const [naam, sha, datum, onderwerp] = r.split('\t');
      return { naam, sha, datum, onderwerp };
    });
  const lokaal = lees('refs/heads');
  const verte = lees('refs/remotes/origin').filter(t => t.naam !== 'origin/HEAD');
  const lokaleNamen = new Set(lokaal.map(t => t.naam));

  const takken = [];
  const zie = new Set();
  lokaal.forEach(t => {
    if (t.naam === 'main') return;
    zie.add(t.naam);
    takken.push(Object.assign({ ref: t.naam, waar: 'hier', pr: prVanTak[t.naam] || null }, t));
  });
  verte.forEach(t => {
    const kort = t.naam.replace(/^origin\//, '');
    if (kort === 'main' || zie.has(kort)) return;
    zie.add(kort);
    takken.push(Object.assign({ ref: t.naam, waar: 'verte', pr: prVanTak[kort] || null }, t));
  });
  takken.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));

  return {
    nu: nu.los ? nu.volSha : nu.tak,
    main: { ref: 'main', hier: lokaleNamen.has('main'),
            sha: gitStil(['rev-parse', '--short', 'origin/main']) || gitStil(['rev-parse', '--short', 'main']),
            onderwerp: gitStil(['log', '-1', '--format=%s', 'origin/main']) },
    prs: prs.map(p => Object.assign({}, p, { ref: 'pr/' + p.nummer })),
    prReden: reden,
    takken: takken.slice(0, MAX_TAKKEN),
    meer: Math.max(0, takken.length - MAX_TAKKEN),
  };
}

/* ---- De drie dingen die wél iets doen -------------------------------------- */

/* Ophalen. Alleen ophalen: `fetch` raakt de werkmap niet aan en kan dus nooit
   werk kosten. Hij loopt bij het starten mee op de achtergrond, met een klok
   eromheen -- zonder net hoort de studio gewoon te openen, niet te wachten. */
function haalOp(tijd) {
  return git(['fetch', '--all', '--prune', '--quiet'], tijd || 20000)
    .then(() => ({ ok: true, tekst: 'opgehaald' }))
    .catch(e => ({ ok: false, tekst: e.message.split('\n')[0] || 'ophalen mislukt' }));
}

/* Wisselen van bron. De hele veiligheid zit in één regel: staat er iets open in
   de werkmap, dan gebeurt er niets. Geen stash, geen reset, geen --force. Dat is
   met opzet saai: dit is gereedschap dat naast je echte werk draait, en het mag
   dat werk nooit opruimen omdat jij op een lijstje klikte.

   Een PR wordt met een lósse kop bekeken (`--detach`). Dat is precies wat je
   wilt: je kijkt naar andermans werk, je gaat er niet op doorwerken, en zo kan
   er ook geen halve tak achterblijven die morgen uit de pas loopt met de PR. */
async function wissel(ref) {
  ref = String(ref || '').trim();
  if (!ref) return { ok: false, tekst: 'geen bron gekozen' };
  const f = feiten();
  if (!f.git) return { ok: false, tekst: 'dit is geen git-map' };
  if (f.vuil) {
    return { ok: false, tekst: 'er staan ' + f.vuil + ' wijzigingen open in de werkmap. '
      + 'De studio ruimt die nooit op — leg ze eerst vast (of zet ze apart) en wissel daarna.',
      vuileRegels: f.vuileRegels };
  }
  try {
    const pr = /^pr\/(\d+)$/.exec(ref);
    if (pr) {
      await git(['fetch', 'origin', 'pull/' + pr[1] + '/head'], 45000);
      await git(['checkout', '--detach', 'FETCH_HEAD']);
      return { ok: true, tekst: 'PR #' + pr[1] + ' staat klaar — losse kop, dus kijken en niet doorwerken' };
    }
    if (ref === 'main') {
      await git(['checkout', 'main']);
      try { await git(['merge', '--ff-only', 'origin/main']); } catch (e) { /* geen verte: main blijft zoals hij is */ }
      return { ok: true, tekst: 'main, bijgewerkt tot ' + gitStil(['rev-parse', '--short', 'HEAD']) };
    }
    const kort = ref.replace(/^origin\//, '');
    const heeftLokaal = !!gitStil(['rev-parse', '--verify', '--quiet', 'refs/heads/' + kort]);
    if (heeftLokaal) await git(['checkout', kort]);
    else await git(['checkout', '-b', kort, '--track', 'origin/' + kort]);
    return { ok: true, tekst: kort + ' op ' + gitStil(['rev-parse', '--short', 'HEAD']) };
  } catch (e) {
    return { ok: false, tekst: String(e.message).split('\n').slice(0, 4).join(' ') };
  }
}

/* Bijwerken: alleen als het schoon vooruit kan. Loopt de tak uiteen met de
   verte, dan is dat een echte keuze (samenvoegen of herschrijven) en die hoort
   niet achter een knopje in een kijkgereedschap te zitten. */
async function bijwerken() {
  const f = feiten();
  if (!f.git) return { ok: false, tekst: 'dit is geen git-map' };
  if (f.vuil) return { ok: false, tekst: 'er staan ' + f.vuil + ' wijzigingen open — eerst vastleggen' };
  if (f.los) return { ok: false, tekst: 'een losse kop (PR) werk je niet bij; kies de PR opnieuw' };
  if (!f.upstream) return { ok: false, tekst: f.tak + ' staat alleen hier — er is geen verte om bij te werken' };
  if (!f.achter) return { ok: false, tekst: 'al gelijk met ' + f.upstream };
  try {
    await git(['merge', '--ff-only', f.upstream]);
    return { ok: true, tekst: f.tak + ' bijgewerkt tot ' + gitStil(['rev-parse', '--short', 'HEAD']) };
  } catch (e) {
    return { ok: false, tekst: f.tak + ' en ' + f.upstream + ' lopen uiteen — dat is een samenvoeging '
      + 'met de hand, geen knopje. (' + String(e.message).split('\n')[0] + ')' };
  }
}

/* ---- Open werk ------------------------------------------------------------
   Een wissel weigert zolang er iets openstaat, en dat is juist. Maar tot nu toe
   zei de studio alleen dát, en stond je met een melding zonder uitweg: geen enkele
   knop hier kon er iets mee. Dan ga je zoeken naar de reden dat je gereedschap
   niet werkt, terwijl het gewoon op een beslissing van jou staat te wachten.

   Drie uitwegen, en ze staan bewust in deze volgorde:

     opzij       git stash. Niets raakt kwijt, alles komt terug met "haal terug".
                 Dit is het antwoord op "ik wil nu even iets anders bekijken".
     vastleggen  op een tak, lokaal, zonder push en zonder testen. Dit is het
                 antwoord op "dit werk wil ik houden". Nooit rechtstreeks op main:
                 main is wat er op de telefoon van een kind draait, en daar komt
                 niets in zonder een diff die iemand gezien heeft.
     terugdraaien deze bestanden terug naar wat er in het spel staat. Dit is het
                 enige dat werk wégdoet, dus het gaat in twee stappen -- net als
                 publiceren: de eerste aanroep vertelt alleen wat er zou gebeuren.

   Wat hier nog steeds niet gebeurt, en nooit gaat gebeuren: reset --hard, een
   force, of iets wat onaangekondigd over je werk heen loopt. */
function opengewerk() {
  const f = feiten();
  if (!f.git) return { ok: false, tekst: 'dit is geen git-map' };
  /* De volledige lijst, niet de twaalf van feiten(): wie hier iets mee doet moet
     álles zien waar het over gaat. */
  const regels = gitStil(['status', '--porcelain']).split('\n').filter(Boolean).map(r => ({
    stand: r.slice(0, 2),
    // "XY pad", en bij een hernoeming "R  oud -> nieuw": de nieuwe naam telt
    pad: r.slice(2).trim().split(' -> ').pop().replace(/^"|"$/g, ''),
  }));
  return { ok: true, tak: f.tak, isMain: f.isMain || f.tak === 'master', los: f.los, regels };
}

async function opzij() {
  const f = feiten();
  if (!f.git) return { ok: false, tekst: 'dit is geen git-map' };
  if (!f.vuil) return { ok: false, tekst: 'er staat niets open om opzij te zetten' };
  try {
    const stempel = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await git(['stash', 'push', '-m', 'studio ' + stempel]);
    return { ok: true, tekst: 'Opzij gezet. Je werk staat in de stash en komt terug met '
      + '"Haal terug" (of: git stash pop).' };
  } catch (e) {
    return { ok: false, tekst: 'Opzij zetten lukte niet — er is niets veranderd.\n'
      + String(e.message).split('\n').slice(0, 4).join('\n') };
  }
}

async function haalTerug() {
  const f = feiten();
  if (!f.git) return { ok: false, tekst: 'dit is geen git-map' };
  if (!gitStil(['stash', 'list'])) return { ok: false, tekst: 'er staat niets opzij' };
  try {
    const uit = await git(['stash', 'pop']);
    return { ok: true, tekst: 'Teruggehaald.\n' + uit.split('\n').slice(0, 6).join('\n') };
  } catch (e) {
    /* Een pop die botst laat de stash staan -- dat is de veilige kant, en het is
       precies wat je moet weten om verder te kunnen. */
    return { ok: false, tekst: 'Terughalen botst met wat er nu staat. Je werk staat nog '
      + 'veilig opzij (git stash list).\n' + String(e.message).split('\n').slice(0, 6).join('\n') };
  }
}

/* Een naam die git accepteert, uit iets wat een mens intikt. */
function takNaam(bericht) {
  const kern = String(bericht || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  return 'studio/' + (kern || 'werk') + '-' + new Date().toISOString().slice(5, 10).replace('-', '');
}

async function vastleggen(bericht) {
  const f = feiten();
  if (!f.git) return { ok: false, tekst: 'dit is geen git-map' };
  if (!f.vuil) return { ok: false, tekst: 'er is niets gewijzigd' };
  bericht = String(bericht || '').trim();
  if (bericht.length < 8) return { ok: false, tekst: 'Geef een bericht van minstens 8 tekens — '
    + 'over een half jaar is dat het enige wat nog uitlegt waaróm dit veranderde.' };
  if (f.los) return { ok: false, tekst: 'Je kijkt naar een losse kop (een PR). Vastleggen hoort '
    + 'op een tak; zet je werk opzij en wissel eerst.' };
  const opMain = f.tak === 'main' || f.tak === 'master';
  const doel = opMain ? takNaam(bericht) : f.tak;
  try {
    /* Op main een nieuwe tak eronder schuiven. `checkout -b` neemt de open
       wijzigingen mee, dus er gaat niets verloren en main blijft waar hij stond. */
    if (opMain) await git(['checkout', '-b', doel]);
    await git(['add', '-A']);
    await git(['commit', '-m', bericht]);
    const sha = gitStil(['rev-parse', '--short', 'HEAD']);
    return { ok: true, tekst: 'Vastgelegd op ' + doel + ' · ' + sha
      + (opMain ? '\nMain staat nog waar hij stond.' : '')
      + '\nNog niet gepusht — dat doe je in de wereldstudio (Publiceren) of met de hand.' };
  } catch (e) {
    return { ok: false, tekst: 'Vastleggen mislukte — je werk staat er nog.\n'
      + String(e.message).split('\n').slice(0, 6).join('\n') };
  }
}

/* Terugdraaien. Twee stappen, en de eerste doet niets: hij zegt alleen wát er zou
   verdwijnen. Pas met fase 'go' gebeurt het, en dan alleen voor de paden die
   op dat moment werkelijk open staan -- een lijst uit een oud scherm kan dus
   nooit een bestand raken dat er inmiddels anders bij staat. */
async function terugdraaien(fase, paden) {
  const f = feiten();
  if (!f.git) return { ok: false, tekst: 'dit is geen git-map' };
  const open = opengewerk();
  const magWeg = new Set(open.regels.filter(r => r.stand.indexOf('?') < 0).map(r => r.pad));
  const kies = (paden && paden.length ? paden : [...magWeg]).filter(p => magWeg.has(p));
  if (!kies.length) {
    return { ok: false, tekst: 'Niets om terug te draaien. (Nieuwe, nog niet toegevoegde '
      + 'bestanden raakt de studio niet aan — die gooit git checkout ook niet weg.)' };
  }
  if (fase !== 'go') {
    return { ok: true, wacht: true, paden: kies,
      tekst: 'Dit zet ' + kies.length + ' bestand' + (kies.length === 1 ? '' : 'en')
        + ' terug naar wat er in het spel staat:\n  ' + kies.join('\n  ')
        + '\n\nDat is niet terug te draaien. Klik nog een keer om het te doen.' };
  }
  try {
    await git(['checkout', '--'].concat(kies));
    return { ok: true, tekst: 'Teruggezet: ' + kies.length + ' bestand'
      + (kies.length === 1 ? '' : 'en') + '.' };
  } catch (e) {
    return { ok: false, tekst: 'Terugdraaien mislukte — er is niets veranderd.\n'
      + String(e.message).split('\n').slice(0, 4).join('\n') };
  }
}

module.exports = { feiten, samenvatting, bronnen, haalOp, wissel, bijwerken,
                   opengewerk, opzij, haalTerug, vastleggen, terugdraaien, takNaam,
                   prVoorSha, prLijst, ROOT };
