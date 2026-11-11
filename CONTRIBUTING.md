# Contribuir a Repartito

¡Gracias por querer ayudar! Cualquier ayuda es bienvenida: ideas, errores, traducciones o código.

## Reglas del juego
- **Sin datos personales** en issues, capturas o commits (emails, teléfonos, direcciones, identificadores de pedido). Si pegas un registro, revísalo antes.
- **Sin ingeniería inversa de apps móviles ni saltarse protecciones.** El proyecto solo lee lo que la web ya muestra al propio usuario.
- **Nunca pedir ni guardar contraseñas.** El inicio de sesión se hace siempre en la web oficial del servicio.

## Cómo proponer un cambio
1. Haz un *fork* y crea una rama.
2. `npm install && npm start` para probarlo (usa `REPARTITO_DEMO=1` para no necesitar cuenta).
3. Mantén los textos de cara al usuario en español sencillo.
4. Abre una *pull request* explicando qué cambia y cómo lo has probado.

## Si la web de Glovo cambia y el zorrito deja de ver pedidos
Los textos y enlaces que se leen están al principio de `src/main/providers/glovo.js` (`ORDERS_URL`, `parseDetail`, `parseAddresses`). Abre un *issue* indicando qué ves en la página (sin datos personales) y, si puedes, propón el ajuste.
