# Blackhole01 — Auditoría técnica final (06/11/2026)

Proyecto TE1020 — Atlas Eléctrico de México + Cotizador Fotovoltaico. Identidad Blackhole01 / Photon Labs.

## Resultado

**50/50 verificaciones automatizadas superadas** usando Chromium y pruebas Playwright de DOM inyectado (ver `reporte_automatizado.json` en el paquete raíz). Las 50 pruebas cubren navegación de subtemas, filtros de generación y hallazgos, cálculos de transmisión y transformador ideal, calculadora solar nueva sin catálogo, ruta solar completa con equipos **EXCLUSIVAMENTE DE ENSAYO**, presupuesto, PDF y ausencia de desbordamiento horizontal en móvil. La prueba no certifica equipos eléctricos ni mapas remotos.

No se detectaron excepciones JavaScript en esos escenarios. Los mapas externos no se probaron por acceso restringido a Internet del navegador de ensayo. Por seguridad, el escenario con productos inventados de ensayo **no está guardado en la entrega**; tampoco se incluye el PDF de ensayo.

## Hallazgos y correcciones

| ID | Componente | Hallazgo | Acción | Estado |
|---|---|---|---|---|
| AUD-01 | Cotizador / Diseño | El botón `Calcular propuesta` exigía un panel y un inversor comerciales antes de generar cualquier resultado de dimensionamiento. Bloqueaba al estudiante sin catálogo. | Cálculo independiente con inventario + HSP + PR + potencia de panel proporcionada; se mantienen separadas cotización y validación comercial. | **Corregido y probado** |
| AUD-02 | Cotizador | Resultados de la estimación podían quedar desactualizados tras cambiar datos. | Invalidación del resultado cuando cambian cargas, HSP, PR, potencia u origen del dato. | **Corregido** |
| AUD-03 | Distribución móvil | Tabla de infraestructura y columnas CSS Grid aumentaban el ancho de la página (536 px en pantalla de 390 px). | Columnas `minmax(0,1fr)`, `min-width:0` y tabla con desplazamiento propio. | **Corregido y probado** |
| AUD-04 | Transmisión | Enlaces de subtemas regresaban al inicio en versión previa. | Se conserva corrección de enrutador que detecta la página padre. | **Regresión probada** |
| AUD-05 | Fuentes | Fichas PRODESEN y CFE 2022 enlazaban solo a portales genéricos. | Se adjuntan los PDF proporcionados por el estudiante para abrirlos directamente desde el sitio. | **Corregido** |
| AUD-06 | Distribución | No había imagen de límites regionales de las 16 divisiones. | Recorte fiel de la figura original CFE, Informe Anual 2023, p. impresa 132. | **Figura oficial incorporada** |
| AUD-07 | Transmisión | Existía solo esquema textual de sistemas, sin mapa de regiones. | Visor del PDF oficial CENACE Diagramas Unifilares 2020–2025, lámina 2; enlace alternativo. | **Mapa referencial incorporado; trazado pendiente** |
| AUD-08 | Generación | Directorio por estados, sin mapa geográfico. | Visor de capas institucionales remotas de SEMARNAT, con acceso a fuente SENER y mensajes de falla. | **Mapa externo incorporado; coordenadas por ficha pendientes** |
| AUD-09 | Datos generación | Las 11 filas por tecnología de 2023 suman 150,461 GWh y el total publicado es 150,462 GWh. | Se conserva el total publicado y se explica la discrepancia de 1 GWh. | **Discrepancia documentada** |
| AUD-10 | Datos transmisión | Informe 2023: 110,559 km; comparación reproducida en Informe 2024: 110,558 km. | Se preservan ambos valores según procedencia. | **Discrepancia documentada** |
| AUD-11 | Cartografía | Capas geográficas de 2016–2025 no implican información física vigente en 2026. | Todos los mapas muestran institución, año y límites de cobertura. No se inventan coordenadas. | **Advertencia incorporada** |

## Auditoría por módulo

### 0. Recursos energéticos

- **Comprobado**: existen 15 tarjetas de clasificación, diagramas por tecnología, comparador y preguntas de reflexión. La clasificación fósil/nuclear/renovable se mantiene independiente de la categoría regulatoria de generación limpia.
- **Dato verificable**: PRODESEN 2023–2037, capítulo 4, p. 59, generación nacional 2022 de 340,713 GWh; 31.2 % limpia / 68.8 % fósil según metodología del informe.
- **Límite**: no hay factores comparables de emisiones de ciclo de vida; no deben completarse a partir de estimaciones inventadas. No hay serie nacional homogénea 2023–2024 desde el capítulo recibido.

### 1. Generación

- **Comprobado**: filtros por año, tecnología, estado y nombre, gráficos 2022–2024, tabla 2023–2024 y directorio de 16 centrales por entidad.
- **Datos verificables**: generación bruta CFE 2024 = 154,059 GWh, 2023 = 150,462 GWh según CFE 2024 p. 26; 2022 = 141,342 GWh según CFE 2023, p. 15; las 11 tecnologías de 2023 suman 1 GWh menos que el total publicado, diferencia ya advertida.
- **Mapa**: capa institucional temática en línea de SEMARNAT respaldada por la página de mapas de SENER; ofrece emplazamientos reales del conjunto fuente, **pero no se han equiparado sus puntos con las 16 fichas ni certificado su vigencia en 2024**. Por tanto el requisito estricto de 15 marcadores individuales verificados y filtrables sigue parcialmente pendiente.
- **Límite**: ciertas capacidades de centrales son valores de antes de modernización y otras cifras son de 2023; están etiquetadas por periodo. No constituyen un inventario oficial de capacidad vigente en 2026.

