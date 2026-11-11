const list = document.getElementById('list');
const when = (t) => new Date(t).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

window.repartito.getHistory().then((items) => {
  if (!items.length) {
    list.innerHTML = '<p class="empty">Aún no hay pedidos. Cuando se entregue el próximo, aparecerá aquí.</p>';
    return;
  }
  items.forEach((h, i) => {
    const d = document.createElement('details');
    if (i === 0) d.open = true;
    const s = document.createElement('summary');
    s.textContent = `${h.endedAt ? when(h.endedAt) : 'Pedido'}${h.store ? ' · ' + h.store : ''}`;
    const sub = document.createElement('small');
    sub.textContent = h.oneLine;
    s.appendChild(sub);
    d.appendChild(s);
    const ul = document.createElement('ul');
    for (const l of h.lines) { const li = document.createElement('li'); li.textContent = l; ul.appendChild(li); }
    d.appendChild(ul);
    list.appendChild(d);
  });
});
