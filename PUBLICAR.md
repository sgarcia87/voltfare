# Publicar VoltFare en GitHub Pages

Esta versión es estática: no necesita servidor, base de datos, registro ni compilación.

1. Abre Settings → Pages en este repositorio.
2. En Build and deployment, selecciona Deploy from a branch.
3. Elige la rama main y la carpeta / (root).
4. Pulsa Save y espera a que GitHub confirme la publicación.

La dirección prevista es https://sgarcia87.github.io/voltfare/ (solo estará disponible cuando Pages termine de publicar).

## Qué incluye

- Mapa OpenStreetMap y seguimiento GPS.
- Tarifas configurables, suplementos y mínimo total.
- Inicio, pausa, reanudación y finalización.
- Historial local en este navegador.
- Recibos descargables como HTML e imprimibles; Guardar como PDF depende del navegador.

## Datos y límites

El historial no se sincroniza: pertenece a este navegador y origen web. Borrar los datos del navegador elimina los viajes. Descarga los recibos que quieras conservar. Esta versión no importa el historial de la versión anterior alojada en Sites.

Si el almacenamiento está bloqueado o lleno, la aplicación conserva el trayecto pendiente en memoria para reintentar. No cierres esa pestaña antes de guardarlo. Un viaje en curso se pierde al recargar o cerrar la página.

Los registros del historial no se envían a un servidor de VoltFare. El mapa carga recursos de Leaflet (unpkg.com) y teselas de OpenStreetMap: esos proveedores reciben las solicitudes habituales, y las teselas corresponden al área visualizada. No hay login propio ni claves API.

Mantén la pestaña visible y permite el acceso a ubicación. El GPS exige un contexto seguro (HTTPS o localhost). La compatibilidad con el navegador del Tesla sigue pendiente de comprobar en el vehículo. Configura y manipula la app únicamente estando detenido.

Los recibos son resúmenes orientativos; no acreditan pago ni sustituyen facturas. No es un taxímetro homologado.

## Archivos y pruebas

- index.html: interfaz.
- app.js: cálculo, mapa, almacenamiento y recibos.
- .nojekyll: publicación estática sin Jekyll.
- test.mjs: pruebas de lógica y almacenamiento simulado.

Ejecuta las pruebas con Node.js moderno:

```sh
node test.mjs
```

No se incluyen dependencias instaladas, credenciales ni datos de viajes.
