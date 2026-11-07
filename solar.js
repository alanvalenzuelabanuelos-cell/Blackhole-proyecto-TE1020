/* Blackhole01 Solar — cálculo académico en cliente. Sin productos ni datos de consumo inventados. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('solarTitle')) return;
  const KEY = 'blackhole01_solar_v1';
  const INPUTS = [
    'solarProject','solarClient','solarDays','solarLocation',
    'solarHsp','solarPR','solarMode','solarBatteryMode','solarAutonomy','solarDoD','solarBatteryEff',
    'solarSelectedPanel','solarSelectedInverter','solarSelectedBattery',
    'solarQuickWp','solarQuickSource','solarTariff','solarUtilization','solarOM','solarInstall','solarBOS','solarOther'
  ];
  const physical = new Set([...INPUTS.slice(0,14),'solarQuickWp','solarQuickSource']);
  const formatter = new Intl.NumberFormat('es-MX',{maximumFractionDigits:2});
  const moneyFormatter = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2});
  const fmt = (v,d=2) => Number.isFinite(v) ? new Intl.NumberFormat('es-MX',{maximumFractionDigits:d}).format(v) : 'Dato no disponible';
  const mxn = v => Number.isFinite(v) ? moneyFormatter.format(v) : 'Dato no disponible';
  const make = (tag,text,cls) => {const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  // Referencias técnicas verificadas en fichas de fabricante. Sin precios, proveedor,
  // disponibilidad ni autorización de instalación. No se guardan como cotizaciones.
  const REFERENCE_PRODUCTS = [
    {id:'ref_cs_535',type:'panel',brand:'Canadian Solar',model:'HiKu6 CS6W-535MS',
      technicalReference:true,price:null,vendor:'',date:'',url:'',
      datasheet:'https://static.csisolar.com/wp-content/uploads/2024/07/23145733/CS-Datasheet-HiKu6_CS6W-MS_v2.9_EN.pdf',
      attrs:{pmp:535,voc:49.0,vmp:41.1,isc:13.85,imp:13.02,vocTc:-0.26}},
    {id:'ref_cs_550',type:'panel',brand:'Canadian Solar',model:'HiKu6 CS6W-550MS',
      technicalReference:true,price:null,vendor:'',date:'',url:'',
      datasheet:'https://static.csisolar.com/wp-content/uploads/2024/07/23145733/CS-Datasheet-HiKu6_CS6W-MS_v2.9_EN.pdf',
      attrs:{pmp:550,voc:49.6,vmp:41.7,isc:14.0,imp:13.20,vocTc:-0.26}},
    {id:'ref_growatt_3000',type:'inverter',brand:'Growatt',model:'MIN 3000TL-X (conexión a red)',
      technicalReference:true,price:null,vendor:'',date:'',url:'',
      datasheet:'https://latam.growatt.com/upload/file/MIN_2500-6000TL-X_Hoja_de_datos_MX.pdf',
      attrs:{acW:3000,dcW:4200,dcMaxV:500,mpptMin:80,mpptMax:500,dcMaxI:13.5,maxIsc:16.9,mppts:2,stringsPerMppt:1,startV:100}},
    {id:'ref_growatt_5000',type:'inverter',brand:'Growatt',model:'MIN 5000TL-X (conexión a red)',
      technicalReference:true,price:null,vendor:'',date:'',url:'',
      datasheet:'https://latam.growatt.com/upload/file/MIN_2500-6000TL-X_Hoja_de_datos_MX.pdf',
      attrs:{acW:5000,dcW:7000,dcMaxV:550,mpptMin:80,mpptMax:550,dcMaxI:13.5,maxIsc:16.9,mppts:2,stringsPerMppt:1,startV:100}}
  ];
  const initial = {fields:{},loads:[],products:[],selectedStep:0};
  function findProduct(type,id){return state.products.find(p=>p.id===id&&p.type===type)||REFERENCE_PRODUCTS.find(p=>p.id===id&&p.type===type)||null;}

  let state = {...initial,fields:{},loads:[],products:[]};
  let sizing=null,finance=null,editingProduct=null;
  const setMessage = (id,text,ok=false) => {const e=$(id);e.textContent=text||'';e.classList.toggle('ok',!!ok);};
  function fromStorage(){
    try {const raw=localStorage.getItem(KEY);if(!raw)return;
      const v=JSON.parse(raw);
      if(!v||typeof v!=='object')return;
      state.fields=v.fields&&typeof v.fields==='object'?v.fields:{};
      state.loads=Array.isArray(v.loads)?v.loads.slice(0,300).filter(x=>x&&typeof x==='object'):[];
      state.products=Array.isArray(v.products)?v.products.slice(0,150).filter(x=>x&&['panel','inverter','battery'].includes(x.type)):[];
      state.selectedStep=Number.isInteger(v.selectedStep)&&v.selectedStep>=0&&v.selectedStep<=4?v.selectedStep:0;
    }catch(e){setMessage('solarCalcMessage','No se pudieron recuperar los datos guardados: puedes continuar y exportar JSON.');}
  }
  function persist(){
    try {localStorage.setItem(KEY,JSON.stringify(state));}catch(e){
      setMessage('solarReportMessage','El navegador no permitió guardar localmente. Exporta tus datos JSON antes de cerrar.');
    }
  }
  function num(raw,label,{min=0,max=Infinity,integer=false,positive=false}={}){
    if(raw==null || String(raw).trim()==='')throw Error('Falta: '+label+'.');
    const v=Number(raw);
    if(!Number.isFinite(v)||v<min||v>max||(positive&&v<=0)||(integer&&!Number.isSafeInteger(v)))throw Error('Dato inválido en '+label+'.');
    return v;
  }
  const get = id => $(id).value;
  function safeURL(v,label){let u;try{u=new URL(v)}catch{throw Error('Revisa el enlace de '+label+'.')}if(u.protocol!=='https:')throw Error('El enlace de '+label+' debe comenzar con https://.');return u.href;}
  function invalidate(full=true){if(full)sizing=null;finance=null;
    $('solarKpiArray').textContent=full?'Dato pendiente':$('solarKpiArray').textContent;
    $('solarKpiBudget').textContent='Dato pendiente';$('solarKpiStatus').textContent='Sin calcular';$('solarDownloadPDF').disabled=true;
    if(full)$('solarSizingSummary').replaceChildren(make('p','Actualizaste datos del diseño. Ejecuta «Calcular propuesta» para validar los resultados.','solar-empty'));
    if(full)$('solarQuickSummary').replaceChildren(make('p','Cambiaste los datos del dimensionamiento; pulsa «Calcular dimensionamiento preliminar» para actualizarlo.','solar-empty'));
    $('solarFinanceSummary').replaceChildren(make('p','Actualiza la evaluación económica con los datos vigentes.','solar-empty'));
    $('solarReportPreview').replaceChildren(make('p','Pendiente: calcula el diseño y la evaluación para habilitar el PDF.','solar-empty'));
  }
  function invalidateQuick(){
    $('solarQuickSummary').replaceChildren(make('p','Cambiaste la potencia u origen: pulsa «Calcular dimensionamiento preliminar» para actualizar el estimador.','solar-empty'));
    setMessage('solarQuickMessage','Actualiza la estimación preliminar cuando lo necesites.');
  }
  function setStep(step){
    state.selectedStep=Math.min(4,Math.max(0,step));
    document.querySelectorAll('[data-solar-step]').forEach(btn=>{const on=Number(btn.dataset.solarStep)===state.selectedStep;btn.classList.toggle('active',on);if(on)btn.setAttribute('aria-current','step');else btn.removeAttribute('aria-current');});
    document.querySelectorAll('[data-solar-screen]').forEach(el=>el.hidden=Number(el.dataset.solarScreen)!==state.selectedStep);
    $('solarPrev').disabled=state.selectedStep===0;$('solarNext').disabled=state.selectedStep===4;
    $('solarPosition').textContent='Paso '+(state.selectedStep+1)+' de 5';
    persist();
  }
  function loadRow(row,index){
    const tr=make('tr');
    const defs=[['name','text','Ej. lámpara'],['qty','number','Unidades'],['watts','number','Potencia W'],['hours','number','Horas al día']];
    defs.forEach(([k,type,placeholder])=>{const td=make('td');const inp=document.createElement('input');inp.type=type;inp.placeholder=placeholder;inp.value=row[k]||'';inp.dataset.solarLoadKey=k;inp.setAttribute('aria-label',placeholder+' del equipo '+(index+1));if(type==='number'){inp.min='0';inp.step=k==='qty'?'1':'any'}inp.addEventListener('input',()=>{row[k]=inp.value;persist();renderLoadTotals();invalidate(true);});td.append(inp);tr.append(td);});
    const total=make('td','—');total.dataset.loadEnergy=String(index);tr.append(total);
    const action=make('td');const del=make('button','Quitar','solar-delete');del.type='button';del.setAttribute('aria-label','Eliminar equipo '+(index+1));del.addEventListener('click',()=>{state.loads.splice(index,1);persist();renderLoadRows();invalidate(true);});action.append(del);tr.append(action);
    return tr;
  }
  function renderLoadRows(){const tbody=$('solarLoadRows');tbody.replaceChildren();state.loads.forEach((row,i)=>tbody.append(loadRow(row,i)));
    if(!state.loads.length){const tr=make('tr'),td=make('td','Agrega los equipos del aula para comenzar.','solar-empty-cell');td.colSpan=6;tr.append(td);tbody.append(tr)}renderLoadTotals();}
  function loadSummary(strict=true){
    if(!state.loads.length)throw Error('Agrega al menos un equipo al inventario del aula.');
    const loads=state.loads.map((r,i)=>{
      const name=String(r.name||'').trim();if(!name)throw Error('Falta el nombre del equipo '+(i+1)+'.');
      const qty=num(r.qty,'cantidad del equipo '+name,{min:1,max:100000,integer:true});
      const watts=num(r.watts,'potencia del equipo '+name,{positive:true,max:1e7});
      const hours=num(r.hours,'horas del equipo '+name,{positive:true,max:24});
      return {name,qty,watts,hours,kwday:qty*watts*hours/1000,peakW:qty*watts};
    });
    const days=num(get('solarDays'),'días de uso por semana',{min:1,max:7,integer:true});
    const day=loads.reduce((a,b)=>a+b.kwday,0),peak=loads.reduce((a,b)=>a+b.peakW,0),year=day*days*52;
    if(!Number.isFinite(day)||day>1e9||!Number.isFinite(peak)||peak>1e9)throw Error('La suma de cargas está fuera del rango de simulación.');
    return {loads,days,day,peak,year};
  }
  function renderLoadTotals(){
    const cells=document.querySelectorAll('[data-load-energy]');
    cells.forEach((cell,i)=>{const row=state.loads[i];const qty=Number(row.qty),watts=Number(row.watts),hours=Number(row.hours);cell.textContent=row.qty!==''&&row.watts!==''&&row.hours!==''&&qty>0&&watts>0&&hours>0&&hours<=24?fmt(qty*watts*hours/1000,3):'—'});
    try{const t=loadSummary();$('solarTotalW').textContent=fmt(t.peak,2)+' W';$('solarTotalDay').textContent=fmt(t.day,3)+' kWh/día';$('solarTotalYear').textContent=fmt(t.year,2)+' kWh/año';$('solarKpiConsumption').textContent=fmt(t.day,2)+' kWh/día';}
    catch{$('solarTotalW').textContent='— W';$('solarTotalDay').textContent='— kWh/día';$('solarTotalYear').textContent='— kWh/año';$('solarKpiConsumption').textContent='Dato pendiente';}
  }
  const types={panel:'Panel FV',inverter:'Inversor',battery:'Batería'};
  function updateProductFields(){
    const type=get('solarProductType');
    document.querySelectorAll('[data-specs]').forEach(x=>x.hidden=x.dataset.specs!==type);
  }
  function productAttrs(type){const scope=document.querySelector('[data-specs="'+type+'"]'),result={};
    scope.querySelectorAll('[data-solar-attr]').forEach(input=>{result[input.dataset.solarAttr]=input.value.trim();});return result;}
  function validateProduct(formProduct){
    const p={...formProduct};
    if(!['panel','inverter','battery'].includes(p.type))throw Error('Tipo de producto desconocido.');
    p.brand=String(p.brand||'').trim();p.model=String(p.model||'').trim();p.vendor=String(p.vendor||'').trim();
    if(!p.brand||!p.model||!p.vendor)throw Error('La marca, el modelo y el proveedor son obligatorios.');
    p.price=num(p.price,'precio del producto',{positive:true,max:1e11});
    p.datasheet=safeURL(p.datasheet,'la ficha técnica');p.url=safeURL(p.url,'la cotización');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date||'')||!Number.isFinite(new Date(p.date+'T00:00:00').getTime()))throw Error('Ingresa una fecha de consulta válida.');
    const a=p.attrs||{},o={};
    if(p.type==='panel'){
      for(const k of ['pmp','voc','vmp','isc','imp'])o[k]=num(a[k],k,{positive:true,max:1e6});
      if(o.voc<=o.vmp||o.isc<o.imp)throw Error('Panel: Voc debe superar Vmp e Isc debe ser mayor o igual a Imp.');
      if(Math.abs(o.vmp*o.imp-o.pmp)/o.pmp>0.10)throw Error('Panel: Pmp no coincide con Vmp × Imp (diferencia superior al 10 %).');
      if(String(a.vocTc||'').trim()!=='')o.vocTc=num(a.vocTc,'coeficiente de Voc',{min:-10,max:10});
    }else if(p.type==='inverter'){
      for(const k of ['acW','dcW','dcMaxV','mpptMin','mpptMax','dcMaxI'])o[k]=num(a[k],k,{positive:true,max:1e8});
      o.mppts=num(a.mppts,'número de MPPT',{min:1,max:16,integer:true});
      if(o.mpptMin>=o.mpptMax||o.mpptMax>o.dcMaxV)throw Error('Inversor: verificar MPPT mínimo < máximo y MPPT máximo ≤ tensión CC absoluta máxima.');
      if(String(a.maxIsc||'').trim()!=='')o.maxIsc=num(a.maxIsc,'Isc máxima',{positive:true,max:1e7});
      if(String(a.stringsPerMppt||'').trim()!=='')o.stringsPerMppt=num(a.stringsPerMppt,'cadenas por MPPT',{min:1,max:30,integer:true});
      if(String(a.startV||'').trim()!=='')o.startV=num(a.startV,'voltaje de arranque',{positive:true,max:1e6});
      const battkeys=['battMinV','battMaxV','battMaxA'];const some=battkeys.some(k=>String(a[k]||'').trim()!=='');
      if(some){for(const k of battkeys)o[k]=num(a[k],k,{positive:true,max:1e8});if(o.battMinV>o.battMaxV)throw Error('Inversor: rango de voltajes de batería inválido.');}
    }else{
      for(const k of ['volt','ah','maxA'])o[k]=num(a[k],k,{positive:true,max:1e7});
      o.chem=String(a.chem||'').trim();
      if(!o.chem)throw Error('Indica la tecnología o química de la batería.');
    }
    p.attrs=o;return p;
  }
  function updateProductOptions(){
    for(const [type,id] of [['panel','solarSelectedPanel'],['inverter','solarSelectedInverter'],['battery','solarSelectedBattery']]){
      const e=$(id),old=state.fields[id]||e.value;
      e.replaceChildren(new Option('Selecciona '+types[type].toLowerCase(),''));
      const refs=REFERENCE_PRODUCTS.filter(x=>x.type===type);
      if(refs.length){
        const group=document.createElement('optgroup');group.label='Referencias técnicas del fabricante · precio pendiente';
        refs.forEach(p=>group.append(new Option(p.brand+' '+p.model,p.id)));
        e.append(group);
      }
      const user=state.products.filter(x=>x.type===type);
      if(user.length){
        const group=document.createElement('optgroup');group.label='Productos registrados con precio y proveedor';
        user.forEach(p=>group.append(new Option(p.brand+' '+p.model,p.id)));
        e.append(group);
      }
      e.value=findProduct(type,old)?old:'';
      state.fields[id]=e.value;
    }
    persist();
    renderTechnicalSelection();
  }
  function renderTechnicalSelection(){
    const target=$('solarSpecsPreview');if(!target)return;
    target.replaceChildren();
    const panel=findProduct('panel',get('solarSelectedPanel'));
    const inverter=findProduct('inverter',get('solarSelectedInverter'));
    for(const [label,p] of [['Panel',panel],['Inversor',inverter]]){
      const row=make('div',undefined,'solar-tech-row');
      row.append(make('strong',label+': '+(p?p.brand+' '+p.model:'sin seleccionar')));
      if(p){
        row.append(make('span',p.technicalReference?'Ficha oficial · precio pendiente':'Registrado con precio: '+mxn(p.price)));
        if(p.datasheet){const a=make('a','Ficha del fabricante ↗');a.href=p.datasheet;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}
      }
      target.append(row);
    }
    if(get('solarBatteryMode')==='include'){
      target.append(make('p','Con baterías: hace falta una batería documentada y un inversor híbrido compatible; los modelos de referencia son solo de conexión a red.','solar-warning-note'));
    }
  }
  function copyReferenceToForm(ref){
    clearProductForm();
    $('solarProductType').value=ref.type;updateProductFields();
    $('solarBrand').value=ref.brand;$('solarModel').value=ref.model.replace(' (conexión a red)','');
    $('solarDatasheet').value=ref.datasheet;
    const wrap=document.querySelector('[data-specs="'+ref.type+'"]');
    wrap.querySelectorAll('[data-solar-attr]').forEach(el=>el.value=ref.attrs[el.dataset.solarAttr]??'');
    setStep(1);
    setMessage('solarProductMessage','Especificaciones transferidas desde ficha de fabricante. Completa proveedor, precio real, fecha y enlace de cotización para guardarlas.');
    $('solarCatalogForm').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderReferenceCatalog(){
    const root=$('solarReferenceList');if(!root)return;root.replaceChildren();
    for(const p of REFERENCE_PRODUCTS){
      const card=make('article',undefined,'solar-reference-item');
      card.append(make('strong',p.brand+' '+p.model));
      card.append(make('small',p.type==='panel'?p.attrs.pmp+' Wp · '+p.attrs.vmp+' Vmp':fmt(p.attrs.acW/1000)+' kW CA · '+p.attrs.mppts+' MPPT'));
      const link=make('a','Abrir ficha del fabricante ↗');link.href=p.datasheet;link.target='_blank';link.rel='noopener noreferrer';card.append(link);
      card.append(make('span','Precio y disponibilidad: no verificados','solar-unpriced'));
      const btn=make('button','Completar precio y proveedor');btn.type='button';btn.className='solar-small-btn';btn.addEventListener('click',()=>copyReferenceToForm(p));card.append(btn);
      root.append(card);
    }
  }
  function renderCatalog(){
    updateProductOptions();
    const root=$('solarCatalogList');root.replaceChildren();$('solarCatalogCount').textContent=state.products.length+' producto(s) con precio';
    renderReferenceCatalog();
    if(!state.products.length)root.append(make('p','No hay equipos con precio registrado. Puedes calcular con las referencias de fabricante, pero para presupuestar debes completar precios y proveedor.','solar-empty'));
    for(const p of state.products){
      const card=make('article',undefined,'solar-item');
      const top=make('div',undefined,'solar-item-top');top.append(make('span',types[p.type],'solar-item-type'),make('strong',mxn(p.price)));
      card.append(top,make('h4',p.brand+' '+p.model));
      let detail=p.type==='panel'?fmt(p.attrs.pmp)+' Wp · Vmp '+fmt(p.attrs.vmp)+' V · Voc '+fmt(p.attrs.voc)+' V':p.type==='inverter'?fmt(p.attrs.acW/1000)+' kW CA · MPPT '+fmt(p.attrs.mpptMin)+'–'+fmt(p.attrs.mpptMax)+' V':fmt(p.attrs.volt)+' V · '+fmt(p.attrs.ah)+' Ah';
      card.append(make('p',detail),make('p','Proveedor: '+p.vendor+' · Consulta: '+p.date));
      const links=make('div',undefined,'solar-item-links');for(const [label,url] of [['Ficha técnica ↗',p.datasheet],['Precio ↗',p.url]]){const a=make('a',label);a.href=url;a.rel='noopener noreferrer';a.target='_blank';links.append(a)}card.append(links);
      const actions=make('div',undefined,'solar-item-actions');const edit=make('button','Editar');edit.type='button';edit.addEventListener('click',()=>{editingProduct=p.id;$('solarProductType').value=p.type;updateProductFields();$('solarBrand').value=p.brand;$('solarModel').value=p.model;$('solarVendor').value=p.vendor;$('solarPrice').value=p.price;$('solarQuoteDate').value=p.date;$('solarDatasheet').value=p.datasheet;$('solarProductURL').value=p.url;document.querySelector('[data-specs="'+p.type+'"]').querySelectorAll('[data-solar-attr]').forEach(el=>el.value=p.attrs[el.dataset.solarAttr]??'');$('solarSaveProduct').textContent='Actualizar componente';$('solarCancelEdit').hidden=false;setStep(1);$('solarCatalogForm').scrollIntoView({behavior:'smooth',block:'start'});});
      const remove=make('button','Eliminar');remove.type='button';remove.addEventListener('click',()=>{if(!window.confirm('¿Eliminar '+p.brand+' '+p.model+' del catálogo?'))return;state.products=state.products.filter(x=>x.id!==p.id);persist();renderCatalog();invalidate(true);});actions.append(edit,remove);card.append(actions);root.append(card);
    }
  }
  function clearProductForm(){editingProduct=null;$('solarCatalogForm').reset();$('solarProductType').value='panel';updateProductFields();$('solarSaveProduct').textContent='Guardar componente';$('solarCancelEdit').hidden=true;}
  function onSaveProduct(e){e.preventDefault();try{
    const type=get('solarProductType');
    const p=validateProduct({id:editingProduct||('bhs_'+Date.now()+'_'+Math.random().toString(36).slice(2,9)),type,brand:get('solarBrand'),model:get('solarModel'),vendor:get('solarVendor'),date:get('solarQuoteDate'),price:get('solarPrice'),datasheet:get('solarDatasheet'),url:get('solarProductURL'),attrs:productAttrs(type)});
    if(editingProduct){const i=state.products.findIndex(x=>x.id===editingProduct);if(i<0)throw Error('No se encontró el producto para editar.');state.products[i]=p;}
    else{if(state.products.length>=150)throw Error('Límite de 150 productos.');state.products.push(p)}
    state.fields[type==='panel'?'solarSelectedPanel':type==='inverter'?'solarSelectedInverter':'solarSelectedBattery']=p.id;
    persist();clearProductForm();renderCatalog();invalidate(true);setMessage('solarProductMessage','Producto guardado con precio y fuente; quedó seleccionado en Diseño. Verifica vigencia y disponibilidad.',true);
  }catch(err){setMessage('solarProductMessage',err.message);}}
  function sizingInputs(){
    const load=loadSummary();const hsp=num(get('solarHsp'),'horas solares pico',{min:0.1,max:12});const pr=num(get('solarPR'),'factor de desempeño PR',{min:0.1,max:1});
    const panel=findProduct('panel',get('solarSelectedPanel'));
    const inverter=findProduct('inverter',get('solarSelectedInverter'));
    if(!panel||!inverter)throw Error('Selecciona un panel y un inversor en los desplegables: ya existen modelos con ficha oficial y sin precio.');
    const mode=get('solarMode'),bmode=get('solarBatteryMode');
    if(mode==='standalone'&&bmode==='none')throw Error('El modo autónomo requiere baterías en este modelo.');
    let battery=null,autonomy=0,dod=0,batteryEff=0;
    if(bmode==='include'){
      battery=state.products.find(p=>p.type==='battery'&&p.id===get('solarSelectedBattery'));
      if(!battery)throw Error('Para «Con baterías» debes añadir una batería verificada y un inversor híbrido compatible. Las referencias Growatt MIN TL-X de esta versión son inversores de red sin batería. Para el diseño a red usa «Sin baterías».');
      autonomy=num(get('solarAutonomy'),'autonomía',{min:0.1,max:15});
      dod=num(get('solarDoD'),'profundidad de descarga DoD',{min:0.1,max:1});
      batteryEff=num(get('solarBatteryEff'),'eficiencia de batería',{min:0.1,max:1});
      if(!Number.isFinite(inverter.attrs.battMinV)||!Number.isFinite(inverter.attrs.battMaxV)||!Number.isFinite(inverter.attrs.battMaxA))throw Error('El inversor debe incluir rango y corriente de batería verificados para cotizar almacenamiento.');
    }
    return {load,hsp,pr,panel,inverter,mode,bmode,battery,autonomy,dod,batteryEff};
  }
  function chooseArray(target,panel,inverter){
    const a=panel.attrs,b=inverter.attrs;
    const first=Math.max(1,Math.ceil(b.mpptMin/a.vmp-1e-12),Number.isFinite(b.startV)?Math.ceil(b.startV/a.voc-1e-12):1);
    const last=Math.min(300,Math.floor(b.mpptMax/a.vmp+1e-12),Math.floor((b.dcMaxV-1e-6)/a.voc),Math.floor(b.dcW/a.pmp));
    const maxEach=Math.floor(Math.min(b.dcMaxI/a.imp,Number.isFinite(b.maxIsc)?b.maxIsc/a.isc:Infinity,Number.isFinite(b.stringsPerMppt)?b.stringsPerMppt:Infinity)+1e-10);
    let best=null;
    for(let s=first;s<=last;s++){
      const parallel=Math.ceil(target/s),stringsEach=Math.ceil(parallel/b.mppts);
      if(stringsEach>maxEach||parallel<1||parallel>1000)continue;
      const n=s*parallel,power=n*a.pmp;
      if(power>b.dcW+1e-8)continue;
      const item={series:s,parallel,n,dcW:power,mpptV:s*a.vmp,voc:s*a.voc,eachMpptStrings:stringsEach,inputA:stringsEach*a.imp,inputIsc:stringsEach*a.isc};
      if(!best||n<best.n||(n===best.n&&parallel<best.parallel))best=item;
    }
    return best;
  }
  function chooseBattery(load,battery,inverter,autonomy,dod,eff){
    const a=battery.attrs,b=inverter.attrs;const requiredKwh=load.day*autonomy/(dod*eff);let best=null;
    for(let s=1;s<=32;s++){
      const voltage=s*a.volt;if(voltage<b.battMinV||voltage>b.battMaxV)continue;
      const needed=Math.ceil(requiredKwh/(s*a.volt*a.ah/1000));
      const p=Math.max(1,needed),n=s*p;
      const requiredIdealA=load.peak/voltage;
      const requiredBatteryCapability=requiredIdealA/p;
      if(requiredIdealA>b.battMaxA||requiredBatteryCapability>a.maxA)continue;
      const item={series:s,parallel:p,n,voltage,ah:p*a.ah,nominalKwh:n*a.volt*a.ah/1000,requiredKwh,idealCurrentA:requiredIdealA};
      if(!best||n<best.n||(n===best.n&&s<best.series))best=item;
    }
    return best;
  }
  function computeSizing(){const x=sizingInputs();
    const kwRequired=x.load.day/(x.hsp*x.pr);
    const requiredPanels=Math.ceil(kwRequired*1000/x.panel.attrs.pmp);
    if(requiredPanels<1||requiredPanels>10000)throw Error('La cantidad de módulos requerida rebasa el alcance de este simulador (10,000 paneles).');
    const array=chooseArray(requiredPanels,x.panel,x.inverter);
    if(!array)throw Error('No existe configuración FV uniforme compatible con el inversor seleccionado bajo los límites ingresados. Cambia a un equipo verificado compatible; no fuerces la conexión.');
    if(x.mode==='standalone'&&x.inverter.attrs.acW<x.load.peak)throw Error('El inversor autónomo seleccionado no cubre la demanda simultánea teórica del aula.');
    let storage=null;
    if(x.bmode==='include'){
      storage=chooseBattery(x.load,x.battery,x.inverter,x.autonomy,x.dod,x.batteryEff);
      if(!storage)throw Error('No hay una combinación serie/paralelo de baterías compatible con el rango y la corriente continua declarados del inversor.');
      if(storage.n>5000)throw Error('La cantidad de baterías supera el alcance académico.');
    }
    const dayGeneration=array.dcW/1000*x.hsp*x.pr;
    const annualGeneration=dayGeneration*365;
    const checks=[
      {kind:'ok',text:'Arreglo propuesto a STC: '+array.series+' panel(es) en serie × '+array.parallel+' rama(s) paralelas = '+array.n+' paneles.'},
      {kind:'ok',text:'Tensión Vmp del string: '+fmt(array.mpptV)+' V, dentro de MPPT '+fmt(x.inverter.attrs.mpptMin)+'–'+fmt(x.inverter.attrs.mpptMax)+' V.'},
      {kind:'ok',text:'Voc a STC: '+fmt(array.voc)+' V, menor que el máximo CC de '+fmt(x.inverter.attrs.dcMaxV)+' V.'},
      {kind:'ok',text:'Corriente máxima nominal estimada por MPPT: '+fmt(array.inputA)+' A ≤ '+fmt(x.inverter.attrs.dcMaxI)+' A.'}
    ];
    if(Number.isFinite(x.inverter.attrs.startV))checks.push({kind:'ok',text:'Tensión de arranque del inversor: '+fmt(x.inverter.attrs.startV)+' V; se verifica Voc a STC en el modelo, pero el arranque bajo irradiación real requiere evaluación.'});
    if(Number.isFinite(x.inverter.attrs.maxIsc))checks.push({kind:'ok',text:'Isc a STC por MPPT: '+fmt(array.inputIsc)+' A ≤ '+fmt(x.inverter.attrs.maxIsc)+' A.'});
    else checks.push({kind:'warn',text:'El inversor no tiene Isc admisible registrada; verificación de cortocircuito pendiente.'});
    if(dayGeneration>x.load.day*1.5)checks.push({kind:'warn',text:'La producción estimada del arreglo mínimo compatible supera la demanda diaria del aula. No se ha optimizado el tamaño; revisa otras capacidades de inversor, costos, espacio y perfil horario.'});
    if(x.inverter.attrs.acW<x.load.peak&&x.mode==='grid')checks.push({kind:'warn',text:'Potencia CA del inversor menor que la demanda máxima del aula; en red, la diferencia dependerá del suministro externo.'});
    checks.push({kind:'warn',text:'Valores de tensión a STC, sin corrección de Voc a temperatura mínima: verificación térmica pendiente.'});
    checks.push({kind:'warn',text:'No se han validado conexiones físicas, cableado, fusibles, regulaciones de interconexión ni compatibilidad BMS.'});
    if(storage)checks.push({kind:'warn',text:'Baterías: '+storage.series+' en serie × '+storage.parallel+' ramas; modelo nominal simplificado, exige revisión del fabricante/BMS y temperatura.'});
    return {...x,kwRequired,requiredPanels,array,storage,dayGeneration,annualGeneration,checks};
  }
  function statGrid(items){const grid=make('div',undefined,'solar-stat-grid');items.forEach(([label,value])=>{const d=make('div');d.append(make('small',label),make('strong',value));grid.append(d)});return grid;}
  function printCheck(checks,parent){const box=make('div',undefined,'solar-checks');checks.forEach(c=>box.append(make('p',c.text,c.kind==='ok'?'':'warn')));parent.append(box);}
  function renderSizing(result){const root=$('solarSizingSummary');root.replaceChildren(make('h3','Propuesta de dimensionamiento · cálculo preliminar'));
    root.append(statGrid([['Potencia FV requerida',fmt(result.kwRequired,3)+' kWp'],['Potencia FV del arreglo',fmt(result.array.dcW/1000,3)+' kWp'],['Paneles propuestos',result.array.n+' unidades'],['Serie × paralelo',result.array.series+' × '+result.array.parallel],['Generación teórica/día',fmt(result.dayGeneration,2)+' kWh'],['Generación teórica/año',fmt(result.annualGeneration,1)+' kWh']]));
    root.append(make('p','Potencia pico teórica del aula: '+fmt(result.load.peak,1)+' W; inversor: '+fmt(result.inverter.attrs.acW)+' W CA. La generación usa HSP y PR introducidos; no modela sombras ni producción horaria.','solar-caption'));
    if(result.storage)root.append(statGrid([['Baterías',result.storage.n+' unidades'],['Capacidad nominal',fmt(result.storage.nominalKwh,2)+' kWh'],['Voltaje nominal del banco',fmt(result.storage.voltage)+' V']]));
    printCheck(result.checks,root);
    if(result.panel.technicalReference||result.inverter.technicalReference){root.append(make('p','Diseño calculado con ficha de fabricante, sin precios ni comprobación de disponibilidad. Para obtener presupuesto y PDF registra las cotizaciones en el paso Catálogo.','solar-price-pending'));}
    $('solarKpiArray').textContent=fmt(result.array.dcW/1000,2)+' kWp';
    $('solarKpiStatus').textContent='Diseño preliminar';
  }

  // Auditoría final: cálculo de diseño básico separado de la cotización verificable.
  // No requiere fichas técnicas, pero tampoco emite combinaciones eléctricas ni precios.
  function calculateQuick(){
    const root=$('solarQuickSummary');
    try {
      const l=loadSummary();
      const hsp=num(get('solarHsp'),'horas solares pico (HSP)',{min:0.1,max:12});
      const pr=num(get('solarPR'),'factor de desempeño PR',{min:0.1,max:1});
      const wp=num(get('solarQuickWp'),'potencia nominal de un panel (Wp)',{positive:true,max:5000});
      const src=get('solarQuickSource').trim();
      if(!src)throw Error('Indica si la potencia de panel es un supuesto o proviene de una ficha técnica.');
      const demand=l.day;
      const kwp=demand/(hsp*pr);
      const panels=Math.ceil(kwp*1000/wp);
      if(panels<1||panels>10000||!Number.isFinite(panels))throw Error('El resultado supera el alcance académico del estimador.');
      const peakKw=panels*wp/1000;
      const generation=peakKw*hsp*pr;
      const annual=generation*365;
      root.replaceChildren(make('h3','Dimensionamiento preliminar · no es cotización'));
      root.append(statGrid([
        ['Consumo diario',fmt(demand,3)+' kWh/día'],
        ['Potencia FV mínima',fmt(kwp,3)+' kWp'],
        ['Paneles estimados',String(panels)+' × '+fmt(wp,1)+' Wp'],
        ['Potencia resultante',fmt(peakKw,3)+' kWp'],
        ['Generación estimada/día',fmt(generation,2)+' kWh'],
        ['Generación estimada/año',fmt(annual,1)+' kWh']
      ]));
      const expl=make('p','Datos proporcionados: HSP '+fmt(hsp)+' h/día; PR '+fmt(pr)+'; origen potencia: '+src+'. Ecuaciones: kWp = kWh/día ÷ (HSP × PR); paneles = techo(1000 × kWp ÷ Wp). El cálculo es una hipótesis de producción, no verifica el inversor, temperaturas, sombras, equipos reales ni horarios de consumo.','solar-caption');
      root.append(expl);
      setMessage('solarQuickMessage','Cálculo preliminar realizado. Para obtener precios y PDF, registra productos reales y ejecuta «Calcular propuesta».',true);
      if(!sizing){$('solarKpiArray').textContent=fmt(peakKw,2)+' kWp (prev.)';$('solarKpiStatus').textContent='Estimación sin cotizar';}
      return {kwp,panels,generation,annual};
    }catch(e){root.replaceChildren(make('p',e.message,'solar-empty'));setMessage('solarQuickMessage',e.message);return null;}
  }
  function onCalculate(){
    try{sizing=computeSizing();finance=null;renderSizing(sizing);
    setMessage('solarCalcMessage','Diseño calculado con especificaciones técnicas. Para presupuestar, registra precios comprobables de los modelos seleccionados.',true);
    $('solarFinanceSummary').replaceChildren(make('p','Completa la tarifa y los costos para obtener la evaluación económica.','solar-empty'));
    $('solarReportPreview').replaceChildren(make('p','Falta terminar la evaluación económica para descargar el reporte.','solar-empty'));
    $('solarDownloadPDF').disabled=true;$('solarKpiBudget').textContent='Dato pendiente';
  }catch(e){sizing=null;finance=null;invalidate(true);setMessage('solarCalcMessage',e.message);$('solarSizingSummary').replaceChildren(make('p',e.message,'solar-empty'));}}
  function computeFinance(){if(!sizing)throw Error('Primero calcula el diseño en el paso 3.');
    for(const product of [sizing.panel,sizing.inverter,...(sizing.storage?[sizing.battery]:[])]){
      if(!Number.isFinite(product.price)||product.price<=0)throw Error('Falta el precio verificado de '+product.brand+' '+product.model+'. Ve a Catálogo, usa «Completar precio» y vuelve a seleccionar ese producto con cotización.');
    }
    const tariff=num(get('solarTariff'),'tarifa en MXN/kWh',{positive:true,max:1e6}),util=num(get('solarUtilization'),'energía FV aprovechable',{min:0,max:100}),om=num(get('solarOM'),'operación anual',{min:0,max:1e12}),install=num(get('solarInstall'),'costo de instalación',{min:0,max:1e12}),bos=num(get('solarBOS'),'materiales, protecciones y estructura',{min:0,max:1e12}),other=num(get('solarOther'),'otros costos',{min:0,max:1e12});
    const modulesCost=sizing.array.n*sizing.panel.price;
    const inverterCost=sizing.inverter.price;
    const batteriesCost=sizing.storage?sizing.storage.n*sizing.battery.price:0;
    const costs=[['Paneles solares',modulesCost],['Inversor',inverterCost],['Baterías',batteriesCost],['Instalación',install],['Estructura y protecciones',bos],['Otros costos',other]];
    const total=costs.reduce((a,b)=>a+b[1],0);if(total<=0||total>1e14)throw Error('Presupuesto fuera de rango.');
    const usableProduction=sizing.annualGeneration*(util/100);
    const offsetKwh=Math.min(sizing.load.year,usableProduction);
    const grossAnnual=offsetKwh*tariff;
    const netAnnual=grossAnnual-om;
    const payback=netAnnual>0?total/netAnnual:null;
    return {tariff,util,om,install,bos,other,costs,total,usableProduction,offsetKwh,grossAnnual,netAnnual,payback};
  }
  function moneyList(root,rows){const list=make('div',undefined,'solar-money-list');for(const [k,v] of rows){const item=make('div');item.append(make('span',k),make('strong',mxn(v)));list.append(item)}root.append(list);}
  function renderFinance(f){const root=$('solarFinanceSummary');root.replaceChildren(make('h3','Presupuesto preliminar · MXN'));
    moneyList(root,[...f.costs,['Inversión total',f.total]]);
    root.append(statGrid([['Energía compensable (estimada)',fmt(f.offsetKwh,1)+' kWh/año'],['Ahorro bruto teórico',mxn(f.grossAnnual)+'/año'],['Ahorro neto teórico',mxn(f.netAnnual)+'/año'],['Retorno simple',f.payback===null?'No recuperable bajo supuestos':fmt(f.payback,1)+' años']]));
    root.append(make('p','El supuesto '+fmt(f.util)+' % de energía FV aprovechable lo introdujo el usuario. El ahorro teórico se limita al consumo anual; no garantiza compensación, créditos ni tarifa futura.','solar-caption'));
    $('solarKpiBudget').textContent=mxn(f.total);$('solarKpiStatus').textContent='Cotización preliminar';
  }
  function renderReport(){
    const root=$('solarReportPreview');root.replaceChildren();
    if(!sizing||!finance){root.append(make('p','Completa los cálculos de diseño y presupuesto.','solar-empty'));$('solarDownloadPDF').disabled=true;return;}
    const title=make('h3','Propuesta académica · '+(get('solarProject').trim()||'Aula sin nombre'));root.append(title);
    root.append(make('p',(get('solarClient').trim()||'Cliente no especificado')+' · '+(get('solarLocation').trim()||'Ubicación pendiente')+' · Photon Labs (escenario académico)'));
    root.append(statGrid([['Consumo anual del aula',fmt(sizing.load.year)+' kWh'],['Potencia del arreglo',fmt(sizing.array.dcW/1000,2)+' kWp'],['Inversión preliminar',mxn(finance.total)],['Ahorro anual teórico',mxn(finance.netAnnual)]]));
    const p=make('p','La propuesta mostrará inventario, paneles '+sizing.panel.brand+' '+sizing.panel.model+', inversor '+sizing.inverter.brand+' '+sizing.inverter.model+', '+(sizing.storage?'baterías verificadas':'sin baterías')+', precios registrados, cálculos y limitaciones.');root.append(p);
    $('solarDownloadPDF').disabled=false;
  }
  function onEvaluate(){try{finance=computeFinance();renderFinance(finance);renderReport();setMessage('solarFinanceMessage','Presupuesto calculado a partir de las entradas documentadas. Verifica condiciones comerciales.',true);}catch(e){finance=null;$('solarKpiBudget').textContent='Dato pendiente';$('solarKpiStatus').textContent='Diseño preliminar';$('solarFinanceSummary').replaceChildren(make('p',e.message,'solar-empty'));$('solarDownloadPDF').disabled=true;setMessage('solarFinanceMessage',e.message);}}
  function loadFields(){for(const id of INPUTS){const el=$(id);if(Object.prototype.hasOwnProperty.call(state.fields,id))el.value=String(state.fields[id]);}}
  function attachFields(){INPUTS.forEach(id=>{const el=$(id);el.addEventListener('input',()=>{state.fields[id]=el.value;persist();if(id==='solarQuickWp'||id==='solarQuickSource')invalidateQuick();else if(physical.has(id))invalidate(true);else invalidate(false);if(id==='solarDays')renderLoadTotals();if(id==='solarBatteryMode'||id==='solarMode')showBatteryFields();});el.addEventListener('change',()=>{state.fields[id]=el.value;persist();});});}
  function showBatteryFields(){const battery=get('solarBatteryMode')==='include';$('solarBatteryFields').hidden=!battery;}
  function exportJSON(){const blob=new Blob([JSON.stringify({version:1,fields:state.fields,loads:state.loads,products:state.products},null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=make('a');a.href=url;a.download='blackhole01-solar-datos.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);setMessage('solarReportMessage','Datos de trabajo exportados. Conserva el archivo como respaldo.',true);}
  function importJSON(file){if(!file)return; if(file.size>2_000_000){setMessage('solarReportMessage','Archivo demasiado grande (máximo 2 MB).');return;}
    const reader=new FileReader();reader.onload=()=>{try{const v=JSON.parse(String(reader.result));if(v.version!==1||!Array.isArray(v.loads)||!Array.isArray(v.products)||!v.fields||typeof v.fields!=='object')throw Error('Formato JSON de Blackhole01 no reconocido.');
      const products=v.products.map(p=>validateProduct(p));if(products.length>150||v.loads.length>300)throw Error('Archivo demasiado grande.');
      if(!v.loads.every(x=>x&&['name','qty','watts','hours'].every(k=>typeof x[k]==='string'||typeof x[k]==='number')))throw Error('Inventario inválido.');
      state.fields={};for(const id of INPUTS)if(Object.prototype.hasOwnProperty.call(v.fields,id))state.fields[id]=String(v.fields[id]).slice(0,300);
      state.loads=v.loads;state.products=products;persist();loadFields();renderLoadRows();renderCatalog();showBatteryFields();invalidate(true);setMessage('solarReportMessage','Datos importados. Revisa las fuentes antes de calcular.',true);
    }catch(e){setMessage('solarReportMessage',e.message);}};reader.readAsText(file);
  }
  // Motor PDF local: PDF vectorial multipágina en tamaño carta, sin CDNs ni servicios externos.
  function pdfSanitize(value){return String(value??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2022\u2023]/g,'-').replace(/[^\x20-\x7E\xA0-\xFF\n]/g,'?');}
  function pdfEscape(value){return pdfSanitize(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\n/g,' ');}
  function pdfWriter(){
    const w=612,h=792;let pages=[],page=null,offset=0;
    const rgb=hex=>{const c=hex.replace('#','');return[0,2,4].map(i=>(parseInt(c.slice(i,i+2),16)/255).toFixed(3)).join(' ')};
    function create(){page={ops:[],y:0};pages.push(page);return page;}
    function rect(x,y,width,height,color){page.ops.push(rgb(color)+' rg '+x.toFixed(2)+' '+(h-y-height).toFixed(2)+' '+width.toFixed(2)+' '+height.toFixed(2)+' re f');}
    function line(x,y,x2,y2,color='#cbd5e1',th=1){page.ops.push(rgb(color)+' RG '+th+' w '+x+' '+(h-y)+' m '+x2+' '+(h-y2)+' l S');}
    function txt(t,x,y,size=10,bold=false,color='#15233d'){
      page.ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+rgb(color)+' rg 1 0 0 1 '+x.toFixed(2)+' '+(h-y).toFixed(2)+' Tm ('+pdfEscape(t)+') Tj ET');}
    const charsPerLine=(width,size)=>Math.max(12,Math.floor(width/(size*.53)));
    function para(text,x,y,maxWidth=500,size=10,leading=16,color='#455875'){
      let words=pdfSanitize(text).split(/\s+/),lineWords=[],cur=0,limit=charsPerLine(maxWidth,size);
      for(const word of words){if((lineWords.join(' ')+' '+word).trim().length>limit && lineWords.length){txt(lineWords.join(' '),x,y+cur*leading,size,false,color);cur++;lineWords=[];}if(word.length>limit){const chunks=word.match(new RegExp('.{1,'+limit+'}','g'))||[word];for(let i=0;i<chunks.length-1;i++){txt(chunks[i],x,y+cur*leading,size,false,color);cur++;}lineWords=[chunks[chunks.length-1]];}else lineWords.push(word);}
      if(lineWords.length){txt(lineWords.join(' '),x,y+cur*leading,size,false,color);cur++;}return y+cur*leading;
    }
    function common(title,no){create();rect(0,0,w,12,'#3b82f6');rect(0,12,w,6,'#a855f7');txt('BLACKHOLE01  /  PHOTON LABS',44,45,10,true,'#214d99');txt(title,44,86,22,true,'#0a0a23');line(44,101,568,101,'#dde7f4');line(44,749,568,749,'#dde7f4');txt('Propuesta académica preliminar - no válida para construcción ni oferta definitiva.',44,766,8,false,'#566781');txt('Página '+no,525,766,8,false,'#566781');}
    function labelValue(label,value,x,y,width=247){rect(x,y,width,62,'#edf4ff');txt(label,x+13,y+20,9,false,'#506684');const display=String(value);txt(display.length>27?display.slice(0,27):display,x+13,y+45,15,true,'#183766');}
    function tableHeader(headers,x,y,widths){let xx=x;headers.forEach((text,i)=>{rect(xx,y,widths[i],26,'#1e3b68');txt(text,xx+7,y+18,9,true,'#ffffff');xx+=widths[i]});return y+26;}
    function tableRow(cells,x,y,widths,index){let xx=x;cells.forEach((v,i)=>{rect(xx,y,widths[i],27,index%2?'#f5f8fc':'#eaf1fa');txt(String(v).slice(0,Math.floor(widths[i]/5.3)),xx+7,y+18,9,false,'#1c2d47');xx+=widths[i]});return y+27;}
    function finish(){
      const objs=[];const obj=o=>{objs.push(o);return objs.length};
      const catalog=obj('<< /Type /Catalog /Pages 2 0 R >>');
      const pagesObj=obj('');
      const fontRegular=obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const fontBold=obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const refs=[];
      pages.forEach(p=>{const stream=p.ops.join('\n')+'\n';const content=obj('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');const pg=obj('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+fontRegular+' 0 R /F2 '+fontBold+' 0 R >> >> /Contents '+content+' 0 R >>');refs.push(pg+' 0 R');});
      objs[pagesObj-1]='<< /Type /Pages /Kids ['+refs.join(' ')+'] /Count '+pages.length+' >>';
      let data='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',pos=[0];for(let i=0;i<objs.length;i++){pos.push(data.length);data+=(i+1)+' 0 obj\n'+objs[i]+'\nendobj\n';}
      const xref=data.length;data+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';for(let i=1;i<pos.length;i++)data+=String(pos[i]).padStart(10,'0')+' 00000 n \n';data+='trailer\n<< /Size '+(objs.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
      const bytes=new Uint8Array(data.length);for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i)&255;
      return new Blob([bytes],{type:'application/pdf'});
    }
    return {create,common,rect,txt,line,para,labelValue,tableHeader,tableRow,finish};
  }
  function makePDF(){if(!sizing||!finance)throw Error('Primero calcula el diseño y la evaluación.');
    const pdf=pdfWriter();const data=sizing,econ=finance;
    const name=(get('solarProject').trim()||'Proyecto solar de aula').slice(0,66),client=(get('solarClient').trim()||'Cliente sin especificar').slice(0,70),place=(get('solarLocation').trim()||'Ubicación sin especificar').slice(0,70);
    const date=new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
    pdf.create();pdf.rect(0,0,612,792,'#0a0a23');pdf.rect(0,0,612,13,'#3b82f6');pdf.rect(0,13,612,6,'#a855f7');pdf.txt('B L A C K H O L E 0 1',52,100,15,true,'#22d3ee');pdf.txt('PHOTON LABS  /  TE1020',52,124,10,false,'#c0cef4');pdf.txt('PROPUESTA',52,229,33,true,'#ffffff');pdf.txt('FOTOVOLTAICA',52,268,33,true,'#ffffff');pdf.rect(52,298,110,5,'#22d3ee');pdf.para(name,52,342,505,16,23,'#e8edff');pdf.txt('Cliente: '+client,52,413,11,false,'#c7d8fa');pdf.txt('Sitio: '+place,52,435,11,false,'#c7d8fa');pdf.txt('Fecha: '+date,52,457,11,false,'#c7d8fa');pdf.rect(52,519,506,151,'#17264a');pdf.txt('RESUMEN PRELIMINAR',72,547,11,true,'#22d3ee');pdf.txt('Arreglo solar: '+fmt(data.array.dcW/1000,2)+' kWp  |  '+data.array.n+' módulos',72,586,13,true,'#ffffff');pdf.txt('Inversión estimada: '+mxn(econ.total),72,614,13,true,'#ffffff');pdf.txt('Ahorro neto teórico anual: '+mxn(econ.netAnnual),72,642,11,false,'#d6e4ff');pdf.para('Documento académico. Todos los costos y productos fueron registrados por el usuario; la operación no ha sido certificada para instalación real.',52,714,505,9,14,'#cbd7ec');
    pdf.common('Resumen de consumo',2);
    pdf.labelValue('Consumo por día de uso',fmt(data.load.day,3)+' kWh',44,126);pdf.labelValue('Consumo anual estimado',fmt(data.load.year,2)+' kWh',309,126);
    pdf.labelValue('Demanda simultánea teórica',fmt(data.load.peak,2)+' W',44,202);pdf.labelValue('Días de uso por semana',String(data.load.days),309,202);
    pdf.txt('Inventario de cargas',44,314,14,true);
    let y=328; y=pdf.tableHeader(['Equipo','Cantidad','Potencia','Horas','kWh/día'],44,y,[199,62,91,63,109]);
    const loadList=data.load.loads;
    for(let i=0;i<Math.min(loadList.length,12);i++){const r=loadList[i];y=pdf.tableRow([r.name,r.qty,fmt(r.watts,1)+' W',fmt(r.hours,1),fmt(r.kwday,3)],44,y,[199,62,91,63,109],i);}
    if(loadList.length>12)pdf.para('El inventario completo contiene '+loadList.length+' tipos de carga; se muestran los primeros 12 en esta página. Revisa el archivo de datos exportable para el resto.',44,712,530,9,14);
    pdf.common('Diseño fotovoltaico',3);
    pdf.labelValue('Potencia requerida',fmt(data.kwRequired,3)+' kWp',44,121);pdf.labelValue('Potencia FV propuesta',fmt(data.array.dcW/1000,3)+' kWp',309,121);
    pdf.labelValue('Arreglo (serie × paralelo)',data.array.series+' × '+data.array.parallel,44,197);pdf.labelValue('Producción teórica anual',fmt(data.annualGeneration)+' kWh',309,197);
    pdf.txt('Panel fotovoltaico',44,297,13,true);let pos=pdf.para(data.panel.brand+' '+data.panel.model+' - '+data.array.n+' unidades - '+fmt(data.panel.attrs.pmp)+' Wp c/u.',44,316,515,10,15);
    pdf.txt('Inversor',44,pos+22,13,true);pos=pdf.para(data.inverter.brand+' '+data.inverter.model+' - '+fmt(data.inverter.attrs.acW)+' W CA - '+fmt(data.inverter.attrs.dcW)+' W CC máximos.',44,pos+41,515,10,15);
    pdf.txt('Compatibilidad de módulos a condiciones estándar (STC)',44,pos+24,11,true);pos=pdf.para('String Vmp '+fmt(data.array.mpptV)+' V, Voc '+fmt(data.array.voc)+' V, corriente estimada por MPPT '+fmt(data.array.inputA)+' A. Configuración propuesta '+data.array.series+'S x '+data.array.parallel+'P. Falta revisión térmica, de conectores y de seguridad.',44,pos+44,500,10,16);
    if(data.storage){pdf.txt('Almacenamiento',44,pos+23,11,true);pos=pdf.para(data.battery.brand+' '+data.battery.model+'; '+data.storage.n+' baterías; capacidad '+fmt(data.storage.nominalKwh)+' kWh; '+data.storage.series+' serie x '+data.storage.parallel+' paralelo. Requiere verificación de BMS y corriente de carga/descarga.',44,pos+42,505,9,15)}
    pdf.para('Datos solares del usuario: HSP = '+fmt(data.hsp,2)+' h/día, PR = '+fmt(data.pr,3)+'. Capacidad y producción son estimaciones, no mediciones del sitio.',44,668,506,9,15);
    pdf.common('Presupuesto y retorno simple',4);
    pdf.txt('Costos de componentes y servicios (MXN)',44,123,13,true);y=142;
    for(let i=0;i<econ.costs.length;i++)y=pdf.tableRow([econ.costs[i][0],mxn(econ.costs[i][1])],44,y,[310,214],i);
    pdf.rect(44,y,524,37,'#dceafb');pdf.txt('INVERSIÓN TOTAL',55,y+24,12,true,'#17355d');pdf.txt(mxn(econ.total),369,y+24,12,true,'#17355d');
    const base=y+64;
    pdf.labelValue('Energía anual compensable',fmt(econ.offsetKwh,1)+' kWh',44,base);pdf.labelValue('Ahorro bruto teórico anual',mxn(econ.grossAnnual),309,base);
    pdf.labelValue('Ahorro neto anual',mxn(econ.netAnnual),44,base+76);pdf.labelValue('Retorno simple',econ.payback===null?'No recuperable':fmt(econ.payback,1)+' años',309,base+76);
    pdf.para('Tarifa: '+mxn(econ.tariff)+'/kWh. Fracción de generación aprovechable indicada por el usuario: '+fmt(econ.util)+' %. Operación anual: '+mxn(econ.om)+'. El ahorro calculado no incluye impuestos, cargos fijos ni mecanismos regulatorios de compensación.',44,633,512,9,15);
    pdf.common('Evidencia, supuestos y límites',5);
    let sy=125;
    const sources=[data.panel,data.inverter,...(data.storage?[data.battery]:[])];
    sources.forEach((p,i)=>{
      pdf.txt((i+1)+'. '+types[p.type]+': '+p.brand+' '+p.model,44,sy,11,true);
      sy=pdf.para('Proveedor: '+p.vendor+' | Consulta: '+p.date+' | Precio unitario: '+mxn(p.price),44,sy+18,516,9,13);
      sy=pdf.para('Ficha técnica: '+p.datasheet,44,sy+5,516,8,12);
      sy=pdf.para('Precio: '+p.url,44,sy+5,516,8,12)+16;
    });
    pdf.txt('Modelo y advertencias',44,Math.max(sy+7,420),13,true);pdf.para('Consumo calculado a partir del inventario, cantidad, potencia, horas y 52 semanas/año. Producción teórica = kWp del arreglo × HSP × PR × 365. Energía compensable = mínimo(consumo anual, producción FV × porcentaje aprovechable). Retorno simple = inversión / ahorro neto anual, solo cuando el ahorro neto es positivo.',44,Math.max(sy+27,443),520,9,15);
    pdf.para('No se ha modelado orientación, sombras, temperaturas extremas, degradación, estacionalidad, demanda horaria, normas de interconexión, mediciones de calidad de energía, protecciones, estructura ni BMS. No realizar instalaciones con estos resultados: requieren dictamen y revisión de personal calificado.',44,610,520,9,15);
    // Gráfica vectorial con valores calculados: consumo, producción potencial y aprovechamiento.
    pdf.common('Gráficas de energía y costos',6);
    pdf.txt('Balance anual teórico de energía (kWh/año)',44,131,13,true);
    const energyBars=[
      ['Consumo del aula',data.load.year,'#3b82f6'],
      ['Producción fotovoltaica',data.annualGeneration,'#a855f7'],
      ['Energía compensable',econ.offsetKwh,'#14a7bd']
    ];
    const energyMax=Math.max(1,...energyBars.map(x=>x[1]));
    energyBars.forEach((row,i)=>{
      const y=171+i*80;
      pdf.txt(row[0],44,y,10,true,'#294264');
      pdf.rect(44,y+12,520,24,'#edf3fa');
      pdf.rect(44,y+12,Math.max(0,520*row[1]/energyMax),24,row[2]);
      pdf.txt(fmt(row[1],1)+' kWh',44,y+52,10,true,'#1d3458');
    });
    pdf.para('La producción potencial no equivale al ahorro económico. La compensación anual se limita al menor valor entre el consumo del aula y la fracción aprovechable de la generación teórica.',44,418,515,9,15);
    pdf.txt('Distribución del presupuesto de inversión',44,496,13,true);
    const costBars=econ.costs.filter(x=>x[1]>0);
    const costMax=Math.max(1,...costBars.map(x=>x[1]));
    costBars.forEach((row,i)=>{
      const y=523+i*33;
      pdf.txt(row[0],44,y,9,false,'#304a6a');
      pdf.rect(44,y+5,302,10,'#edf3fa');
      pdf.rect(44,y+5,302*row[1]/costMax,10,i%2?'#22a5cb':'#3b82f6');
      pdf.txt(mxn(row[1]),369,y+14,9,true,'#1d3458');
    });
    if(data.load.loads.length>12){
      let appendixNumber=7;
      for(let start=12;start<data.load.loads.length;start+=18){
        pdf.common('Anexo: inventario complementario',appendixNumber++);
        let aty=136;
        aty=pdf.tableHeader(['Equipo','Cantidad','Potencia','Horas','kWh/día'],44,aty,[199,62,91,63,109]);
        data.load.loads.slice(start,start+18).forEach((r,i)=>{
          aty=pdf.tableRow([r.name,r.qty,fmt(r.watts,1)+' W',fmt(r.hours,1),fmt(r.kwday,3)],44,aty,[199,62,91,63,109],i);
        });
        pdf.para('La energía por día de uso se calcula como cantidad x potencia en W x horas dividido entre 1000. Se asumen todas las cargas listadas en los días de uso introducidos.',44,710,520,8,13);
      }
    }
    return pdf.finish();
  }
  function onPDF(){try{if(!get('solarProject').trim()||!get('solarClient').trim()||!get('solarLocation').trim())throw Error('Completa proyecto, cliente y ubicación en el paso 1 para la portada PDF.');
    const file=makePDF(),link=make('a'),url=URL.createObjectURL(file);link.href=url;link.download='Blackhole01_Propuesta_Solar.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);setMessage('solarReportMessage','PDF generado y descargado. La propuesta es preliminar.',true);
  }catch(err){setMessage('solarReportMessage',err.message);}}
  function init(){fromStorage();loadFields();attachFields();renderLoadRows();renderCatalog();showBatteryFields();updateProductFields();setStep(state.selectedStep);
    $('solarAddLoad').addEventListener('click',()=>{if(state.loads.length>=300)return;state.loads.push({name:'',qty:'',watts:'',hours:''});persist();renderLoadRows();invalidate(true);});
    $('solarProductType').addEventListener('change',updateProductFields);
    $('solarCatalogForm').addEventListener('submit',onSaveProduct);
    $('solarCancelEdit').addEventListener('click',clearProductForm);
    document.querySelectorAll('[data-solar-step]').forEach(btn=>btn.addEventListener('click',()=>setStep(Number(btn.dataset.solarStep))));
    $('solarPrev').addEventListener('click',()=>setStep(state.selectedStep-1));$('solarNext').addEventListener('click',()=>setStep(state.selectedStep+1));
    $('solarQuickCalculate').addEventListener('click',calculateQuick);
    $('solarUsePanelWp').addEventListener('click',()=>{
      const p=findProduct('panel',get('solarSelectedPanel'));
      if(!p){setMessage('solarQuickMessage','Selecciona un panel de la lista para usar su potencia.');return;}
      $('solarQuickWp').value=String(p.attrs.pmp);
      $('solarQuickSource').value='Ficha técnica del fabricante: '+p.brand+' '+p.model;
      state.fields.solarQuickWp=$('solarQuickWp').value;
      state.fields.solarQuickSource=$('solarQuickSource').value;
      persist();invalidateQuick();
      setMessage('solarQuickMessage','Potencia real del panel seleccionado copiada al estimador. Falta registrar consumo del aula y HSP/PR.',true);
    });
    $('solarGoToLoads').addEventListener('click',()=>setStep(0));
    $('solarGoToCatalog').addEventListener('click',()=>setStep(1));
    ['solarSelectedPanel','solarSelectedInverter','solarBatteryMode'].forEach(id=>$(id).addEventListener('change',renderTechnicalSelection));
    $('solarCalculate').addEventListener('click',onCalculate);$('solarEvaluate').addEventListener('click',onEvaluate);
    $('solarExportJSON').addEventListener('click',exportJSON);$('solarImportJSON').addEventListener('click',()=>$('solarJSONFile').click());$('solarJSONFile').addEventListener('change',e=>{importJSON(e.target.files[0]);e.target.value='';});
    $('solarDownloadPDF').addEventListener('click',onPDF);
  }
  init();
})();
