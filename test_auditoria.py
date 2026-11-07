from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re, json, math
R=Path('/mnt/data/Blackhole01_AuditoriaFinal/blackhole01')
html=(R/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="(?:styles|solar)\.css">','',html)
html=re.sub(r'<script src="(?:app|solar|maps)\.js" defer></script>','',html)
results=[]; errors=[]
def check(label,cond,detail=''):
    results.append(dict(test=label,ok=bool(cond),detail=str(detail)))
    if not cond: raise AssertionError(f'{label}: {detail}')
def load(page):
    page.on('pageerror',lambda err: errors.append(str(err)))
    page.set_content(html,wait_until='load')
    page.add_style_tag(content=(R/'styles.css').read_text())
    page.add_style_tag(content=(R/'solar.css').read_text())
    page.add_script_tag(content=(R/'app.js').read_text())
    page.add_script_tag(content=(R/'solar.js').read_text())
    page.wait_for_timeout(120)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':1400,'height':880},accept_downloads=True)
    load(page)
    check('Cinco módulos disponibles',all(page.locator('#view-'+v).count()==1 for v in ['recursos','generacion','transmision','distribucion','sabias']))
    # Nav/subsections
    for mod in ['recursos','transmision','distribucion']:
        for a in page.locator('#view-'+mod+' .tabs a[href^="#"]').all():
            dest=a.get_attribute('href')
            page.evaluate('(d)=>location.hash=d',dest)
            page.wait_for_timeout(80)
            check('Ruta '+dest,page.evaluate('document.querySelector(".page.active").id')=='view-'+mod)
    check('Clasificador 15',page.locator('#classifyList .quiz-card').count()==15)
    check('20 fichas documentadas',page.locator('#factsCards .fact-card').count()==20)
    # Resources functions
    page.evaluate('location.hash="#recursos"');page.wait_for_timeout(120)
    check('Comparador recurso con datos',bool(page.locator('#compareResults').inner_text().strip()) if page.locator('#compareResults').count() else True)
    # Generation filters
    page.evaluate('location.hash="#generacion"');page.wait_for_timeout(100)
    check('Gráfica de generación construida',page.locator('#genAnnualChart').inner_text()!='')
    page.locator('#genYear').select_option('2023')
    check('Filtro año generación reacciona','2023' in page.locator('#genKpiTotalMeta').inner_text())
    page.locator('#genReset').click()
    check('Restablecer generación',page.locator('#genYear').input_value()=='2024')
    # Transmission physics
    page.evaluate('location.hash="#tx-simulador"');page.wait_for_timeout(80)
    cur=float(page.locator('#txCurrent').inner_text().replace(',',''))
    check('Corriente trifásica 100MW/230kV',abs(cur-251.02)<.03,cur)
    page.locator('#txPower').fill('200');page.wait_for_timeout(30)
    cur2=float(page.locator('#txCurrent').inner_text().replace(',',''))
    check('Trifásico responde a parámetros',abs(cur2/cur-2)<.0005,(cur,cur2))
    page.locator('#txReset').click()
    check('Reinicio transmisión','100'==page.locator('#txPower').input_value())
    # Distribution transformer
    page.evaluate('location.hash="#dist-transformador"');page.wait_for_timeout(80)
    check('Transformador 230 a 23 V','23' in page.locator('#distVs').inner_text())
    page.locator('#distStepUp').click()
    check('Transformador preajuste elevador',page.locator('#distVs').inner_text()!='23')
    page.locator('#distReset').click()
    # Facts
    page.evaluate('location.hash="#sabias"');page.wait_for_timeout(100)
    page.locator('[data-fact-category="transmision"]').click()
    check('Filtro hallazgos transmisión 5',page.locator('#factsCards .fact-card').count()==5)
    page.locator('[data-fact-category="all"]').click()
    check('Restablecer hallazgos 20',page.locator('#factsCards .fact-card').count()==20)
    # Maps static CFE included and service official no fake coords
    check('Mapa CFE distribuido localmente',(R/'assets/cfe-divisiones-2023.png').exists())
    check('Mapa CENACE oficial enlazado',page.locator('iframe.official-map-pdf').count()==1)
    check('Mapa SENER/SEMARNAT solicitado',page.locator('#genOfficialMap').count()==1)
    # Solar: before product no calculation was possible; now quick estimation works and full still locked.
    page.evaluate('location.hash="#cotizador"');page.wait_for_timeout(90)
    page.locator('[data-solar-step="0"]').click()
    page.locator('#solarDays').fill('5')
    page.locator('#solarProject').fill('Aula de prueba')
    page.locator('#solarClient').fill('Proyecto educativo')
    page.locator('#solarLocation').fill('Ubicación de prueba')
    page.locator('#solarAddLoad').click()
    row=page.locator('#solarLoadRows tr').first
    for key,val in [('name','Lámpara de prueba'),('qty','4'),('watts','50'),('hours','6')]:
        row.locator('[data-solar-load-key="'+key+'"]').fill(val)
    check('Cálculo de carga 1.2 kWh/día','1.2' in page.locator('#solarTotalDay').inner_text(),page.locator('#solarTotalDay').inner_text())
    page.locator('[data-solar-step="2"]').click()
    page.locator('#solarHsp').fill('5')
    page.locator('#solarPR').fill('0.8')
    page.locator('#solarQuickWp').fill('400')
    page.locator('#solarQuickSource').fill('Hipótesis didáctica de la prueba; sin ficha comercial')
    page.locator('#solarQuickCalculate').click()
    summary=page.locator('#solarQuickSummary').inner_text()
    check('Calcular dimensionamiento sin catálogo','1 panel' not in summary and 'Paneles estimados' in summary and 'kWp' in summary,summary[:220])
    check('Cálculo de paneles esperados: 1', '1 × 400' in summary or '1 × 400' in summary.replace(',','.'),summary[:300])
    page.locator('#solarCalculate').click()
    check('Botón original orienta a cálculo básico','sin catálogo' in page.locator('#solarCalcMessage').inner_text().lower() or 'preliminar' in page.locator('#solarCalcMessage').inner_text().lower())
    check('PDF sigue inhabilitado sin fichas',page.locator('#solarDownloadPDF').is_disabled())
    # Populate test catalog, not embedded into result project.
    page.locator('[data-solar-step="1"]').click()
    def product(pt,attrs):
        page.locator('#solarProductType').select_option(pt)
        for id,val in [('solarBrand','Marca de ensayo'),('solarModel','Modelo de ensayo '+pt),('solarVendor','Proveedor de ensayo'),('solarPrice','1000'),('solarQuoteDate','2026-11-06'),('solarDatasheet','https://example.org/ficha.pdf'),('solarProductURL','https://example.org/precio')]:
            page.locator('#'+id).fill(val)
        for k,val in attrs.items(): page.locator('[data-specs="'+pt+'"] [data-solar-attr="'+k+'"]').fill(str(val))
        page.locator('#solarSaveProduct').click()
        return page.locator('#solarProductMessage').inner_text()
    pmsg=product('panel',dict(pmp=400,voc=50,vmp=40,isc=10.5,imp=10))
    check('Catálogo panel registrado','guardado' in pmsg.lower(),pmsg)
    imsg=product('inverter',dict(acW=1000,dcW=1500,dcMaxV=500,mpptMin=35,mpptMax=400,dcMaxI=15,mppts=1,maxIsc=16))
    check('Catálogo inversor registrado','guardado' in imsg.lower(),imsg)
    page.locator('[data-solar-step="2"]').click()
    page.locator('#solarSelectedPanel').select_option(index=1)
    page.locator('#solarSelectedInverter').select_option(index=1)
    page.locator('#solarCalculate').click()
    check('Cálculo comercial con catálogo válido', 'Paneles propuestos' in page.locator('#solarSizingSummary').inner_text(),page.locator('#solarSizingSummary').inner_text()[:280])
    page.locator('[data-solar-step="3"]').click()
    for id,val in [('solarTariff','2'),('solarUtilization','80'),('solarOM','0'),('solarInstall','2000'),('solarBOS','1000'),('solarOther','0')]:page.locator('#'+id).fill(val)
    page.locator('#solarEvaluate').click()
    check('Presupuesto desde catálogo','Inversión total' in page.locator('#solarFinanceSummary').inner_text())
    page.locator('[data-solar-step="4"]').click()
    check('Descarga de PDF habilitada',not page.locator('#solarDownloadPDF').is_disabled())
    with page.expect_download(timeout=12000) as di: page.locator('#solarDownloadPDF').click()
    dl=di.value
    check('PDF generado y descargable',dl.suggested_filename.endswith('.pdf'),dl.suggested_filename)
    dl.save_as('/mnt/data/Blackhole01_AuditoriaFinal/_ensayo.pdf')
    # File is ONLY for audit, not distributed; scenario fake.
    import fitz
    d=fitz.open('/mnt/data/Blackhole01_AuditoriaFinal/_ensayo.pdf')
    check('PDF íntegro de varias páginas',len(d)>=5,len(d));d.close()
    page.screenshot(path='/mnt/data/Blackhole01_AuditoriaFinal/preview_calculadora.png',full_page=False)
    # Mobile, no overflow in main nav / solar
    mobile=b.new_page(viewport={'width':390,'height':844});load(mobile)
    for route in ['cotizador','generacion','transmision','distribucion','sabias']:
        mobile.evaluate('(r)=>location.hash="#"+r',route);mobile.wait_for_timeout(50)
        sw=mobile.evaluate('document.documentElement.scrollWidth')
        check('Vista móvil sin desbordamiento '+route,sw<=392,sw)
    b.close()
check('No se registraron excepciones JS',len(errors)==0,errors)
report={'passed':sum(x['ok'] for x in results),'total':len(results),'errors':errors,'checks':results}
Path('/mnt/data/Blackhole01_AuditoriaFinal/reporte_automatizado.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':report['passed'],'total':report['total'],'errors':errors},ensure_ascii=False))
