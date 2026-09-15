<div align="center">

# ⚡ VoltFare

### Tu trayecto. Tu tarifa. Todo en el navegador.

**Estimador de tarifas VTC con GPS, pensado para la pantalla del Tesla.**  
Mapa en directo · Precio mínimo · Historial local · Recibos descargables

[![Abrir VoltFare](https://img.shields.io/badge/ABRIR_VOLTFARE-7cf7c4?style=for-the-badge&logo=googlechrome&logoColor=080b10)](https://sgarcia87.github.io/voltfare/)
[![Guía rápida](https://img.shields.io/badge/GUÍA_RÁPIDA-11161d?style=for-the-badge&logo=readthedocs&logoColor=white)](#-empieza-en-un-minuto)

![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![Sin registro](https://img.shields.io/badge/Acceso-sin_registro-7cf7c4?style=flat-square)
![Historial local](https://img.shields.io/badge/Historial-en_tu_navegador-66d9ff?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/Hosting-GitHub_Pages-181717?style=flat-square&logo=github)

[Abrir la aplicación](https://sgarcia87.github.io/voltfare/) · [English](#english) · [Reportar un problema](https://github.com/sgarcia87/voltfare/issues)

</div>

---

## ¿Qué es VoltFare?

VoltFare es una **calculadora de precios de trayectos VTC** con una interfaz de estilo taxímetro online: muestra una estimación en euros a partir de la distancia GPS, el tiempo y una tarifa configurable.

Está diseñada con lectura grande, modo oscuro y disposición horizontal para la pantalla de un Tesla, y se adapta también a móvil y ordenador. Se abre desde una URL, sin instalar una aplicación ni crear una cuenta.

> **Estado:** prototipo funcional publicado. La compatibilidad del GPS con el navegador del Tesla todavía debe comprobarse en un vehículo real. VoltFare no es un taxímetro homologado ni una aplicación oficial de Tesla.

## ✨ Qué puedes hacer

| Función | Cómo funciona |
| --- | --- |
| 📍 **Mapa y ubicación** | Mapa OpenStreetMap con posición y trazado del recorrido mientras recibe GPS. |
| 💶 **Tarifa a medida** | Configura importe inicial, €/km, €/minuto y suplementos. |
| 🧾 **Precio mínimo** | Establece un mínimo para el total, incluidos los suplementos. |
| ⏱️ **Control del trayecto** | Inicia, pausa, reanuda y finaliza. La pausa detiene el cómputo de tiempo y distancia. |
| 📊 **Desglose visible** | Consulta inicio, distancia, tiempo, suplementos y ajuste al mínimo. |
| 🗂️ **Historial local** | Recupera los viajes finalizados en ese navegador, con su tarifa original. |
| 📄 **Recibos** | Abre un recibo, descárgalo como HTML o imprímelo. PDF mediante el diálogo de impresión, si el navegador lo permite. |
| 🚦 **Avisos de medición** | Detecta señal GPS ausente o imprecisa y avisa si el guardado falla. |

## 🚀 Empieza en un minuto

1. Abre **[VoltFare](https://sgarcia87.github.io/voltfare/)**.
2. Con el vehículo detenido, pulsa **Tarifa ⚙** y configura tus importes. El nombre de empresa y la matrícula son opcionales.
3. Pulsa **Localizarme** y concede el permiso de ubicación.
4. Pulsa **Iniciar trayecto**. Mantén la pestaña visible.
5. Al terminar, pulsa **Finalizar** y confirma el guardado. Se abrirá el recibo.
6. Recupera los servicios anteriores desde **Historial y recibos**.

**Configura y manipula la aplicación con el vehículo detenido.** No recargues ni cierres la pestaña durante un viaje: el trayecto en curso está en memoria.

## 💶 Cómo se calcula el importe

El cálculo suma:

```text
Subtotal = importe inicial
         + kilómetros medidos × precio por km
         + minutos activos × precio por minuto
         + suplementos

Total = máximo entre el subtotal y el precio mínimo
```

Cada concepto monetario se redondea a céntimos antes de sumar. El ajuste al mínimo aparece como una línea separada.

- **Mínimo de 0 €:** no se aplica un suelo de precio.
- **Tiempo activado:** se cobra durante todo el tiempo activo, no solo durante las esperas.
- **Tiempo desactivado:** los minutos se muestran, pero no añaden importe.
- **Suplementos:** cantidad fija por trayecto.
- **Durante el viaje:** la tarifa queda fijada y no se puede editar.
- **En pausa:** no se acumulan tiempo ni distancia.

**Ejemplo:** 3,50 € de inicio + 2 km × 1,35 €/km + 5 min × 0,28 €/min = **7,60 €**. Con un mínimo de 10 €, se añade un ajuste de 2,40 € y el total estimado es **10,00 €**.

Los valores iniciales de la aplicación son ejemplos configurables, no tarifas oficiales.

## 🧾 Historial, recibos y privacidad

**Tus viajes se guardan en el almacenamiento local del navegador.** Esta edición no utiliza un servidor de VoltFare para almacenar trayectos.

- El historial no se sincroniza entre el Tesla, el móvil y el ordenador.
- Borrar los datos del sitio elimina los viajes. La navegación privada puede no conservarlos.
- Descarga los recibos que quieras guardar fuera del navegador.
- Cada recibo conserva fecha, duración, distancia, tarifa, desglose y total del viaje.
- El mapa del recorrido se muestra durante la sesión; el trazado no se guarda en el historial.
- El recibo es un **resumen orientativo**, no una factura ni un justificante de pago.

Si no se puede guardar, el trayecto permanece pendiente para reintentarlo. **No cierres la pestaña mientras haya un guardado pendiente.**

El mapa sí requiere servicios externos: Leaflet se carga desde unpkg.com y las teselas desde OpenStreetMap. Estos proveedores reciben las solicitudes de recursos; las teselas solicitadas corresponden al área visualizada. No es una aplicación totalmente offline.

## 📍 GPS y compatibilidad

| Entorno | Qué esperar |
| --- | --- |
| **Pantalla Tesla** | Interfaz pensada para uso horizontal. Acceso al GPS y comportamiento del navegador pendientes de validación en el vehículo. |
| **Móvil u ordenador** | Necesita un navegador compatible y permiso de ubicación. La precisión depende del dispositivo y de la señal. |
| **GitHub Pages** | Sirve la aplicación por HTTPS, sin backend ni claves API propias. |
| **Segundo plano o pantalla suspendida** | El navegador puede interrumpir las actualizaciones. Mantén visible la pestaña. |

VoltFare usa la ubicación que proporciona el navegador; **no se conecta a la API de Tesla ni al odómetro del vehículo**. La distancia se aproxima a partir de posiciones sucesivas, sin ajuste a la red de carreteras.

Si se pierde el GPS, el tiempo activo puede seguir contando, pero no se inventan kilómetros. Cuando se detectan problemas de señal, el recibo indica que la medición puede ser incompleta.

## 🛠️ Ejecutar y desarrollar

La web es estática: HTML, CSS y JavaScript, con [Leaflet](https://leafletjs.com/) para el mapa. No requiere npm ni compilación.

```bash
git clone https://github.com/sgarcia87/voltfare.git
cd voltfare
python3 -m http.server 8000
```

Abre [localhost:8000](http://localhost:8000). El GPS necesita un contexto seguro: HTTPS o localhost, además del permiso del usuario.

### Estructura

| Archivo | Contenido |
| --- | --- |
| [index.html](index.html) | Interfaz, estilos y carga del mapa. |
| [app.js](app.js) | GPS, cálculo, almacenamiento local y recibos. |
| [test.mjs](test.mjs) | Comprobaciones de lógica con navegador y almacenamiento simulados. |
| [.nojekyll](.nojekyll) | Publicación de archivos estáticos sin procesarlos con Jekyll. |

### Pruebas

Con Node.js moderno:

```bash
node test.mjs
```

Las pruebas cubren mínimo, guardado, recuperación tras recarga simulada, reintentos, duplicados, historial corrupto, escape de texto en recibos y rutas relativas. No sustituyen pruebas visuales ni una prueba de GPS real en el Tesla.

## 🤝 Ideas, errores y mejoras

Puedes [abrir una incidencia](https://github.com/sgarcia87/voltfare/issues) o proponer cambios mediante una pull request.

Si reportas un fallo, incluye el dispositivo, navegador, pasos para reproducirlo y el mensaje que aparece. Para Tesla, añade modelo y versión de software si los conoces. Evita adjuntar recibos con datos personales o ubicaciones que no quieras publicar.

## English

**VoltFare is a browser-based GPS fare estimator for VTC and private-hire trips, with a Tesla-oriented dashboard layout.** It provides a live map, configurable distance and time rates, a minimum fare, local trip history and downloadable trip receipts.

- No account, application backend or build step required.
- Trip records stay in the current browser and are not synced across devices.
- Receipts download as HTML; print-to-PDF depends on browser support.
- GPS access in the actual Tesla browser has not yet been validated.
- Not a certified taxi meter, proof of payment or official Tesla product.

Looking for a **Tesla fare calculator**, **GPS trip cost calculator** or **browser-based taximeter-style estimator**? [Try VoltFare](https://sgarcia87.github.io/voltfare/) and review the limitations above.

---

<div align="center">

**⚡ VoltFare — una estimación clara de cada trayecto.**

[ABRIR LA WEB](https://sgarcia87.github.io/voltfare/) · [REPORTAR UN PROBLEMA](https://github.com/sgarcia87/voltfare/issues)

Creado por [Sergi Garcia · sgarcia87](https://github.com/sgarcia87)

</div>
