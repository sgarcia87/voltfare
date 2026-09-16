<div align="center">

# ⚡ VoltFare

### Tu trayecto. Tu tarifa. Todo en el navegador.

**Estimador de tarifas VTC con GPS, pensado para la pantalla del Tesla.**  
Mapa en directo · Recuperación GPS · Uso sin internet · Historial y recibos

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
2. Con el vehículo detenido, pulsa **Configurar precios** y configura tus importes. El nombre de empresa y la matrícula son opcionales.
3. Pulsa **Centrar mi posición** y concede el permiso de ubicación.
4. Pulsa **Empezar viaje**. Mantén la pestaña visible.
5. Al terminar, pulsa **Terminar y guardar** y confirma el guardado. Se abrirá el recibo.
6. Recupera los servicios anteriores desde **Ver viajes y recibos**.

**Configura y manipula la aplicación con el vehículo detenido.** Mantén la pestaña visible durante el viaje. Se guarda una copia local cada segundo; al volver a abrir se recupera en pausa, sin cobrar automáticamente el intervalo con la página cerrada.

### Controles fáciles de entender

La pantalla principal se adapta a la altura disponible para mostrar importe, mapa y controles sin desplazamiento en los tamaños habituales de escritorio y móvil. **Ayuda** explica cada botón; **Desglose y ajustes** abre los conceptos del importe y las opciones de corrección. En pantallas muy pequeñas o con ampliación de texto puede ser necesario desplazarse. Los controles principales son **Empezar viaje** y **Terminar y guardar**. Durante el viaje, el primero cambia a **Pausar sin cobrar** y después a **Continuar viaje**. **Cobrar espera** aparece cuando el viaje está activo; la corrección de distancia queda en **Desglose y ajustes → Corregir los kilómetros**.

El mapa va dibujando una línea verde con el recorrido medido. **Ver todo el recorrido** encuadra el viaje; **Centrar mi posición** vuelve a seguir tu ubicación. Al mover el mapa manualmente se detiene el seguimiento hasta pulsar ese botón. Se necesitan al menos dos posiciones válidas con movimiento suficiente para ver una línea. Los puntos imprecisos o saltos imposibles se descartan.

## 💶 Cómo se calcula el importe

El cálculo suma:

```text
Subtotal = importe inicial
         + kilómetros facturables × precio por km
         + minutos de viaje × precio por minuto
         + minutos en espera manual × precio de espera
         + suplementos

Total = máximo entre el subtotal y el precio mínimo
```

Cada concepto monetario se redondea a céntimos antes de sumar. El ajuste al mínimo aparece como una línea separada.

- **Mínimo de 0 €:** no se aplica un suelo de precio.
- **Tiempo activado:** se cobra durante el viaje. En espera manual se sustituye por la tarifa de espera, sin sumar ambas tarifas.
- **Tiempo desactivado:** el tiempo ordinario no añade importe. La espera manual sí utiliza su propia tarifa; configúrala a 0 para que sea gratuita.
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
- El mapa del recorrido se muestra durante la sesión; el trazado no se guarda en el historial, pero sí en la copia local del viaje activo para recuperarlo tras recargar. Sí se conservan los totales medidos, estimados y ajustados.
- El recibo es un **resumen orientativo**, no una factura ni un justificante de pago.

Si no se puede guardar, el trayecto permanece pendiente para reintentarlo. **No cierres la pestaña mientras haya un guardado pendiente.**

El mapa sí requiere servicios externos: Leaflet se carga desde unpkg.com y las teselas desde OpenStreetMap. Estos proveedores reciben las solicitudes de recursos; las teselas solicitadas corresponden al área visualizada. La interfaz, el cálculo, el historial y los recibos pueden abrirse sin internet tras una primera visita con conexión y cuando aparezca «Aplicación disponible sin internet». El mapa y sus recursos externos pueden no estar disponibles. No se descargan mapas offline. La caché puede ser eliminada por el navegador; sin primera visita no hay apertura offline.

## 📍 GPS y compatibilidad

| Entorno | Qué esperar |
| --- | --- |
| **Pantalla Tesla** | Interfaz pensada para uso horizontal. Acceso al GPS y comportamiento del navegador pendientes de validación en el vehículo. |
| **Móvil u ordenador** | Necesita un navegador compatible y permiso de ubicación. La precisión depende del dispositivo y de la señal. |
| **GitHub Pages** | Sirve la aplicación por HTTPS, sin backend ni claves API propias. |
| **Segundo plano o pantalla suspendida** | El navegador puede interrumpir las actualizaciones. Mantén visible la pestaña. |

VoltFare usa la ubicación que proporciona el navegador; **no se conecta a la API de Tesla ni al odómetro del vehículo**. La distancia se aproxima a partir de posiciones sucesivas, sin ajuste a la red de carreteras.

### Sin internet y sin GPS son situaciones distintas

