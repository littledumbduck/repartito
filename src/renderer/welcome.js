const $ = (id) => document.getElementById(id);
$('login').addEventListener('click', () => window.repartito.welcomeLogin());
$('demo').addEventListener('click', () => window.repartito.welcomeDemo());
$('done').addEventListener('click', () => window.repartito.welcomeDone($('auto').checked));