### 2. Transmisión

- **Comprobado**: filtros y datos de CFE 2022–2024, cálculo de corriente trifásica y pérdidas `I=P/(√3 V cosφ)`, `Pp=3I²R`, reactividad del simulador y reinicio.
- **Mapa**: regiones de CENACE 2020–2025 enlazadas a la lámina original, incluidos SIN, Baja California, BCS y Mulegé. **No incluye digitalización del trazado real de toda la RNT**. Esta limitación aparece en el módulo.
- **Límite físico**: sistema trifásico equilibrado, resistencia equivalente por fase definida por el usuario, pérdidas simplificadas. No debe interpretarse como cálculo de operación real.

### 3. Distribución

- **Comprobado**: SAIDI, SAIFI, pérdidas con y sin AT por separado; tabla histórica de infraestructura; simulador de transformador ideal y preajustes; accesibilidad móvil comprobada.
- **Mapa**: imagen original de las 16 divisiones de CFE, Informe Anual 2023, p. 132, integrada localmente con leyenda. **No es GeoJSON ni límites vectoriales seleccionables**.
- **Límite**: el transformador es monofásico ideal de corriente alterna en estado estacionario; no considera pérdidas ni protecciones.

### 4. ¿Sabías que?

- **Comprobado**: 20 fichas, 5 por categoría, filtro por tema, selección de cuatro gráficas y línea temporal 2013, 2014, 2024 y 2025.
- **Fuentes**: CFE 2022–2024, PRODESEN 2023–2037, DOF 2013–2025. Los datos históricos de CFE no se sustituyen por valores nacionales.
- **Límite**: la línea del tiempo establece cambios legislativos, no demuestra relaciones causales económicas por sí sola.

### Cotizador Solar (integrado)

- **Comprobado**: carga 1.2 kWh/día en prueba, HSP=5 h/día, PR=0.8, Wp=400, estimación de 1 panel y 0.4 kWp. Son **datos de prueba no precargados**.
- **Comprobado**: ruta de catálogo con especificaciones aportadas únicamente durante el ensayo, compatibilidad preliminar a STC, evaluación económica y PDF abierto correctamente.
- **Límite**: la estimación preliminar no produce cotización validada ni PDF sin panel e inversor con marca/modelo, fuente comercial y precio. El cálculo detallado aún requiere compatibilidad del fabricante, temperaturas, interconexión y supervisión profesional. No se dan instrucciones de instalación.

## Mapas oficiales y procedencia

1. CFE, Informe Anual 2023, p. impresa 132: imagen original de 16 divisiones extraída del PDF que aportaste. Embebida localmente en `assets/cfe-divisiones-2023.png`.
2. CENACE, Diagramas Unifilares del Sistema Eléctrico Nacional 2020–2025, lámina «Regiones del Sistema Eléctrico Nacional»: `https://www.cenace.gob.mx/Docs/10_PLANEACION/DiagramasUnifilares/Mod%20Gral%20Planeaci%C3%B3n%202020-2025%20Diagramas%20Unifilares%20RNT%20y%20RGD%20del%20MEM.pdf`. Mapas regionales históricos; el visor requiere Internet y que el servidor permita incluir el PDF.
3. SENER, Mapas de infraestructura energética (portal histórico, última actualización 2016): `https://base.energia.gob.mx/nacei/mapas_infraestructura_energetica.aspx`; capa de centrales oficiales del servicio ArcGIS de SEMARNAT: `https://geomatica.semarnat.gob.mx/arcgis/rest/services/APLICACIONES/energia_electrica/MapServer`. Capa remota; su disponibilidad no se pudo verificar desde el navegador de pruebas restringido.
4. CFE, Programa de Ampliación y Modernización de las RGD 2024–2038: `https://www.cfe.gob.mx/distribucion/cumplimiento/Documents/PAM%20RGD%202024-2038%20VF.pdf`, con mapa de las 16 divisiones (fuente complementaria consultada en web; no incluida en el paquete).

## Qué falta para afirmar «mapas terminados» al 100 %

- Obtener y conservar shapefiles/GeoJSON institucionales con fecha de corte y campos de centrales, 15 instalaciones homologadas con coordenadas verificadas y al menos cuatro tecnologías.
- Un modelo geoespacial de líneas reales de transmisión, con tramos, tensiones y fecha de actualización.
- Polígonos vectoriales de las 16 divisiones si se exige clic y filtro dentro del mapa, no únicamente el mapa oficial estático.

No se inventaron líneas, distancias, puntos geográficos ni factores de emisión. **Se considera terminada la auditoría funcional; la certificación de los tres mapas geoespaciales interactivos aún está incompleta**.

## Publicación

Preparado como sitio estático con `index.html`, scripts, estilos, recursos y documentos PDF locales. No se publicó en una cuenta personal ni en GitHub Pages. La publicación deberá ejecutarse por el responsable de la cuenta siguiendo `GUIA_PUBLICACION.md`, verificando primero el despliegue de fuentes externas y la visualización móvil.
