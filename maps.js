/* SENER/SEMARNAT institutional map service. Historical thematic layers. */
(()=>{'use strict';const image=document.getElementById('genOfficialMap');if(!image)return;
const fallback=document.getElementById('genMapUnavailable');
image.addEventListener('error',()=>{fallback.hidden=false;image.hidden=true;});
image.addEventListener('load',()=>{if(image.naturalWidth<100){image.hidden=true;fallback.hidden=false;}});
image.src='https://geomatica.semarnat.gob.mx/arcgis/rest/services/APLICACIONES/energia_electrica/MapServer/export?bbox=-118.7,14,-86.5,33&bboxSR=4326&imageSR=4326&size=1200,720&format=png32&transparent=false&layers=show:10,11&f=image';
})();