| Situación | Comportamiento |
| --- | --- |
| Sin internet, con posición válida | El cálculo y el guardado local continúan. El mapa puede dejar de cargar. |
| Posición ausente o imprecisa | Continúa el tiempo según tarifa. La distancia queda pendiente. No se activa la espera automáticamente. |
| Corte breve con posiciones fiables | Se puede añadir una aproximación en línea recta, identificada como distancia estimada. |
| Corte largo, salto imposible o datos insuficientes | No se reconstruye el recorrido. Revisa el total y, si procede, ajústalo con el cuentakilómetros. |
| Recarga o cierre de la página | Se ofrece el viaje guardado en pausa. No se incluyen automáticamente tiempo ni distancia del intervalo cerrado. |

**Hora GPS:** se admiten marcas de tiempo de época en milisegundos y se convierten formatos reconocibles en segundos, microsegundos o nanosegundos. También se admite un reloj relativo a la página cuando coincide con su origen temporal y es reciente. La conversión conserva la antigüedad: no sustituye la hora recibida por la hora actual. Fechas desconocidas o desfasadas siguen sin sumar kilómetros. **Desglose y ajustes → Datos GPS** permite consultar el valor recibido, su interpretación y la precisión, sin mostrar coordenadas.

**Criterios de recuperación:** una interrupción detectada o más de 15 segundos entre posiciones se considera un corte. Solo se estima si entre la última posición válida y la nueva pasan como máximo 60 segundos, ambas precisiones son de 25 m o mejores, la distancia es de hasta 2 km y la velocidad implícita no supera 180 km/h. Los pequeños movimientos dentro del umbral de ruido no añaden kilómetros. Las posiciones ordinarias con precisión peor de 50 m o antigüedad superior a 15 segundos se descartan.

Estos umbrales son filtros prácticos, no una garantía de exactitud. Una línea recta puede omitir curvas y desvíos; una falsa posición coherente también puede pasar los filtros. No hay acceso al cuentakilómetros del coche, reconstrucción por carretera ni extrapolación indefinida de velocidad. Las estimaciones se incluyen una sola vez en la distancia y quedan desglosadas en el recibo. El mapa dibuja el recorrido GPS en verde y las aproximaciones de cortes breves en ámbar discontinuo. Los cortes sin estimación y las pausas dejan la línea interrumpida.

**Ajuste manual:** pausa el viaje y pulsa **Corregir distancia total**. Introduce la distancia total, por ejemplo la diferencia entre lecturas del cuentakilómetros, y un motivo. Este valor sustituye el total actual; no se añade a él. Si reanudas, se suman los kilómetros posteriores. El recibo conserva el último ajuste, su motivo, el total anterior y los acumulados GPS y estimados.

**Espera manual:** pulsa **Cobrar espera** cuando corresponda. Durante ese modo se detiene la acumulación de distancia y se aplica únicamente la tarifa de espera por minuto. Pulsa **Volver al viaje** antes de circular. **Pausar sin cobrar** detiene tanto tiempo como distancia y termina la espera. Perder GPS nunca activa este modo.

**Recuperación local:** el viaje activo se guarda cada segundo y al pausar o ajustar. Puede perderse hasta el último intervalo no guardado si el navegador se cierra abruptamente. Al recuperar, revisa los kilómetros antes de reanudar o finalizar. Si falla el almacenamiento se avisa; no cierres la página hasta resolverlo. Usa una sola pestaña para el viaje activo: la recuperación no coordina varias pestañas o dispositivos.

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
| [app.js](app.js) | GPS, estimaciones, espera, recuperación local y recibos. |
| [sw.js](sw.js) | Caché de la interfaz para apertura sin internet. |
| [test.mjs](test.mjs) | Comprobaciones de lógica con navegador y almacenamiento simulados. |
| [.nojekyll](.nojekyll) | Publicación de archivos estáticos sin procesarlos con Jekyll. |

### Pruebas

Con Node.js moderno:

```bash
node test.mjs
```

Las pruebas cubren cálculo y mínimos, espera sin doble cobro, cortes GPS, posiciones inválidas, ajuste manual, recuperación del viaje, reintentos, duplicados y escape de recibos. No sustituyen pruebas visuales ni una prueba de GPS real en el Tesla.

## 🤝 Ideas, errores y mejoras

Puedes [abrir una incidencia](https://github.com/sgarcia87/voltfare/issues) o proponer cambios mediante una pull request.

Si reportas un fallo, incluye el dispositivo, navegador, pasos para reproducirlo y el mensaje que aparece. Para Tesla, añade modelo y versión de software si los conoces. Evita adjuntar recibos con datos personales o ubicaciones que no quieras publicar.

## English

**VoltFare is a browser-based GPS fare estimator for VTC and private-hire trips, with a Tesla-oriented dashboard layout.** It provides a live map, configurable distance and time rates, a minimum fare, local trip history and downloadable trip receipts.

- No account, application backend or build step required.
- Offline app shell after a successful first online visit; maps still require internet.
- Short GPS gaps can add explicitly labelled straight-line estimates; longer gaps need review.
- Manual distance correction, separate waiting rates and paused trip recovery after reload.
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



