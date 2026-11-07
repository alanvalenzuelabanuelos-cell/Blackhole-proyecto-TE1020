# Registro de pruebas — Blackhole01, etapa 10

## Estado técnico de esta versión

- `node --check app.js` y `node --check solar.js`: sin errores de sintaxis.
- Interacción de la aplicación probada en Chromium mediante una página de ensayo con los recursos locales incrustados. La apertura directa de un servidor de prueba estuvo restringida por el entorno, pero la página incrustada sí permitió ejecutar los eventos.
- Menú `#cotizador`: vista visible. Entradas de inventario, catálogo, selector de productos, cálculo físico, evaluación económica y descarga PDF: funcionales en el ensayo automatizado.
- PDF descargado durante el ensayo: válido en PyMuPDF/Poppler y con seis páginas tamaño carta; contiene texto, cifras, presupuesto, fuentes de prueba y gráficas vectoriales.
- Comprobación visual de portada del cotizador en escritorio realizada. La revisión manual en Chrome del usuario sigue siendo recomendable.

## Caso de ensayo sintético (NO es una cotización real)

Carga ficticia para comprobación de fórmulas: diez luminarias de 20 W, cinco horas al día, cinco días por semana. Consumo `1 kWh/día`, `260 kWh/año`, potencia simultánea `200 W`.

Parámetros *inventados exclusivamente para el test*: panel ficticio 500 Wp, Vmp 41 V, Voc 50 V, Imp 12.2 A, Isc 13 A; inversor ficticio 5 kW CA/7 kW CC, MPPT 100–500 V, tensión máxima CC 550 V, 30 A por MPPT, un MPPT; HSP 5, PR 0.8. El modelo demanda `0.25 kWp` energéticos, pero la ventana MPPT del inversor ficticio exige al menos tres paneles en serie; el resultado del ensayo es `1.5 kWp` y `2,190 kWh/año` teóricos. **Esto no es recomendación de compra.**

Precios ficticios para evaluar la aritmética solamente: panel 3,000 MXN, inversor 20,000 MXN, instalación 3,500 MXN y estructura/protecciones 1,500 MXN. Inversión del ensayo: **34,000 MXN**. Tarifa 2.40 MXN/kWh, fracción aprovechable 70 %, costos operativos 500 MXN/año. Energía compensable 260 kWh/año, ahorro bruto 624 MXN/año, ahorro neto 124 MXN/año y retorno simple ≈274.2 años. La cifra demuestra por qué no se deben presentar sin revisión escenarios sobredimensionados.

**Ninguno de estos modelos, URLs de prueba o valores se encuentra precargado en la aplicación entregada.**

## Pruebas manuales recomendadas

- Abre `index.html`, verifica navegación y que los módulos 0–4 permanezcan accesibles.
- Abre Cotizador Solar. Confirma que inicialmente no haya cargas, productos, costos ni irradiación.
- Registra un equipo incompleto: debe impedir el cálculo final. Completa sus datos y días por semana: la energía diaria y anual debe actualizarse.
- Crea un panel sin URL HTTPS o con Vmp mayor que Voc: debe rechazarlo. Agrega modelos reales y comprueba la presencia de fecha, distribuidor y enlaces.
- Verifica los límites MPPT, corriente y tensión máxima del inversor; un conjunto incompatible debe rechazarse.
- Si deseas almacenamiento, usa especificaciones de un inversor híbrido y batería documentados; prueba DoD/eficiencia y revisa advertencias del modelo ideal.
- Cambia cualquier parámetro físico después de calcular: la propuesta anterior debe invalidarse hasta recalcular.
- Deja vacía tarifa o costos: la evaluación debe impedirse. Completa la información y comprueba la suma de inversión y el ahorro.
- Exporta JSON, actualiza la página, importa JSON y comprueba que se recuperen los datos. Descarga el PDF, abre sus páginas, comprueba fuente, unidades, componentes, precios y leyendas de limitaciones.
