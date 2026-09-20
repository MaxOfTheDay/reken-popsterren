if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
  /* Welke tekeningen er vandaag bestaan weet alleen dit bestand -- sw.js kent
     geen werelden en hoort ze ook niet te kennen. Deze lijst laat hem opruimen wat
     er niet meer bij hoort (een wereld die weg is, een tekening die hernoemd is),
     zodat de voorraad meegroeit met de werelden die er zíjn en niet met alle
     werelden die er ooit geweest zijn.

     Achter in de rij, en pas als er een service worker aan het roer staat: dit is
     opruimwerk, en opruimwerk komt ná het scherm. Zie het bericht-blok in sw.js. */
  naDeRust(() => {
    const sw = navigator.serviceWorker.controller;
    if (!sw) return;
    const art = [];
    WORLDS.forEach(w => {
      [w.art, w.venue && w.venue.art].forEach(a => {
        if (a && a.indexOf('blob:') !== 0 && !art.includes(a)) art.push(a);
      });
    });
    if (art.length) sw.postMessage({ art: art });
  });
}
