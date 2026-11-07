# Etapa 11 · Corrección de navegación y pruebas de integración

## Problema comunicado

En el módulo 2, al pulsar «Infraestructura», «Sistemas eléctricos», «Simulador trifásico» o «Fuentes y límites», la página regresaba a Inicio.

## Causa técnica

La función `navigate()` en `app.js` solo tenía una lista explícita de identificadores para Recursos y Distribución; los cuatro identificadores `tx-*` no figuraban y el router interpretaba el destino como desconocido, activando `inicio`.

## Solución aplicada

- El router utiliza ahora `document.getElementById(hash)` y `closest('.page')` para identificar a qué módulo pertenece cualquier ancla interna.
- Abre el módulo correcto antes de desplazarlo hasta la sección de destino.
- Resalta la pestaña activa, actualiza `aria-current` y preserva la navegación lateral y la ruta de accesibilidad «Saltar al contenido».
- Se eliminó una referencia antigua que describía al Cotizador como no desarrollado.

## Verificación

- `node --check` de `app.js` y `solar.js`: correcto.
- 30 comprobaciones automáticas de integración en Chromium (HTML, CSS y JavaScript incrustados en una página de ensayo): 30/30 satisfactorias, sin excepciones JavaScript.
- Revisión individual de los cuatro botones de Transmisión: correcta.
- Navegación por anclas de Recursos y Distribución: correcta.
- Pruebas del simulador trifásico y del transformador ideal: correctas para los casos especificados.
- 15 tarjetas de clasificación, 20 fichas «¿Sabías que?», cinco pasos del Cotizador y bloqueo del PDF hasta contar con cálculos: presentes.
- Prueba de ruta directa a un subtema en pantalla móvil: correcta.
- Las pruebas fueron realizadas con una página de ensayo porque Chromium bloquea la carga directa `file://` y `localhost` en este entorno. Se recomienda la prueba manual en Chrome sobre la versión publicada.

## Pendientes de publicación definitiva

1. **Cartografía:** siguen pendientes los tres mapas geográficos interactivos verificados (centrales, sistemas de transmisión y divisiones de distribución). Los esquemas del proyecto no equivalen a mapas geográficos y no debemos inventar coordenadas ni trazados.
2. **Datos del aula y materiales:** el Cotizador requiere inventario, irradiación local verificada, fichas técnicas, precios, proveedor y fecha de consulta antes de emitir una propuesta real.
3. **Prueba tras despliegue:** verificar navegación y descarga del PDF con una URL HTTPS de GitHub Pages.
4. **Publicación:** no se ha conectado una cuenta GitHub ni publicado una URL pública durante esta etapa.

## Fuentes oficiales adicionales identificadas para cartografía

- CFE, *Programa de Ampliación y Modernización de las Redes Generales de Distribución 2023–2037*, apartado III, figura III.1 (divisiones): https://www.cfe.gob.mx/distribucion/cumplimiento/Documents/PAM%20RGD%202023-2037%20vf.pdf
- SENER, *Mapas de Infraestructura Energética y Recursos Renovables*, catálogo de mapas y bases geoespaciales: https://base.energia.gob.mx/nacei/mapas_infraestructura_energetica.aspx
- CENACE, *PRODESEN 2023–2037* (capítulos y anexos): https://www.gob.mx/cenace/acciones-y-programas/programa-de-desarrollo-del-sistema-electrico-nacional-2023-2037-344281

Los sitios anteriores son puntos de consulta oficiales. **No** se extrajeron coordenadas, divisiones poligonales ni rutas para incorporarlas a los mapas. Para completar la cartografía conforme al encargo, el usuario puede descargar y subir los documentos/datos oficiales correspondientes.
