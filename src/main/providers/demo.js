// Proveedor de demostración: simula un pedido completo para probar la app sin cuenta.
const STORE = { name: 'Bocatería Demo', lat: 40.4153, lng: -3.7074 };
const HOME = { lat: 40.4237, lng: -3.6925 };

const STEPS = [
  { at: 0, state: 'preparing', text: 'El restaurante está preparando tu pedido 🍳', eta: 25 },
  { at: 15, state: 'pickup', text: 'El repartidor va a recoger tu pedido 🛵', eta: 20 },
  { at: 30, state: 'delivering', text: 'Tu pedido va de camino 🚀', eta: 12 },
  { at: 60, state: 'arriving', text: '¡Casi llega! Baja a la puerta 🔔', eta: 2 },
  { at: 75, state: 'delivered', text: '¡Entregado! Que aproveche 😋', eta: 0 },
];

function start(emit) {
  const t0 = Date.now();
  const tick = () => {
    const s = (Date.now() - t0) / 1000;
    const step = [...STEPS].reverse().find((x) => s >= x.at);
    const moving = s >= 30;
    const p = Math.min(1, Math.max(0, (s - 30) / 45));
    const from = s < 30 ? STORE : STORE;
    emit({
      state: step.state,
      text: step.text,
      summary: step.state === 'delivered' ? {
        demo: true, // no se guarda en el historial
        oneLine: 'Tardó 1 min 15 s · dentro de lo prometido',
        lines: ['⏱️ Tiempo total: 1 min (demostración)', '🍳 Con repartidor asignado hasta recoger el pedido: 15 s', '🛵 En ruta hasta tu puerta: 45 s', '📅 Esto es una demostración: tus pedidos reales traerán tiempos reales.'],
      } : undefined,
      etaMin: step.eta,
      store: STORE,
      destination: HOME,
      courier: moving
        ? { lat: from.lat + (HOME.lat - from.lat) * p, lng: from.lng + (HOME.lng - from.lng) * p }
        : { lat: STORE.lat, lng: STORE.lng },
      updatedAt: Date.now(),
    });
    if (step.state === 'delivered') stop();
  };
  const id = setInterval(tick, 2000);
  const stop = () => clearInterval(id);
  tick();
  return stop;
}

module.exports = { start };
