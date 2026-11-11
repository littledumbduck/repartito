const $ = (id) => document.getElementById(id);
let state = 'idle';

function render(s) {
  state = s.state || 'idle';
  const keep = ['walking', 'dragging', 'land'].filter((c) => document.body.classList.contains(c));
  document.body.className = [state, ...keep].join(' ');
  $('text').textContent = s.text || '';
  $('eta').textContent = s.summary ? `${s.summary.oneLine} · Toca para ver el resumen` : s.etaMin ? `Llega en ~${s.etaMin} min` : '';
}
window.repartito.getStatus().then(render);
window.repartito.onStatus(render);

// dir: -1 izquierda, 0 parado, 1 derecha
window.repartito.onWalk((dir) => {
  document.body.classList.toggle('walking', dir !== 0);
  if (dir !== 0) $('sprite').classList.toggle('left', dir < 0);
});

// ---- arrastrar al zorrito (clic sin mover = abrir el mapa) ----
let drag = null;
const pet = $('pet');
pet.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  pet.setPointerCapture(e.pointerId); // seguimos recibiendo el ratón aunque salga de la ventana
  drag = { sx: e.screenX, sy: e.screenY, lx: e.screenX, ly: e.screenY, moved: false };
});
pet.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.screenX - drag.sx, e.screenY - drag.sy) < 5) return;
    drag.moved = true;
    document.body.classList.remove('land');
    document.body.classList.add('dragging');
    window.repartito.dragStart();
  }
  window.repartito.dragMove(e.screenX - drag.lx, e.screenY - drag.ly);
  drag.lx = e.screenX; drag.ly = e.screenY;
});
function endDrag(e) {
  if (!drag) return;
  const d = drag; drag = null;
  try { pet.releasePointerCapture(e.pointerId); } catch {}
  if (!d.moved) return window.repartito.openMap();
  document.body.classList.remove('dragging');
  document.body.classList.add('land'); // aterrizaje
  setTimeout(() => document.body.classList.remove('land'), 500);
  window.repartito.dragEnd();
}
pet.addEventListener('pointerup', endDrag);
pet.addEventListener('pointercancel', endDrag);

// Ventana transparente: solo captura el ratón sobre la mascota y el bocadillo (y se para al pasar el ratón).
document.addEventListener('mousemove', (e) => {
  if (drag) return;
  const over = !!e.target.closest('.hit');
  window.repartito.setIgnore(!over);
  window.repartito.hover(over);
});
document.addEventListener('mouseleave', () => { if (!drag) window.repartito.hover(false); });
$('bubble').addEventListener('click', () => window.repartito.openMap());
document.addEventListener('contextmenu', (e) => { e.preventDefault(); window.repartito.showMenu(); });
