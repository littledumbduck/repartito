# 🦊 Repartito

**Un zorrito que vive en tu pantalla y te cuenta cómo va tu pedido de comida.**

Cuando haces un pedido en Glovo, Repartito aparece en la esquina de tu pantalla —incluso encima de un juego— y te dice en un bocadillo cuándo llegará. Haz clic en él para ver el mapa. Cuando no tienes ningún pedido, se esconde y no molesta.

> ⚠️ **Proyecto no oficial.** No está afiliado, patrocinado ni respaldado por Glovo. "Glovo" es una marca de sus propietarios y solo se menciona para indicar con qué servicio funciona.

---

## 📥 Instalar (Windows 10 y 11) — sin saber de ordenadores

1. Entra en la página de **[Descargas](https://github.com/littledumbduck/repartito/releases/latest)**.
2. Baja hasta **Assets** y haz clic en **`Repartito-Instalador-….exe`**. Se descarga en tu carpeta *Descargas*.
3. Haz **doble clic** en el archivo descargado.
4. Si Windows muestra una ventana azul que dice *"Windows protegió su PC"*:
   haz clic en **Más información** y luego en **Ejecutar de todas formas**.
   *(Sale porque la aplicación es nueva y aún no tiene certificado de pago; el código es público y cualquiera puede revisarlo.)*
5. Espera unos segundos. Se abrirá una ventana de bienvenida: pulsa **Iniciar sesión en Glovo**, entra con tu cuenta como siempre y cierra esa ventana. Solo hay que hacerlo una vez.

Y ya está. La próxima vez que hagas un pedido, el zorrito aparecerá solo.

### ¿Cómo lo uso?
- **Haz tu pedido** en Glovo como siempre (móvil u ordenador).
- El zorrito **aparece abajo en la pantalla**, pasea y te dice cuándo llega.
- **Clic en el zorrito** → se abre el mapa.
- **Si te molesta**, cógelo con el ratón y arrástralo a otro sitio: se queda donde lo sueltes. Para que vuelva a pasear, clic derecho → *Dejar que el zorrito pasee por la pantalla*.
- Cuando llega el pedido, hace una fiestecita y te avisa. **Haz clic en él** para ver el resumen (cuánto ha tardado cada tramo y si llegó a tiempo) y se despide.
- **Historial:** clic derecho → *Historial de pedidos* para ver los resúmenes de tus pedidos anteriores.
- **Clic derecho** en su icono junto al reloj (puede estar bajo la flecha `^`) → ajustes, ayuda, cerrar sesión o salir.

### ¿Quieres verlo antes de hacer un pedido?
En la ventana de bienvenida pulsa **Ver cómo funciono (demostración)**: simula un pedido de 75 segundos.

### Si algo no va
| Problema | Solución |
|---|---|
| No aparece el zorrito | Comprueba que tienes un pedido en marcha. Clic derecho en su icono → **Iniciar sesión en Glovo** y vuelve a entrar. |
| No lo veo en mi juego | El juego debe estar en modo **Ventana** o **Ventana sin bordes**. En "pantalla completa exclusiva" Windows no deja ver nada por encima. |
| Quiero desinstalarlo | *Configuración de Windows → Aplicaciones → Repartito → Desinstalar*. Antes, clic derecho en su icono → **Cerrar sesión y borrar mis datos**. |

---

## ✨ Qué incluye

- 🦊 **Mascota animada** que camina por la parte baja de la pantalla, se voltea, mueve patas y cola, y salta al entregar el pedido. Solo existe mientras hay un pedido.
- 💬 **Bocadillo** con la ventana de llegada estimada ("Llega entre las 20:05 y las 20:25") y los minutos que faltan.
- 🔔 **Notificaciones de Windows** en cada cambio de estado.
- 🗺️ **Mapa** (OpenStreetMap) con el restaurante, tu casa y un 🛵 con la posición estimada del repartidor.
- 📊 **Resumen al entregar:** tiempo total, hasta asignar repartidor, hasta que recoge el pedido, en ruta, y si llegó dentro de la franja que prometió Glovo. Incluye **historial** de pedidos.
- ✋ **Arrastrable** con animación (cuelga y patalea al cogerlo, rebota al soltarlo).
- 🎮 **Superpuesto a los juegos** en modo ventana/sin bordes; el ratón atraviesa la ventana salvo sobre el zorrito.
- 🔒 **Privado:** sin cuentas propias, sin servidores, sin analítica. No ve ni guarda tu contraseña.
- 🧪 **Modo demostración** para probarlo sin cuenta.
- ♿ Ventana de bienvenida con texto grande y navegación por teclado; el bocadillo se anuncia a los lectores de pantalla.

### Lo que NO hace (y por qué)
La **web de Glovo solo da la ventana de llegada estimada**. La posición del repartidor en tiempo real y las fases del pedido ("preparando", "recogido"…) **solo existen en su app móvil**, que no es accesible de forma legítima. Por eso el 🛵 del mapa es una **posición estimada**: se calcula sobre una ruta en moto por calles entre el restaurante y tu casa (línea punteada), según el tiempo que falta para la llegada. Es una aproximación: el repartidor puede ir por otro camino. Si Glovo ofreciera una vía oficial, se integraría.

---

## 🔐 Privacidad

- **Tu contraseña no pasa por Repartito.** Inicias sesión en la página oficial de Glovo, dentro de una ventana de la app. Solo se guarda en tu equipo la sesión que Glovo crea, como en cualquier navegador. *Cerrar sesión y borrar mis datos* la elimina.
- **Sin telemetría.** No hay servidores ni analítica de Repartito.
- **Servicios externos que se contactan:**
  - `glovoapp.com` → leer tu pedido (con tu sesión).
  - `nominatim.openstreetmap.org` → convertir las direcciones del pedido en puntos del mapa. Recibe el texto de la dirección del restaurante y la tuya, solo para esa consulta, sin guardarlo. Se puede desactivar: clic derecho → *Mostrar restaurante y mi casa en el mapa*.
  - `valhalla1.openstreetmap.de` → calcular la ruta en moto. Recibe solo las coordenadas del restaurante y de tu casa. Se desactiva junto con el punto anterior.
  - `tile.openstreetmap.org` → imágenes del mapa; recibe tu IP y la zona que miras.
- Datos guardados en tu equipo: `%APPDATA%\Repartito\` (ajustes, sesión e historial de pedidos con nombre del restaurante y tiempos). *Cerrar sesión y borrar mis datos* borra la sesión y el historial.
- **Qué mide el resumen:** solo lo que Repartito ve en la web de Glovo mientras está abierto. Glovo no publica la hora a la que pides ni cuándo termina de cocinar el restaurante; si Repartito empieza a verlo ya con repartidor, lo anterior no se conoce y el resumen lo dice. Deja Repartito abierto (activa *Abrir al encender el PC*) para medir el pedido entero.

## ⚖️ Aviso legal

- Leer automáticamente tu cuenta de Glovo **puede incumplir sus Términos de Uso** y llevar a restricciones de la cuenta. Úsalo bajo tu responsabilidad y solo con tu propia cuenta.
- El software se ofrece "tal cual", sin garantía (ver [LICENSE](LICENSE)).
- Mapa © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright).
- Si Glovo lo solicita o ofrece una vía oficial, el proveedor se retirará o adaptará.

---

## 🛠️ Para desarrolladores

Requisitos: [Node.js](https://nodejs.org) 20+ y Windows (probado en Windows 11).

```bash
git clone https://github.com/littledumbduck/repartito.git
cd repartito
npm install
npm run icons     # genera assets/icon.png y tray.png
npm start
```

Modo demostración directo, sin ventana de bienvenida:

```bash
REPARTITO_DEMO=1 npm start      # PowerShell: $env:REPARTITO_DEMO=1; npm start
```

Crear el instalador local (`dist/Repartito-Instalador-x.y.z.exe`):

```bash
npm run dist
```

### Estructura
```
src/main/main.js              ventanas, bandeja, paseo de la mascota, notificaciones
src/main/providers/demo.js    pedido simulado
src/main/providers/glovo.js   lee la web de Glovo (sesión en partición propia)
src/main/geocode.js           dirección → coordenadas (Nominatim)
src/main/route.js             ruta en moto por calles (Valhalla / OpenStreetMap)
src/renderer/                 pet (mascota), map (Leaflet), welcome, summary, history
.github/workflows/            CI y publicación del instalador
```

### Añadir otro servicio de reparto
Un proveedor es un módulo con `start(emit, opciones)` que devuelve una función para pararlo y llama a `emit({ state, text, etaMin, courier, store, destination })`. Los estados válidos son `idle`, `preparing`, `pickup`, `delivering`, `arriving`, `delivered`, `cancelled` y `error`. Al entregar, `emit` puede incluir `summary: { lines, oneLine, store, endedAt, id }` para el resumen y el historial. Mira `demo.js` como ejemplo mínimo y conéctalo en `startProvider` de `main.js`.

### Publicar una versión
```bash
git tag v0.1.0
git push --tags
```
El workflow *Release* construye el instalador en GitHub y lo adjunta a la release.

Más detalles en [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 Licencia
[MIT](LICENSE)
