document.getElementById('hist').addEventListener('click', () => window.repartito.openHistory());
window.repartito.getSummary().then((s) => {
  const ul = document.getElementById('lines');
  if (!s) {
    document.getElementById('one').textContent = 'Todavía no hay ningún pedido entregado.';
    return;
  }
  document.getElementById('one').textContent = s.oneLine;
  for (const line of s.lines) {
    const li = document.createElement('li');
    li.textContent = line; // textContent: nunca HTML
    ul.appendChild(li);
  }
});
