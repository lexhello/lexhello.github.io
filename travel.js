const builtInEntries = window.travelEntries || [];
let map, markersLayer, markers = [], entries = [...builtInEntries];

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const photoURL = (path) => path.startsWith('data:') ? path : encodeURI(path);

function pinSize() {
  return Math.min(27, Math.max(16, 16 + (map.getZoom() - 2) * 1.15));
}

function makeIcon() {
  const size = pinSize();
  return L.divIcon({ className: '', html: `<div class="place-pin" style="--pin-size: ${size}px"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size] });
}

function openEntry(id, pan = false) {
  const entry = entries.find(item => item.id === id);
  if (!entry) return;
  if (pan) map.flyTo([entry.lat, entry.lng], 6, { duration: 1.1 });
  document.querySelector('.detail-kicker').textContent = `${entry.country} · ${entry.dates}`;
  document.querySelector('#detail-title').textContent = entry.place;
  document.querySelector('#detail-note').textContent = entry.note;
  document.querySelector('#detail-photos').innerHTML = entry.photos.length
    ? entry.photos.map((photo, index) => `<img src="${photoURL(photo)}" alt="${escapeHTML(entry.place)} travel photo ${index + 1}">`).join('')
    : '<p>No photos added yet.</p>';
  document.querySelector('#detail').classList.add('is-open');
}

function renderMap() {
  markersLayer.clearLayers();
  markers = [];
  entries.forEach(entry => {
    const marker = L.marker([entry.lat, entry.lng], { icon: makeIcon(), title: entry.place })
      .on('click', () => openEntry(entry.id))
      .addTo(markersLayer);
    markers.push(marker);
  });
}

function resizePins() {
  markers.forEach(marker => marker.setIcon(makeIcon()));
}

function renderList() {
  const countries = entries.reduce((groups, entry) => {
    (groups[entry.country] ||= []).push(entry); return groups;
  }, {});
  document.querySelector('#places-list').innerHTML = Object.entries(countries).sort(([a], [b]) => a.localeCompare(b)).map(([country, locations]) => `
    <div class="country-group"><div class="country-name">${escapeHTML(country)}</div>
      ${locations.sort((a, b) => a.place.localeCompare(b.place)).map(entry => `<button class="place-row" data-place-id="${escapeHTML(entry.id)}">${escapeHTML(entry.place)}<small>${escapeHTML(entry.dates)}</small></button>`).join('')}
    </div>`).join('');
}

function renderBanner() {
  const banner = document.querySelector('#banner-link');
  let index = 0;
  const update = () => {
    const entry = entries[index % entries.length];
    if (!entry) return;
    banner.dataset.placeId = entry.id;
    banner.style.setProperty('--banner-image', entry.photos[0] ? `url("${photoURL(entry.photos[0])}")` : 'linear-gradient(125deg, #865f46, #4f8da5)');
    banner.querySelector('h1').textContent = entry.place;
    banner.querySelector('#banner-meta').textContent = `${entry.country} · ${entry.dates} · `;
    index += 1;
  };
  update();
  window.setInterval(update, 5500);
}

document.addEventListener('DOMContentLoaded', () => {
  map = L.map('map', { zoomControl: false, minZoom: 2, worldCopyJump: true }).setView([40, 8], 2);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  // A low-detail base keeps land, sea, lakes, and country boundaries visible.
  // Locking its native detail prevents street-level road clutter while zooming.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    maxNativeZoom: 12,
    subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);
  // Carto's label-only tiles show city names but omit roads, terrain, borders,
  // and other geographic features. This sits above the quiet base layer.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  renderMap(); renderList(); renderBanner();
  map.on('zoomend', resizePins);
  document.querySelector('#places-list').addEventListener('click', event => { const id = event.target.closest('[data-place-id]')?.dataset.placeId; if (id) { document.querySelector('#places-panel').classList.remove('is-open'); openEntry(id, true); } });
  document.querySelector('#banner-link').addEventListener('click', event => { event.preventDefault(); openEntry(event.currentTarget.dataset.placeId, true); });
  document.querySelector('#list-toggle').onclick = () => document.querySelector('#places-panel').classList.add('is-open');
  document.querySelector('#list-close').onclick = () => document.querySelector('#places-panel').classList.remove('is-open');
  document.querySelector('#detail-close').onclick = () => document.querySelector('#detail').classList.remove('is-open');
});
