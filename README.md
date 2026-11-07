# Blackhole01 · Atlas Eléctrico y Cotizador Solar

Proyecto académico TE1020 · Etapa 5.

## Archivos
- `index.html`: página principal de la aplicación integrada.
- `styles.css`: diseño responsivo de Blackhole01.
- `app.js`: navegación y actividades funcionales del módulo 0.
- `landing.html`: conserva la landing original de la etapa 1.

## Estado del proyecto
**Funcional:** módulo 0 Recursos energéticos: explicación de tres familias, clasificador de 15 tarjetas con retroalimentación, seis diagramas de conversión con pasos seleccionables, matriz nacional limpia/fósil de 2022, comparador cualitativo de 8 recursos, cinco indicadores de conciencia energética y cinco preguntas de interpretación.

**Pendientes:** módulos de Generación, Transmisión, Distribución, ¿Sabías que? y el simulador/cotizador fotovoltaico. Se muestran accesos visibles para preservar la integración, pero no se presentan como funcionales.

## Datos y fuentes
- PRODESEN 2023–2037, capítulo 4, p. impresa 59: generación nacional 2022 de 340,713 GWh, 31.2% energías limpias, 68.8% fuentes fósiles.
- PRODESEN 2023–2037, capítulo 4, p. impresa 52: capacidad nacional 2022 de 92,503 MW.
- Las fuentes se documentan en la sección «Fuentes y método» del sitio.
- Las descripciones del comparador son cualitativas. No se incluyen factores ambientales no verificados.

## Publicar en GitHub Pages
1. Crear un repositorio público (por ejemplo `Blackhole01`).
2. Subir los cuatro archivos de este directorio a la raíz del repositorio (sin introducir una carpeta superior adicional).
3. En `Settings > Pages`, elegir `Deploy from a branch`, rama `main` y directorio `/ (root)`.
4. La dirección será del formato `https://USUARIO.github.io/Blackhole01/` cuando GitHub complete la publicación.

## Validación
- Sintaxis JavaScript verificada con `node --check app.js`.
- La prueba interactiva en navegador automatizado no pudo completarse por una restricción de acceso del entorno. Verificar manualmente las interacciones después de abrir `index.html` o publicar en Pages.

## Nota
No constituye un proyecto eléctrico autorizado para construcción. No presenta cotizaciones ni ahorros ficticios.
