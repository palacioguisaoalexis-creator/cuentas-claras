# Cuentas Claras

App web gratuita de finanzas personales: cuánto puedes gastar hoy, cuentas y saldos, deudas y tarjetas con compras compartidas, gastos programados, calendario, proyecciones y un asistente con IA (Gemini).

Se publica con GitHub Pages y usa Firebase (plan gratuito Spark) para el inicio de sesión, la base de datos y la IA.

## Archivos
- `index.html` — pantalla de inicio de sesión y estructura de la app.
- `app.js` — toda la lógica de la app.
- `plataforma.js` — conexión con Firebase: login (Google y enlace por correo), Firestore, Gemini y descargas.
- `sw.js`, `manifest.json`, `icon-*.png` — para instalarla en el celular y abrirla sin señal.
- `privacidad.html` — política de privacidad y tratamiento de datos.
- `firestore.rules` — reglas de seguridad: cada persona solo ve sus datos.

## Configuración en Firebase (una sola vez)
1. **Firestore → Reglas:** pegar el contenido de `firestore.rules` y publicar.
2. **Authentication → Configuración → Dominios autorizados:** agregar `palacioguisaoalexis-creator.github.io`.
3. **Authentication → Método de acceso:** activar Google y Correo electrónico (con vínculo por correo).
4. **AI Logic:** activado con Gemini Developer API (gratis).
