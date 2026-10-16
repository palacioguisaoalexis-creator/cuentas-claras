/* Cuentas Claras — lógica de la app */
(() => {
'use strict';
/* ================= constantes ================= */
const COL='finanzas';
const PALETA=[['#E07A5F','Coral'],['#F2A541','Mostaza'],['#3D9970','Verde'],['#00A5CF','Turquesa'],['#4C6EF5','Azul'],['#9B5DE5','Morado'],['#D6457A','Fucsia'],['#6B8E23','Oliva'],['#8D6E63','Café'],['#5C7080','Gris']];
const DEF_CG=[['hormiga','Hormiga / antojos','🍬','#F2A541'],['comida','Comida fuera','🍔','#E07A5F'],['transporte','Gasolina y transporte','⛽','#00A5CF'],['salidas','Salidas y planes','🎉','#9B5DE5'],['mascotas','Mascotas','🐾','#8D6E63'],['hogar','Hogar y mercado','🏠','#3D9970'],['suscripciones','Suscripciones','📱','#4C6EF5'],['salud','Salud y cuidado','💊','#D6457A'],['ropa','Ropa','👕','#6B8E23'],['regalos','Regalos','🎁','#E07A5F'],['otros','Otros','📦','#5C7080']].map(([id,nombre,icono,color])=>({id,nombre,padre:'',icono,color}));
const MOV_ICO={ingreso:'💵',extra:'🛵',pago:'🧾',abono:'📉',apartar:'🐷',mover:'🔁',ajuste:'⚖️'};
const CAT_SR={id:'sinregistrar',n:'Sin registrar (cuadre)'};
const DEF_CI=[['sueldo','Sueldo'],['prima','Prima'],['familia','Ayuda de alguien'],['otro','Otro ingreso']].map(([id,nombre])=>({id,nombre}));
const DEF_RAP=[['Gaseosa',3500,'hormiga'],['Mecato',3000,'hormiga'],['Tinto',2000,'hormiga'],['Empanada',3000,'hormiga'],['Almuerzo',16000,'comida'],['Gasolina',20000,'transporte']].map(([nombre,monto,cat],i)=>({id:'a'+i,nombre,monto,cat}));
const TIPOS_CUENTA=[['efectivo','Efectivo'],['banco','Cuenta de banco'],['billetera','Billetera digital (Nequi, Daviplata)'],['ahorro','Ahorro / bolsillo']];
const MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DEFAULT_CONFIG={v:2,onboarded:false,perfil:{nombre:''},ingreso:{tipo:'sueldo',frecuencia:'mensual',dias:[30],componentes:[{id:'c1',nombre:'Salario',monto:0,signo:1}],cuenta:'efectivo',diasSemana:6,fuentePrincipal:''},
  cuentas:[{id:'efectivo',nombre:'Efectivo',tipo:'efectivo'}],fijos:[],cobros:[],fuentes:[],presupuestos:{},metas:[],deudaInicial:0,cargosTarjeta:0,contexto:'',ultimoCuadre:null,recordatorioDias:7,destinoExtra:''};

/* ================= utilidades ================= */
const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>[...el.querySelectorAll(s)];
const fmt=n=>(n<0?'−':'')+'$'+Math.abs(Math.round(n||0)).toLocaleString('es-CO');
const num=s=>Number(String(s??'').replace(/[^\d]/g,''))||0;
const dec=s=>parseFloat(String(s??'').replace(/[^\d,.-]/g,'').replace(',','.'))||0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseISO=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,(m||1)-1,d||1);};
const fdate=d=>`${d.getDate()} ${MESES[d.getMonth()]}`;
const mlabel=d=>`${MESES[d.getMonth()]} ${d.getFullYear()}`;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const daysIn=(y,m)=>new Date(y,m+1,0).getDate();
const DAY=864e5;
function today(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const ls={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};

/* ================= ciclos (de un día de pago al siguiente) ================= */
function paydays(){const d=(cfg().ingreso.dias||[30]).map(Number).filter(x=>x>=1&&x<=31);return d.length?[...new Set(d)].sort((a,b)=>a-b):[30];}
function occ(y,m){return paydays().map(d=>new Date(y,m,Math.min(d,daysIn(y,m))));}
function startOf(date){let best=null;for(let i=-2;i<=0;i++){const b=new Date(date.getFullYear(),date.getMonth()+i,1);for(const o of occ(b.getFullYear(),b.getMonth()))if(o<=date&&(!best||o>best))best=o;}return best;}
function nextStart(s){let best=null;for(let i=0;i<=2;i++){const b=new Date(s.getFullYear(),s.getMonth()+i,1);for(const o of occ(b.getFullYear(),b.getMonth()))if(o>s&&(!best||o<best))best=o;}return best;}
const keyOf=d=>iso(startOf(d));
const cStart=k=>parseISO(k);
const cEnd=k=>addDays(nextStart(cStart(k)),-1);
const cDays=k=>Math.round((cEnd(k)-cStart(k))/DAY)+1;
function addCycle(k,n){let s=cStart(k);if(n>=0){for(let i=0;i<n;i++)s=nextStart(s);}else{for(let i=0;i<-n;i++)s=startOf(addDays(s,-1));}return iso(s);}
const cRange=k=>`${fdate(cStart(k))} – ${fdate(cEnd(k))}`;
const curKey=()=>keyOf(today());
function dueIn(k,dia){const s=cStart(k),e=cEnd(k);for(let i=0;i<=1;i++){const b=new Date(s.getFullYear(),s.getMonth()+i,1);const d=new Date(b.getFullYear(),b.getMonth(),Math.min(dia,daysIn(b.getFullYear(),b.getMonth())));if(d>=s&&d<=e)return d;}return null;}

/* ================= estado y guardado ================= */
const S={config:null,saldos:null,deudas:null,cycles:{}};
let store=null,loaded=false,tab='hoy',viewKey=null,proj={pago:null,extra:0};
const built={ajustes:false,ai:false,setup:false};
let setupStep=0;
function cfg(){return S.config||DEFAULT_CONFIG;}
function catsG(){const c=cfg().categorias;return c&&Array.isArray(c.gasto)&&c.gasto.length?c.gasto:DEF_CG;}
function catsI(){const c=cfg().categorias;return c&&Array.isArray(c.ingreso)&&c.ingreso.length?c.ingreso:DEF_CI;}
function rapidos(){return Array.isArray(cfg().atajos)?cfg().atajos:DEF_RAP;}
const catObj=id=>catsG().find(c=>c.id===id);
const topOf=id=>{const c=catObj(id);return c&&c.padre&&catObj(c.padre)?c.padre:id;};
const topsG=()=>catsG().filter(c=>!c.padre||!catObj(c.padre));
function catColor(id){if(id==='sinregistrar')return '#5C7080';const c=catObj(id);if(!c)return '#5C7080';if(c.color)return c.color;const d=DEF_CG.find(x=>x.id===c.id);if(d)return d.color;return c.padre?catColor(c.padre):'#5C7080';}
function catIcon(id){if(id==='sinregistrar')return '⚖️';const c=catObj(id);if(!c)return '•';if(c.icono)return c.icono;const d=DEF_CG.find(x=>x.id===c.id);if(d)return d.icono;return c.padre?catIcon(c.padre):'•';}
const ico=(e,col)=>`<span class="ico" style="--c:${esc(col||'#5C7080')}" aria-hidden="true">${esc(e)}</span>`;
function ensureCats(){if(!S.config)return;if(!S.config.categorias)S.config.categorias={};if(!Array.isArray(S.config.categorias.gasto)||!S.config.categorias.gasto.length)S.config.categorias.gasto=JSON.parse(JSON.stringify(DEF_CG));if(!Array.isArray(S.config.categorias.ingreso)||!S.config.categorias.ingreso.length)S.config.categorias.ingreso=JSON.parse(JSON.stringify(DEF_CI));}
function agruparCats(porCat,pres){
  const rows=[];
  for(const t of topsG()){const kids=catsG().filter(c=>c.padre===t.id).map(k=>({id:k.id,n:k.nombre,v:porCat[k.id]||0,p:pres[k.id]||0}));const v=(porCat[t.id]||0)+kids.reduce((a,k)=>a+k.v,0);rows.push({id:t.id,n:t.nombre,v,p:pres[t.id]||0,kids:kids.filter(k=>k.v>0||k.p>0)});}
  const known=new Set(catsG().map(c=>c.id));let unk=0;for(const[id,v]of Object.entries(porCat))if(!known.has(id)&&id!=='sinregistrar')unk+=v;
  if(unk)rows.push({id:'_',n:'Sin categoría',v:unk,p:0,kids:[]});if(porCat.sinregistrar)rows.push({id:'sinregistrar',n:CAT_SR.n,v:porCat.sinregistrar,p:0,kids:[]});
  return rows.filter(r=>r.v>0||r.p>0).sort((a,b)=>b.v-a.v);
}
function deudas(){return S.deudas&&Array.isArray(S.deudas.items)?S.deudas.items:[];}
const deuda=id=>deudas().find(d=>d.id===id);
const esTarjeta=id=>deuda(id)?.tipo==='tarjeta';
const metas=()=>cfg().metas||[];
function saldo(id){return (S.saldos&&S.saldos.cuentas&&S.saldos.cuentas[id])||0;}
function C(k){if(!S.cycles[k])S.cycles[k]={key:k,movs:[],pagados:{},extras:[],montos:{},cobros:{},cobrosMonto:{}};const c=S.cycles[k];for(const f of['movs','extras'])if(!Array.isArray(c[f]))c[f]=[];for(const f of['pagados','montos','cobros','cobrosMonto'])if(!c[f]||typeof c[f]!=='object')c[f]={};return c;}
const queues={};
function persist(id){
  const body=id==='config'?S.config:id==='saldos'?S.saldos:id==='deudas'?S.deudas:S.cycles[id.slice(2)];
  if(!body||!store)return; const snap=JSON.parse(JSON.stringify(body));
  queues[id]=(queues[id]||Promise.resolve()).then(()=>store.set(id,snap)).catch(e=>{
    if(e&&(e.code==='invalid_argument'||e.code==='not_granted'||e.code==='revoked')&&store.remote){usarLocal('No tienes permiso para guardar en tu cuenta en esta app. Tus datos se guardan solo en este dispositivo. Pide a quien te compartió la app que te dé permiso para usarla.');return;}
    toast(e&&e.code==='quota_exceeded'?'Se llenó el espacio de la app.':'No se pudo guardar. Revisa tu conexión.');});
}
let LKEY='cuentas-claras-v2',demo=false;
function localStore(){return{remote:false,set:(id,data)=>{let all={};try{all=JSON.parse(ls.get(LKEY)||'{}');}catch(e){}all[id]=data;ls.set(LKEY,JSON.stringify(all));return Promise.resolve();},
  del:id=>{let all={};try{all=JSON.parse(ls.get(LKEY)||'{}');}catch(e){}delete all[id];ls.set(LKEY,JSON.stringify(all));return Promise.resolve();}};}
function respaldo(){return JSON.stringify({app:'Cuentas Claras',version:2,fecha:iso(today()),config:S.config,saldos:S.saldos,deudas:S.deudas,ciclos:S.cycles},null,1);}
async function descargarRespaldo(btn){if(!dlFn){toast('La descarga no está disponible aquí');return false;}try{await dlFn.save({filename:`cuentas-claras-respaldo-${iso(today())}.json`,data:respaldo()});toast('Copia descargada');return true;}catch(e){toast(e?.code==='declined'?'Descarga cancelada':'No se pudo descargar');return false;}}
function sheetBorrarTodo(){
  const nMov=Object.values(S.cycles).reduce((a,c)=>a+(c.movs||[]).length,0);
  openSheet(`<div class="stack"><h2>Borrar todo y empezar de cero</h2>
    <p>Se borran <b>todos tus datos</b>: configuración, cuentas y saldos, deudas y tarjetas, metas, gastos programados y ${nMov} movimiento${nMov===1?'':'s'}. Luego la app arranca como nueva, con el asistente. Sigues con la sesión iniciada.</p>
    <div class="note bad">Esto no se puede deshacer.</div>
    ${dlFn?`<button class="btn ghost" id="bzCopia">Descargar una copia antes (opcional)</button>`:''}
    <label class="f" for="bzTxt">Para confirmar, escribe BORRAR<input id="bzTxt" autocomplete="off" autocapitalize="characters" placeholder="BORRAR"></label>
    <button class="btn danger" id="bzOk" disabled>Borrar todo</button><button class="btn ghost" id="bzNo">Cancelar</button></div>`,sh=>{
    $('#bzNo').onclick=closeSheet;const c=$('#bzCopia');if(c)c.onclick=()=>descargarRespaldo(c);
    $('#bzTxt').addEventListener('input',e=>{$('#bzOk').disabled=e.target.value.trim().toUpperCase()!=='BORRAR';});
    $('#bzOk').onclick=async()=>{const b=$('#bzOk');b.disabled=true;b.textContent='Borrando…';
      try{await Promise.all(Object.values(queues));}catch(e){}
      const ids=['config','saldos','deudas',...Object.keys(S.cycles).map(k=>'c-'+k)];
      try{await Promise.all(ids.map(id=>store&&store.del?store.del(id):Promise.resolve()));}
      catch(e){b.disabled=false;b.textContent='Borrar todo';toast('No se pudo borrar todo. Revisa tu conexión e intenta de nuevo.');return;}
      try{for(const k of Object.keys(localStorage))if(/^cc-src-/.test(k))localStorage.removeItem(k);}catch(e){}
      S.config=null;S.saldos=null;S.deudas=null;S.cycles={};setupStep=0;built.setup=false;built.ajustes=false;built.ai=false;turns=[];extNode=null;tab='hoy';viewKey=null;proj={pago:null,extra:0};
      $$('nav.tabs [data-tab]').forEach(x=>x.dataset.tab==='hoy'?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current'));
      closeSheet();window.scrollTo({top:0});render();toast('Listo. Empecemos de cero');};});}
let unsub=null;
function usarLocal(msg){if(store&&!store.remote)return;if(unsub){try{unsub();}catch(e){}unsub=null;}store=localStore();
  let raw=null;try{raw=JSON.parse(ls.get(LKEY)||'null');}catch(e){}
  if(raw&&!S.config)for(const[id,data]of Object.entries(raw))applyDoc(id,data);
  else for(const id of['config','saldos','deudas',...Object.keys(S.cycles).map(k=>'c-'+k)])persist(id);
  loaded=true;if(msg)banner(msg);render();}
const saveC=k=>persist('c-'+k);
function applyDoc(id,data){
  if(id==='config'){S.config=data?Object.assign(JSON.parse(JSON.stringify(DEFAULT_CONFIG)),data,{ingreso:Object.assign({},DEFAULT_CONFIG.ingreso,data.ingreso||{}),perfil:Object.assign({},DEFAULT_CONFIG.perfil,data.perfil||{})}):null;}
  else if(id==='saldos')S.saldos=data;
  else if(id==='deudas')S.deudas=data;
  else if(id.startsWith('c-')){const k=id.slice(2);if(data){S.cycles[k]=data;C(k);}else delete S.cycles[k];}
}
function entrarDemo(){if(unsub){try{unsub();}catch(e){}unsub=null;}demo=true;LKEY='cuentas-claras-demo';store=null;S.config=null;S.saldos=null;S.deudas=null;S.cycles={};setupStep=0;built.setup=false;built.ajustes=false;tab='hoy';viewKey=null;extNode=null;
  usarLocal('');bannerDemo();window.scrollTo({top:0});}
function salirDemo(){try{localStorage.removeItem('cuentas-claras-demo');}catch(e){}demo=false;LKEY='cuentas-claras-v2';store=null;S.config=null;S.saldos=null;S.deudas=null;S.cycles={};loaded=false;built.setup=false;built.ajustes=false;tab='hoy';viewKey=null;extNode=null;$('#banner').innerHTML='';
  try{if(location.hash==='#demo')history.replaceState(null,'',location.pathname+location.search);}catch(e){}initStore();}
function bannerDemo(){$('#banner').innerHTML=`<div class="note" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>Modo prueba.</b> Empiezas desde cero y nada de esto toca tus datos reales. Queda solo en este dispositivo.</span><button class="btn sm" data-action="salirDemo">Salir y borrar la prueba</button></div>`;}
async function initStore(){
  if(location.hash==='#demo'){entrarDemo();return;}
  let db=null,user=null,me=null;
  try{if(window.claude){[db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);}}catch(e){}
  try{me=user?await user.id():null;}catch(e){me=null;}
  if(db&&me){
    const col=db.collection('data/users/'+me); store={remote:true,set:(id,data)=>col.doc(id).set(data),del:id=>col.doc(id).delete()};
    unsub=col.onSnapshot(snap=>{if(!store.remote)return;for(const ch of snap.docChanges()){applyDoc(ch.doc.id,ch.type==='removed'?null:JSON.parse(JSON.stringify(ch.doc.data())));}if(!snap.metadata.fromCache)loaded=true;render();},
      ()=>banner('Se cortó la conexión con tus datos. Recarga la página.'));
  }else usarLocal('Modo sin conexión: lo que registres queda solo en este dispositivo. Inicia sesión para guardar en la nube.');
}
function banner(t){$('#banner').innerHTML=`<div class="note" style="margin-bottom:12px">${esc(t)}</div>`;}
let toastT; function toast(t){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el);}el.textContent=t;clearTimeout(toastT);toastT=setTimeout(()=>el.remove(),2600);}

/* ================= efectos sobre cuentas, deudas y metas ================= */
function applyFx(fx,sign=1){
  const t=new Set();
  for(const f of fx||[]){const d=f.d*sign;
    if(f.k==='cuenta'){if(!S.saldos)S.saldos={cuentas:{}};if(!S.saldos.cuentas)S.saldos.cuentas={};S.saldos.cuentas[f.id]=Math.round((S.saldos.cuentas[f.id]||0)+d);t.add('saldos');}
    else if(f.k==='deuda'){const x=deuda(f.id);if(x){const antes=x.saldo;x.saldo=Math.max(0,Math.round(x.saldo+d));t.add('deudas');if(antes>0&&x.saldo===0&&d<0&&sign===1)celebrar(x.nombre);}}
    else if(f.k==='meta'){const m=metas().find(z=>z.id===f.id);if(m){m.ahorrado=Math.max(0,Math.round((m.ahorrado||0)+d));t.add('config');}}
    else if(f.k==='prog'){const p=progs().find(z=>z.id===f.id);if(p){p.apartado=Math.max(0,Math.round((p.apartado||0)+d));t.add('config');}}
    else if(f.k==='progHecho'){const p=progs().find(z=>z.id===f.id);if(p){p.hecho=sign===1;t.add('config');}}}
  t.forEach(persist);
}
function addMov(v){const k=keyOf(parseISO(v.fecha));C(k).movs.push(v);applyFx(v.fx);saveC(k);return k;}
function borrarMov(k,id){const c=C(k);const i=c.movs.findIndex(v=>v.id===id);if(i<0)return;const v=c.movs[i];applyFx(v.fx,-1);
  if(v.t==='pago'&&v.ref&&c.pagados[v.ref]?.mov===v.id)delete c.pagados[v.ref];
  if(v.cobro&&c.cobros[v.cobro])delete c.cobros[v.cobro];
  c.movs.splice(i,1);saveC(k);}
function fxFromParts(parts,sign){return parts.map(p=>p.tipo==='tarjeta'?{k:'deuda',id:p.id,d:p.monto}:{k:'cuenta',id:p.id,d:sign*p.monto});}

/* ================= cálculos ================= */
const tipoIng=()=>cfg().ingreso.tipo||'sueldo';
const conSueldo=()=>tipoIng()!=='diario';
const conDias=()=>tipoIng()!=='sueldo';
function fuentePrincipal(){const fs=cfg().fuentes||[];return fs.find(f=>f.id===cfg().ingreso.fuentePrincipal)||(conDias()?fs[0]:null)||null;}
function netoMensual(){return conSueldo()?(cfg().ingreso.componentes||[]).reduce((a,c)=>a+(c.signo<0?-1:1)*(c.monto||0),0):0;}
const netoPorPago=()=>Math.round(netoMensual()/paydays().length);
function diasTrabajo(desde,hasta){const n=Math.max(0,Math.round((hasta-desde)/DAY)+1);return Math.max(n>0?1:0,Math.round(n*(cfg().ingreso.diasSemana||6)/7));}
function hoyTrabajo(){const f=fuentePrincipal();const h=iso(today());return Object.values(S.cycles).flatMap(c=>c.movs).filter(v=>v.t==='extra'&&v.fecha===h&&(!f||v.fuente===f.id)).reduce((a,v)=>a+v.monto,0);}
function gastoDiario(){const desde=iso(addDays(today(),-30));const g=Object.values(S.cycles).flatMap(c=>c.movs).filter(v=>v.t==='gasto'&&v.fecha>=desde&&!(v.fx||[]).some(f=>f.k==='deuda'));if(!g.length)return 0;const primero=g.reduce((a,v)=>v.fecha<a?v.fecha:a,iso(today()));const dias=Math.max(7,Math.round((today()-parseISO(primero))/DAY)+1);return g.reduce((a,v)=>a+v.monto,0)/dias;}
function metaDiaria(r){const f=fuentePrincipal();if(!f||!conDias())return null;const k=curKey(),fin=cEnd(k);const hoyN=hoyTrabajo();const restantes=diasTrabajo(today(),fin);
  const prox=obligaciones(addCycle(k,1)).filter(o=>!o.estado&&o.due<=addDays(fin,10)).reduce((a,o)=>a+o.monto,0);
  const diasCal=Math.max(1,Math.round((fin-today())/DAY)+1);const vida=Math.round(gastoDiario()*diasCal);
  const falta=Math.max(0,-r.libre+prox+vida+hoyN);const p=promExtra(f.id);
  return{f,hoy:hoyN,restantes,meta:restantes?Math.ceil(falta/restantes/1000)*1000:falta,falta,prom:p?.prom||0,pend:r.pendientes,prox,vida};}
function ingresoEsperado(k){let t=netoPorPago();if(conDias()){const f=fuentePrincipal(),p=f&&promExtra(f.id);if(p)t+=Math.round(p.prom*diasTrabajo(cStart(k),cEnd(k)));}return t;}
function cobrosDe(k){const c=C(k),out=[];for(const x of cfg().cobros||[]){const r=c.cobros[x.id];if(r)out.push({...x,monto:r.monto,recibido:true});else if((x.ciclos||[]).includes(k)&&k>=curKey())out.push({...x,monto:c.cobrosMonto[x.id]??x.monto,recibido:false});}return out.concat(cobrosTarjetas(k));}
function obligaciones(k){
  const c=C(k),cobs=cobrosDe(k),out=[];
  for(const f of cfg().fijos||[]){const due=dueIn(k,f.dia);if(!due)continue;out.push({id:f.id,nombre:f.nombre,dia:f.dia,propio:c.montos[f.id]??f.monto,fam:0,monto:c.montos[f.id]??f.monto,due,estado:c.pagados[f.id]||null,extra:false,cuenta:f.cuenta});}
  for(const d of deudas()){if(d.plan){out.push(...obligacionesPlan(d,k));continue;}const due=dueIn(k,d.dia);if(!due)continue;if(d.saldo<=0&&!c.pagados[d.id])continue;
    const propio=c.montos[d.id]??(d.tipo==='prestamo'?Math.min(d.pago||0,d.saldo):d.pago||0);const fam=cobs.filter(x=>x.destino===d.id).reduce((a,x)=>a+x.monto,0);
    out.push({id:d.id,nombre:'Pago '+d.nombre,dia:d.dia,propio,fam,monto:propio+fam,due,estado:c.pagados[d.id]||null,extra:false,deudaId:d.id});}
  for(const x of c.extras){const due=dueIn(k,x.dia)||cStart(k);out.push({...x,propio:x.monto,fam:0,due,estado:c.pagados[x.id]||null,extra:true});}
  return out.sort((a,b)=>a.due-b.due);
}
function totalCuentas(soloDisponible=true){return (cfg().cuentas||[]).filter(c=>!soloDisponible||c.tipo!=='ahorro').reduce((a,c)=>a+saldo(c.id),0);}
const progs=()=>(cfg().programados||[]);
const progsActivos=()=>progs().filter(p=>!p.hecho);
const reservado=()=>metas().reduce((a,m)=>a+(m.ahorrado||0),0)+progsActivos().reduce((a,p)=>a+(p.apartado||0),0);
const CADA=[['pago','Cada pago'],['quincena','Cada quincena'],['semana','Cada semana']];
function fechasAparte(p){const fin=parseISO(p.fecha),out=[];let d=today();if(d<fin)out.push(d);
  for(let i=0;i<80;i++){let n;if(p.cada==='semana')n=addDays(d,7);else if(p.cada==='pago')n=nextStart(d)||addDays(d,30);else{const y=d.getFullYear(),m=d.getMonth();n=[new Date(y,m,15),new Date(y,m,daysIn(y,m)),new Date(y,m+1,15)].find(x=>x>d);}
    if(!n||n>=fin)break;out.push(n);d=n;}
  return out;}
function planProg(p){const rest=Math.max(0,(p.monto||0)-(p.apartado||0));if(!rest)return[];const fs=fechasAparte(p);if(!fs.length)return[{fecha:today(),monto:rest}];
  const cuota=Math.ceil(rest/fs.length/1000)*1000;let q=rest;return fs.map((f,i)=>{const m=i===fs.length-1?q:Math.min(q,cuota);q-=m;return{fecha:f,monto:m};}).filter(x=>x.monto>0);}
function progPendiente(hasta){return progsActivos().reduce((a,p)=>a+planProg(p).filter(x=>x.fecha<=hasta).reduce((s,x)=>s+x.monto,0),0);}
function resumen(k){
  const c=C(k),r={ingresos:0,extra:0,extraBruto:0,extraCostos:0,extraN:0,gastos:0,credito:0,pagos:0,abonos:0,apartado:0,sinReg:0,porCat:{},hormiga:0,hormigaN:0};
  for(const v of c.movs){
    if(v.t==='ingreso')r.ingresos+=v.monto;
    else if(v.t==='extra'){r.extra+=v.monto;r.extraBruto+=v.bruto||0;r.extraCostos+=(v.bruto||0)-v.monto;r.extraN++;}
    else if(v.t==='gasto'){r.gastos+=v.monto;r.credito+=(v.fx||[]).filter(f=>f.k==='deuda').reduce((a,f)=>a+f.d,0);r.porCat[v.cat]=(r.porCat[v.cat]||0)+v.monto;if(topOf(v.cat)==='hormiga'){r.hormiga+=v.monto;r.hormigaN++;}}
    else if(v.t==='pago')r.pagos+=v.monto;
    else if(v.t==='abono')r.abonos+=v.monto;
    else if(v.t==='apartar')r.apartado+=v.monto;
    else if(v.t==='ajuste'&&v.monto<0){r.sinReg+=-v.monto;r.porCat.sinregistrar=(r.porCat.sinregistrar||0)-v.monto;}
  }
  const obs=obligaciones(k);r.obs=obs;
  r.pendientes=obs.filter(o=>!o.estado).reduce((a,o)=>a+o.monto,0);
  r.cobrosPend=cobrosDe(k).filter(x=>!x.recibido).reduce((a,x)=>a+x.monto,0);
  const cuadreTras=cfg().ultimoCuadre&&parseISO(cfg().ultimoCuadre)>=cStart(k);
  const tieneSueldo=c.movs.some(v=>v.t==='ingreso'&&v.cat==='sueldo');
  const cur=curKey();
  r.futuro=k>cur;
  r.sueldoEsp=(conSueldo()&&!tieneSueldo&&!c.sueldoFuera&&!cuadreTras&&k>=cur)?netoPorPago():0;
  if(k===cur){r.disponible=totalCuentas()-reservado();r.progPend=progPendiente(cEnd(k));r.libre=r.disponible+r.sueldoEsp+r.cobrosPend-r.pendientes-r.progPend;}
  else if(r.futuro){r.esperado=ingresoEsperado(k);r.libre=r.esperado+r.cobrosPend-r.pendientes;}
  else r.libre=null;
  return r;
}
function tasaProm(items){const t=items.reduce((a,d)=>a+Math.max(0,d.saldo),0);return t>0?items.reduce((a,d)=>a+Math.max(0,d.saldo)*(d.tasa||0),0)/t:0;}
/* Proyección de TODAS las deudas (tarjetas y préstamos).
   P: pago mensual propio a tarjetas (null = lo planeado). extra: plata extra al mes (moto u otros), va primero a la deuda de mayor interés. */
let _ptCache=null;
function proyectar(P,extra){
  const ds=deudas().filter(d=>d.saldo>0);const st={};ds.forEach(d=>st[d.id]=d.saldo);
  const tot=()=>Object.values(st).reduce((a,v)=>a+Math.max(0,v),0);
  const cards=ds.filter(d=>d.tipo==='tarjeta'),base=cards.reduce((a,d)=>a+(d.pago||0),0);
  const orden=[...ds].sort((a,b)=>(b.tasa||0)-(a.tasa||0)||(a.tipo==='tarjeta'?-1:1)||a.saldo-b.saldo);
  const k0=curKey();let B=tot();const pts=[{k:k0,B}];let int=0;const finD={};
  const lastPlan={};ds.forEach(d=>{if(d.plan){const fs=fechasPlan(d);lastPlan[d.id]=fs[fs.length-1];}});
  if(B<=0)return{pts,fin:k0,intereses:0,ok:true,finD};
  _ptCache=new Map();
  try{for(let i=0;i<240;i++){
    const k=addCycle(k0,i),f=cDays(k)/30;
    const obs=obligaciones(k).filter(o=>o.deudaId&&st[o.deudaId]!=null);
    const ov=S.cycles[k]&&obs.some(o=>S.cycles[k].montos[o.id]!=null);
    for(const d of ds){if(st[d.id]>0.5){const it=st[d.id]*(d.tasa||0)*f;st[d.id]+=it;int+=it;}}
    if(i>0&&cfg().cargosTarjeta){const c0=cards.find(d=>st[d.id]>0.5);if(c0)st[c0.id]+=cfg().cargosTarjeta*f;}
    let pool=0;
    for(const o of obs){if(i===0&&o.estado)continue;const d=deuda(o.deudaId);if(!d)continue;
      let m=(d.tipo==='tarjeta'&&i>0&&!ov&&P!=null)?o.fam+(o.extra?o.monto:(base?o.propio*P/base:0)):o.monto;
      const pay=Math.min(m,Math.max(0,st[d.id]));st[d.id]-=pay;if(d.tipo==='tarjeta')pool+=m-pay;}
    for(const d of ds){if(!d.plan||st[d.id]<=0.5)continue;const ult=lastPlan[d.id];if(ult&&ult<=cEnd(k)){st[d.id]=0;}}
    if(i>0){if(!base&&P&&cards.length)pool+=P*f;pool+=(extra||0)*f;}
    for(const d of orden){if(pool<=0)break;if(st[d.id]>0.5){const p=Math.min(pool,st[d.id]);st[d.id]-=p;pool-=p;}}
    for(const d of ds)if(st[d.id]<=0.5&&!finD[d.id])finD[d.id]=k;
    B=tot();pts.push({k:addCycle(k0,i+1),B:Math.max(0,B)});
    if(B<=1)return{pts,fin:k,intereses:int,ok:true,finD};
    if(i>6&&B>=pts[pts.length-5].B)return{pts,fin:null,intereses:int,ok:false,finD};
  }}finally{_ptCache=null;}
  return{pts,fin:null,intereses:int,ok:false,finD};
}
function extraMoto(){const fs=cfg().fuentes||[];const f=fuentePrincipal()||fs[0];if(!f)return null;const p=promExtra(f.id);return{f,prom:p?.prom||0,n:p?.n||0};}
function finLabel(p){return p.fin?mlabel(cEnd(p.fin)):'—';}
function prestamosFin(){return deudas().filter(d=>d.tipo==='prestamo'&&d.saldo>0&&(d.pago>0||d.plan)).map(d=>{if(d.plan){const pl=planDeuda(d);return pl.length?{d,n:pl.length,fecha:pl[pl.length-1].f}:null;}let n=Math.ceil(d.saldo/d.pago);let k=curKey();if(C(k).pagados[d.id]||!dueIn(k,d.dia)||dueIn(k,d.dia)<today())k=addCycle(k,1);let cnt=0,kk=k;for(let i=0;i<60&&cnt<n;i++){kk=addCycle(k,i);if(dueIn(kk,d.dia))cnt++;}return{d,n,fecha:dueIn(kk,d.dia)};}).filter(Boolean);}
function promExtra(fid){const all=Object.values(S.cycles).flatMap(c=>c.movs).filter(v=>v.t==='extra'&&(!fid||v.fuente===fid));if(!all.length)return null;return{prom:all.reduce((a,v)=>a+v.monto,0)/all.length,n:all.length};}
function gastosDia(h){return Object.values(S.cycles).flatMap(c=>c.movs).filter(v=>v.t==='gasto'&&v.fecha===h&&!(v.fx||[]).some(f=>f.k==='deuda')).reduce((a,v)=>a+v.monto,0);}
function puedesHoy(){if(!S.config)return null;const k=curKey(),r=resumen(k);const dias=Math.max(1,Math.round((cEnd(k)-today())/DAY)+1);const gh=gastosDia(iso(today()));const md=metaDiaria(r);
  const base=r.libre+gh-(md?md.prox:0);const pres=Math.max(0,base/dias);const rest=pres-gh;const estado=r.libre<0||base<=0||rest<=0?'rojo':rest<pres*0.5?'amarillo':'verde';return{pres,restante:rest,gh,estado,dias,r,md,base};}
function racha(){const dias=new Set(Object.values(S.cycles).flatMap(c=>c.movs).map(v=>v.fecha));let d=today();if(!dias.has(iso(d)))d=addDays(d,-1);let n=0;while(dias.has(iso(d))&&n<999){n++;d=addDays(d,-1);}return n;}
function aporteDeudas(k){return C(k).movs.filter(v=>(v.t==='pago'&&v.deudaId)||v.t==='abono').reduce((a,v)=>a+v.monto,0);}
function celebrar(nombre){setTimeout(()=>{if(!window.matchMedia||!matchMedia('(prefers-reduced-motion: reduce)').matches){const cv=document.createElement('canvas');cv.id='confetti';cv.width=innerWidth;cv.height=innerHeight;document.body.appendChild(cv);const x=cv.getContext('2d');const cols=PALETA.map(p=>p[0]);
  const ps=Array.from({length:140},()=>({x:innerWidth/2,y:innerHeight*0.35,vx:(Math.random()-.5)*12,vy:Math.random()*-12-4,s:4+Math.random()*5,c:cols[Math.floor(Math.random()*cols.length)],r:Math.random()*6}));let t=0;
  const step=()=>{t++;x.clearRect(0,0,cv.width,cv.height);for(const p of ps){p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/2,p.s,p.s*1.6);x.restore();}if(t<110)requestAnimationFrame(step);else cv.remove();};step();}
  openSheet(`<div class="stack" style="text-align:center;align-items:center"><div style="font-size:3rem">🎉</div><h2>¡Terminaste de pagar ${esc(nombre)}!</h2><p class="muted">Una deuda menos. Lo que pagabas ahí ahora puede ir a la siguiente deuda o a tu ahorro.</p><button class="btn" id="cOk">Seguir</button></div>`,sh=>{$('#cOk').onclick=closeSheet;});},400);}
function diasSinCuadre(){const u=cfg().ultimoCuadre;return u?Math.round((today()-parseISO(u))/DAY):null;}

/* ================= consejos (reglas) ================= */
function consejos(){
  const out=[],k=curKey(),r=resumen(k),c=cfg();const ds=diasSinCuadre(),lim=c.recordatorioDias||7;
  if(ds==null||ds>=lim)out.push({tono:'warn',t:'Cuadra tus cuentas',x:ds==null?'Dime cuánto tienes en efectivo y en cada cuenta para que los números sean reales.':`Hace ${ds} días no revisas cuánto tienes de verdad. Si algún gasto se te pasó, aquí aparece.`,a:'cuadrar',al:'Cuadrar ahora'});
  for(const p of progsActivos()){const pl=planProg(p);const dias=Math.round((parseISO(p.fecha)-today())/DAY);
    if(pl[0]&&pl[0].fecha<=today())out.push({tono:'warn',t:`Hoy toca apartar ${fmt(pl[0].monto)} para ${p.nombre.toLowerCase()}`,x:`Faltan ${dias>0?dias+' días':'muy poco'} y llevas ${fmt(p.apartado||0)} de ${fmt(p.monto)}.${pl.length>1?` Después: ${pl.slice(1,3).map(z=>`${fdate(z.fecha)} ${fmt(z.monto)}`).join(', ')}.`:''}`,a:'progApartar',id:p.id,al:'Apartar'});
    else if(dias<=3&&(p.apartado||0)>=p.monto)out.push({tono:'ok',t:`${p.nombre}: listo`,x:`Ya tienes los ${fmt(p.monto)} apartados. Cuando lo pagues, márcalo.`,a:'progPagar',id:p.id,al:'Ya lo pagué'});}
  const md0=metaDiaria(r);
  if(md0&&md0.falta>0)out.push({tono:md0.prom&&md0.prom<md0.meta?'warn':'ok',t:`Meta por día de trabajo: ${fmt(md0.meta)}`,x:`Te quedan unos ${md0.restantes} días de trabajo hasta el ${fdate(cEnd(k))} para cubrir ${fmt(md0.falta)} entre pagos y gastos del día a día.${md0.prom?` Tu promedio neto es ${fmt(md0.prom)} por día${md0.prom<md0.meta?`: te faltan ${fmt(md0.meta-md0.prom)} diarios, o ${Math.ceil(md0.falta/md0.prom)-md0.restantes} día${Math.ceil(md0.falta/md0.prom)-md0.restantes>1?'s':''} más de trabajo`:', vas bien'}.`:''}`});
  else if(r.libre<0){let x=`Te faltan ${fmt(-r.libre)} para cubrir los pagos de este ciclo.`;for(const f of c.fuentes||[]){const p=promExtra(f.id);if(p&&p.prom>0){const n=Math.ceil(-r.libre/p.prom);x+=` Con ${f.nombre.toLowerCase()} (${fmt(p.prom)} neto en promedio) son unas ${n} jornada${n>1?'s':''}.`;break;}}out.push({tono:'bad',t:'Este ciclo no cierra todavía',x});}
  const base=proyectar(null,0);
  if(base.ok&&deudas().some(d=>d.saldo>0)){
    for(const f of c.fuentes||[]){const p=promExtra(f.id);
      if(p&&p.prom>0){const lines=[2,4].map(n=>{const pr=proyectar(null,p.prom*n);const ah=pr.fin&&base.fin?Math.round((cStart(base.fin)-cStart(pr.fin))/DAY/30):0;return pr.ok?`<li><b>${n} jornadas más al mes</b> (≈${fmt(p.prom*n)}): libre en ${finLabel(pr)}${ah>0?`, ${ah} mes${ah>1?'es':''} antes`:''}, y ahorras ${fmt(base.intereses-pr.intereses)} en intereses.</li>`:'';}).join('');
        out.push({tono:'ok',t:`Acelera con ${f.nombre.toLowerCase()}`,x:`Hoy quedas libre de deudas en ${finLabel(base)}. Si lo neto de ${f.nombre.toLowerCase()} va directo a la deuda:<ul>${lines}</ul>`,html:true});}
      else out.push({tono:'ok',t:`Registra tus jornadas de ${f.nombre.toLowerCase()}`,x:'Con dos o tres registros te calculo cuántos meses adelantas si metes esa plata a la deuda.'});}
  }
  const pres=c.presupuestos||{};const tr=Math.max(1,Math.round((today()-cStart(k))/DAY)+1),dias=cDays(k);
  if(r.hormiga>0){const proy=Math.round(r.hormiga/tr*dias);if(pres.hormiga&&proy>pres.hormiga)out.push({tono:'warn',t:'Ojo con los gastos hormiga',x:`Llevas ${fmt(r.hormiga)} en ${r.hormigaN} compras. A este ritmo cierras el ciclo en ${fmt(proy)} y tu tope es ${fmt(pres.hormiga)}. Bajar uno al día te deja ${fmt(r.hormiga/r.hormigaN*(dias-tr))} más.`});}
  const grupos=agruparCats(r.porCat,pres);
  for(const g of grupos){for(const x of [g,...g.kids]){if(x.id==='hormiga')continue;if(x.p&&x.v>x.p)out.push({tono:'warn',t:`Te pasaste en ${x.n.toLowerCase()}`,x:`Llevas ${fmt(x.v)} y el tope del ciclo es ${fmt(x.p)}.`});}}
  const tg=grupos.filter(g=>g.id!=='sinregistrar'&&g.id!=='_');const totG=tg.reduce((a,g)=>a+g.v,0);
  if(tg[0]&&totG>0&&tg[0].v/totG>0.35&&r.gastos>netoPorPago()*0.1){const g=tg[0];const top=g.kids.slice().sort((a,b)=>b.v-a.v)[0];out.push({tono:'warn',t:`Donde más se te va: ${g.n.toLowerCase()}`,x:`${Math.round(g.v/totG*100)}% de tus gastos del ciclo (${fmt(g.v)})${top&&top.v?`, sobre todo en ${top.n.toLowerCase()} (${fmt(top.v)})`:''}. Ponle un tope en Ajustes si quieres controlarlo.`});}
  if(r.credito>0)out.push({tono:'bad',t:'Usaste tarjeta de crédito',x:`Este ciclo cargaste ${fmt(r.credito)} a crédito. Eso alarga la fecha en que quedas libre.`});
  const prox=r.obs.filter(o=>!o.estado&&o.due>=today()&&(o.due-today())/DAY<=7);const tot=prox.reduce((a,o)=>a+o.monto,0);
  if(tot>0&&tot>r.disponible)out.push({tono:'warn',t:'Pagos de esta semana',x:`Vencen ${fmt(tot)} en los próximos 7 días y hoy tienes ${fmt(r.disponible)} disponible.`});
  const col=metas()[0];if(col&&col.meta>(col.ahorrado||0)&&r.libre>netoPorPago()*0.25)out.push({tono:'ok',t:`Aparta para ${col.nombre.toLowerCase()}`,x:`Te sobran ${fmt(r.libre)} este ciclo. Apartar ${fmt(Math.round(r.libre*0.3/10000)*10000)} te acerca a la meta sin apretarte.`,a:'apartar',id:col.id,al:'Apartar'});
  const cards=deudas().filter(d=>d.tipo==='tarjeta'&&d.saldo>0).sort((a,b)=>(b.tasa||0)-(a.tasa||0));
  if(cards.length>1)out.push({tono:'ok',t:'En qué orden pagar',x:`Paga el mínimo de todas y lo extra a <b>${esc(cards[0].nombre)}</b> (${((cards[0].tasa||0)*100).toFixed(2)}% mensual). Pide que el abono sea a capital reduciendo plazo.`,html:true});
  if(!out.length)out.push({tono:'ok',t:'Vas bien',x:'Todo en orden por ahora. Sigue registrando lo del día a día.'});
  return out;
}
function tipHTML(t){return `<div class="tip ${t.tono==='ok'?'':t.tono}"><h3>${esc(t.t)}</h3><div class="muted small">${t.html?t.x:esc(t.x)}</div>${t.a?`<div style="margin-top:8px"><button class="btn sm" data-action="${t.a}" ${t.id?`data-id="${esc(t.id)}"`:''}>${esc(t.al)}</button></div>`:''}</div>`;}

/* ================= render ================= */
function render(){
  if(tab==='deudas'&&document.activeElement&&document.activeElement.type==='range'&&$('#view-deudas').contains(document.activeElement))return;
  if(!loaded)return;
  const setup=!S.config||!S.config.onboarded;
  $('#view-setup').hidden=!setup;$('#tabs').hidden=setup;$('#fab').hidden=setup;
  $$('main[id^="view-"]').forEach(m=>{if(m.id!=='view-setup')m.hidden=setup||m.id!=='view-'+tab;});
  if(setup){$('#cycleLabel').textContent='Configuración inicial';renderSetup();return;}
  $('#cycleLabel').textContent=`${cfg().perfil.nombre?cfg().perfil.nombre+' · ':''}Ciclo ${cRange(curKey())}`;
  if(!viewKey)viewKey=curKey();
  ({hoy:renderHoy,ciclo:renderCiclo,deudas:renderDeudas,consejos:renderConsejos,ajustes:renderAjustes})[tab]();
}
function go(t){tab=t;if(t==='ajustes')built.ajustes=false;$$('nav.tabs [data-tab]').forEach(b=>b.dataset.tab===t?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));window.scrollTo({top:0});render();}

function cuentasHTML(){return `<div class="acct">${(cfg().cuentas||[]).map(c=>`<div><div class="label">${esc(c.nombre)}</div><div class="v ${saldo(c.id)<0?'neg':''}">${fmt(saldo(c.id))}</div></div>`).join('')}</div>`;}
function renderHoy(){
  const k=curKey(),r=resumen(k),dias=Math.max(1,Math.round((cEnd(k)-today())/DAY)+1);
  const tot=deudas().reduce((a,d)=>a+Math.max(0,d.saldo),0),ini=cfg().deudaInicial||tot,pct=ini>0?Math.min(100,Math.max(0,(1-tot/ini)*100)):100;
  const p=proyectar(null,0),pf=prestamosFin();
  const tips=consejos().slice(0,2);
  const prox=r.obs.filter(o=>!o.estado).slice(0,5);const cobs=cobrosDe(k).filter(x=>!x.recibido);
  const movs=Object.values(S.cycles).flatMap(c=>c.movs.map(v=>({...v,k:c.key}))).sort((a,b)=>(b.fecha+b.id).localeCompare(a.fecha+a.id)).slice(0,6);
  const ph=puedesHoy(),rch=racha(),ap=aporteDeudas(k);
  const phMsg=ph.estado==='verde'?`Tu presupuesto de hoy es ${fmt(ph.pres)}${ph.gh?` y llevas ${fmt(ph.gh)}`:''}. Vas bien.`
    :ph.estado==='amarillo'?`Ya usaste ${fmt(ph.gh)} de ${fmt(ph.pres)}. Tranqui con lo que queda.`
    :r.libre<0||ph.base<=0?(ph.md&&ph.md.falta?`Hoy no hay margen para gastos extra. Primero la meta del día: ${fmt(ph.md.meta)}.`:'Este ciclo todavía no cierra: no hay margen para gastos extra.')
    :`Te pasaste ${fmt(-ph.restante)} de lo de hoy. Mañana el presupuesto baja un poco.`;
  $('#view-hoy').innerHTML=`
  <section class="light ${ph.estado}" aria-live="polite"><div class="lbl"><span class="lamp"></span>Hoy puedes gastar</div><div class="big">${fmt(Math.max(0,ph.restante))}</div><div class="sm">${esc(phMsg)}</div>
    <div class="btns" style="margin-top:6px"><button class="btn sm" style="background:rgba(255,255,255,.95);color:#14201A" data-action="nuevo">Registrar gasto</button>${conDias()&&fuentePrincipal()?`<button class="btn sm" style="background:rgba(255,255,255,.2);color:#fff" data-action="midia">Registrar mi día</button>`:''}</div></section>
  ${rch||ap||tot>0?`<div class="badges">${rch?`<div class="badge">🔥 <span><b>${rch}</b> día${rch>1?'s':''} seguidos registrando</span></div>`:''}${ap?`<div class="badge">💪 <span>Le metiste <b>${fmt(ap)}</b> a deudas este ciclo</span></div>`:''}${tot>0&&ini>0?`<div class="badge">📉 <span><b>${pct.toFixed(0)}%</b> de tu deuda pagada</span></div>`:''}</div>`:''}
  ${tot>0?`<section class="hero"><div class="label">Libre de deudas en</div><div class="big">${p.ok?finLabel(p):'Revisa el plan'}</div>
    <div class="sub">${p.ok?`Con lo que planeas pagar. Intereses que faltan: ${fmt(p.intereses)}.`:'Con lo que pagas hoy, los intereses le ganan al abono.'}</div>
    <div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div><div class="row" style="margin-top:8px;font-size:.85rem"><span>Debes ${fmt(tot)}</span><span>${pct.toFixed(0)}% pagado</span></div>
    ${pf.map(x=>`<div class="sub" style="margin-top:6px">${esc(x.d.nombre)}: ${x.n} cuota${x.n>1?'s':''}, termina en ${mlabel(x.fecha)}.</div>`).join('')}</section>`:''}
  <section class="card stack">
    <div class="row"><div><div class="label">Te queda libre este ciclo</div><div class="libre ${r.libre<0?'neg':'pos'}">${fmt(r.libre)}</div></div>
      <div style="text-align:right"><div class="label">Por día</div><div class="amt">${fmt(Math.max(0,r.libre/dias))}</div><div class="muted" style="font-size:.78rem">${dias} día${dias>1?'s':''} al próximo pago</div></div></div>
    ${cuentasHTML()}
    <div class="muted small">Tienes ${fmt(totalCuentas())} en tus cuentas${reservado()?`, ${fmt(reservado())} apartado para metas`:''}. Ya descontados ${fmt(r.pendientes)} de pagos pendientes${r.progPend?` y ${fmt(r.progPend)} que debes apartar para gastos programados`:''}${r.sueldoEsp?` y sumado el pago de ${fmt(r.sueldoEsp)} que te llega`:''}${r.cobrosPend?`, más ${fmt(r.cobrosPend)} que te van a pasar`:''}.</div>
    ${(()=>{const md=metaDiaria(r);if(!md)return '';const pct=md.meta?Math.min(100,md.hoy/md.meta*100):100;return `<div class="ed" style="gap:6px"><div class="row"><div><div class="label">Meta de hoy en ${esc(md.f.nombre.toLowerCase())}</div><div class="amt" style="font-size:1.3rem">${md.falta?fmt(md.meta):'Cubierto'}</div></div><div style="text-align:right"><div class="label">Llevas hoy</div><div class="amt pos" style="font-size:1.3rem">${fmt(md.hoy)}</div></div></div><div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div><div class="muted" style="font-size:.78rem">${md.falta?`Te faltan ${fmt(md.falta)} en ~${md.restantes} días de trabajo: pagos de este ciclo, lo que vence a inicio del próximo (${fmt(md.prox)})${md.vida?` y tu gasto diario (~${fmt(md.vida)})`:''}, descontando lo que ya tienes.`:'Ya cubriste lo que viene. Lo que hagas de más va a deudas y ahorro.'}</div></div>`;})()}
    <div class="btns">${conDias()&&fuentePrincipal()?`<button class="btn sm" data-action="midia">Registrar mi día</button>`:''}${r.sueldoEsp?`<button class="btn sm" data-action="sueldo">Me pagaron</button>`:''}<button class="btn ghost sm" data-action="cuadrar">Cuadrar cuentas</button><button class="btn ghost sm" data-action="mover">Pasar plata entre cuentas</button></div>
  </section>
  ${tips.map(tipHTML).join('')}
  <section class="card"><div class="row"><h2>Próximos pagos</h2><button class="btn ghost sm" data-go="ciclo">Ver todo</button></div>
    <div class="list">${prox.length?prox.map(o=>itemObl(k,o)).join(''):'<div class="empty">Todo lo de este ciclo está pagado.</div>'}</div></section>
  ${cobs.length?`<section class="card"><h2>Te van a pasar plata</h2><div class="list">${cobs.map(x=>`<div class="item"><div class="grow"><div class="t">${esc(x.quien)}</div><div class="s">${esc(x.concepto)} · va a ${esc(deuda(x.destino)?.nombre||'')}</div></div><span class="amt">${fmt(x.monto)}</span><button class="btn sm" data-action="recibir" data-id="${esc(x.id)}" data-k="${k}">Recibí</button></div>`).join('')}</div></section>`:''}
  ${metasHTML()}
  <section class="card"><h2>Últimos movimientos</h2><div class="list">${movs.length?movs.map(v=>itemMov(v.k,v)).join(''):'<div class="empty">Toca <b>+</b> para registrar un gasto, un ingreso o lo que hiciste extra.</div>'}</div></section>`;
}
function metasHTML(){const ms=metas();if(!ms.length)return '';return `<section class="card stack"><h2>Metas de ahorro</h2>${ms.map(m=>{const p=m.meta?Math.min(100,(m.ahorrado||0)/m.meta*100):0;return `<div class="stack" style="gap:6px"><div class="row"><b>${esc(m.nombre)}</b><span class="amt">${fmt(m.ahorrado||0)} <span class="muted" style="font-weight:500">de ${fmt(m.meta)}</span></span></div><div class="bar"><i style="width:${p.toFixed(1)}%"></i></div><div class="btns"><button class="btn ghost sm" data-action="apartar" data-id="${esc(m.id)}">Apartar</button>${m.ahorrado?`<button class="btn ghost sm" data-action="liberar" data-id="${esc(m.id)}">Usar esta plata</button>`:''}</div></div>`;}).join('')}</section>`;}
function pillObl(o){if(o.estado?.aplazado)return '<span class="pill soft">Pasa al otro ciclo</span>';if(o.estado)return '<span class="pill ok">Pagado</span>';const d=Math.round((o.due-today())/DAY);if(d<0)return `<span class="pill bad">Vencido hace ${-d} d</span>`;if(d<=3)return `<span class="pill warn">${d===0?'Hoy':'En '+d+' d'}</span>`;return `<span class="pill soft">${fdate(o.due)}</span>`;}
function itemObl(k,o){const sub=o.fam?`Tuyo ${fmt(o.propio)} + te pasan ${fmt(o.fam)}`:(o.extra?'Solo este ciclo':`Cada ${o.dia}`);
  return `<div class="item"><div class="grow"><div class="t">${esc(o.nombre)}</div><div class="s">${esc(sub)} · vence ${fdate(o.due)}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="amt">${fmt(o.estado?.monto??o.monto)}</span>${pillObl(o)}</div>${o.estado?'':`<button class="btn sm" data-action="pagar" data-id="${esc(o.id)}" data-k="${k}">Pagar</button>`}</div>`;}
const cuentaN=id=>(cfg().cuentas||[]).find(c=>c.id===id)?.nombre||deuda(id)?.nombre||'—';
function catN(id){if(id==='sinregistrar')return CAT_SR.n;const c=catObj(id);if(!c)return 'Sin categoría';const p=c.padre&&catObj(c.padre);return p?`${p.nombre} · ${c.nombre}`:c.nombre;}
const ingN=id=>(catsI().find(x=>x.id===id)||{nombre:'Ingreso'}).nombre;
function medios(v){return (v.fx||[]).filter(f=>f.k==='cuenta'||f.k==='deuda').map(f=>cuentaN(f.id)).join(' + ');}
function itemMov(k,v){
  let t='',s='',sign='−',cls='';const d=parseISO(v.fecha);
  if(v.t==='gasto'){t=v.nota||catN(v.cat);s=`${catN(v.cat)} · ${medios(v)}`;cls='neg';}
  else if(v.t==='ingreso'){t=v.nota||ingN(v.cat);s=`${ingN(v.cat)} · ${medios(v)}`;sign='+';cls='pos';}
  else if(v.t==='extra'){const f=(cfg().fuentes||[]).find(x=>x.id===v.fuente);t=`${f?.nombre||'Ingreso extra'}`;s=`Bruto ${fmt(v.bruto)} · costos ${fmt((v.bruto||0)-v.monto)} · ${medios(v)}`;sign='+';cls='pos';}
  else if(v.t==='pago'){t=v.nombre;s=`Pago · ${medios(v)}`;}
  else if(v.t==='abono'){t='Abono a '+(deuda(v.deudaId)?.nombre||'deuda');s=`Extra a capital · ${medios(v)}`;}
  else if(v.t==='apartar'){const pg=v.progId&&progs().find(p=>p.id===v.progId);t=(v.monto<0?'Usaste: ':'Apartado: ')+(pg?pg.nombre:(metas().find(m=>m.id===v.metaId)?.nombre||'meta'));s=pg?'Gasto programado':'Meta de ahorro';sign=v.monto<0?'+':'−';}
  else if(v.t==='mover'){t=`${cuentaN(v.de)} → ${cuentaN(v.a)}`;s='Movimiento entre cuentas';sign='';}
  else if(v.t==='ajuste'){t='Cuadre de cuentas';s=v.monto<0?'Plata que no aparecía registrada':'Había más de lo registrado';sign=v.monto<0?'−':'+';cls=v.monto<0?'neg':'pos';}
  const ic=v.t==='gasto'?ico(catIcon(v.cat),catColor(v.cat)):ico(MOV_ICO[v.t]||'•',v.t==='ingreso'||v.t==='extra'?'#3D9970':v.t==='ajuste'&&v.monto<0?'#D6457A':'#5C7080');
  return `<div class="item">${ic}<div class="grow"><div class="t">${esc(t)}</div><div class="s">${fdate(d)} · ${esc(s)}</div></div><span class="amt ${cls}">${sign}${fmt(Math.abs(v.monto))}</span><button class="x" data-action="borrar" data-id="${esc(v.id)}" data-k="${k}" aria-label="Borrar movimiento">✕</button></div>`;
}
function renderCiclo(){
  const k=viewKey,r=resumen(k),c=C(k),pres=cfg().presupuestos||{};
  const cats=agruparCats(r.porCat,pres);const max=Math.max(1,...cats.map(x=>Math.max(x.v,x.p)));
  const bar=(x,sub)=>`<div class="catbar${sub?' sub':''}"><span>${sub?'':esc(x.id==='_'?'•':catIcon(x.id))+' '}${esc(x.n)}</span><span class="amt">${fmt(x.v)}${x.p?` <span class="muted" style="font-weight:500">/ ${fmt(x.p)}</span>`:''}</span><div class="bar"><i class="${x.p&&x.v>x.p?'over':''}" style="width:${(x.v/max*100).toFixed(1)}%;${x.p&&x.v>x.p?'':`background:${catColor(x.id)}`}"></i>${x.p?`<b style="left:${Math.min(99.5,x.p/max*100).toFixed(1)}%"></b>`:''}</div></div>`;
  const movs=[...c.movs].sort((a,b)=>(b.fecha+b.id).localeCompare(a.fecha+a.id));
  $('#view-ciclo').innerHTML=`
  <div class="row"><button class="btn ghost sm" data-action="ciclo" data-d="-1">‹ Anterior</button><h2 style="text-align:center">${cRange(k)}</h2><button class="btn ghost sm" data-action="ciclo" data-d="1">Siguiente ›</button></div>
  <div class="tiles">
    <div class="tile"><div class="label">${r.futuro?'Te va a entrar':'Entró'}</div><div class="v pos">${fmt(r.futuro?(r.esperado||0)+r.cobrosPend:r.ingresos+r.extra)}</div><div class="muted" style="font-size:.78rem">${r.extra?`Extra ${fmt(r.extra)} en ${r.extraN} día${r.extraN>1?'s':''}`:' '}</div></div>
    <div class="tile"><div class="label">Gastos</div><div class="v neg">${fmt(r.gastos+r.sinReg)}</div><div class="muted" style="font-size:.78rem">${r.credito?`${fmt(r.credito)} con tarjeta de crédito`:'Nada a crédito'}</div></div>
    <div class="tile"><div class="label">Pagos y abonos</div><div class="v">${fmt(r.pagos+r.abonos)}</div><div class="muted" style="font-size:.78rem">Pendiente ${fmt(r.pendientes)}</div></div>
    <div class="tile"><div class="label">${r.futuro?'Libre proyectado':'Libre'}</div><div class="v ${r.libre!=null&&r.libre<0?'neg':'pos'}">${r.libre==null?'—':fmt(r.libre)}</div><div class="muted" style="font-size:.78rem">${r.libre==null?'Ciclo cerrado':'Después de los pagos'}</div></div>
  </div>
  <section class="card stack"><div class="row"><h2>Calendario</h2><div class="legend"><span><span class="dot" style="--c:var(--debt)"></span>Por pagar</span><span><span class="dot" style="--c:var(--accent)"></span>Pagado</span>${conSueldo()?'<span><span class="dot" style="--c:var(--warn)"></span>Te pagan</span>':''}${progsActivos().length?'<span><span class="dot" style="--c:#9B5DE5"></span>Programado</span>':''}</div></div>${calHTML(k,r.obs)}<div id="calInfo" class="muted small">Toca un día para ver qué pasa ese día.</div></section>
  ${resumenHTML(k,r)}
  <section class="card"><h2>Pagos del ciclo</h2><div class="list">${r.obs.length?r.obs.map(o=>itemObl(k,o)).join(''):'<div class="empty">Sin pagos en este ciclo.</div>'}</div></section>
  <section class="card stack"><h2>¿En qué se fue la plata?</h2>${cats.length?donaSVG(cats):''}
    ${cats.length?cats.map(x=>bar(x,false)+x.kids.sort((a,b)=>b.v-a.v).map(kd=>bar(kd,true)).join('')).join(''):'<div class="empty">Sin gastos en este ciclo.</div>'}
  </section>
  ${trabajoHTML()}
  <section class="card"><h2>Movimientos</h2><div class="list">${movs.length?movs.map(v=>itemMov(k,v)).join(''):'<div class="empty">Sin movimientos.</div>'}</div></section>`;
  const xb=$('#xlsBtn');if(xb)xb.onclick=()=>descargarExcel(k,xb);
}
const DSEM=['L','M','X','J','V','S','D'],DSEML=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
function calHTML(k,obs){const s=cStart(k),e=cEnd(k),hoy=iso(today());const lead=(s.getDay()+6)%7;let h=DSEM.map(d=>`<div class="h">${d}</div>`).join('')+'<div></div>'.repeat(lead);
  const pgs=progsActivos();
  for(let d=s;d<=e;d=addDays(d,1)){const di=iso(d);const ob=obs.filter(o=>iso(o.due)===di);const pgD=pgs.filter(p=>p.fecha===di).length+pgs.filter(p=>planProg(p).some(x=>iso(x.fecha)===di)).length;const pay=conSueldo()&&paydays().includes(d.getDate())||(conSueldo()&&iso(cStart(k))===di);
    h+=`<button type="button" data-action="dia" data-d="${di}" data-k="${k}" class="${di===hoy?'hoy':''} ${di<hoy?'pasado':''}" aria-label="${fdate(d)}${ob.length?`, ${ob.length} pago(s)`:''}">${d.getDate()}<span class="dots">${pay?'<i class="pay"></i>':''}${pgD?'<i class="prog"></i>':''}${ob.slice(0,3).map(o=>`<i class="${o.estado?'ok':''}"></i>`).join('')}</span></button>`;}
  return `<div class="cal">${h}</div>`;}
function infoDia(k,di){const obs=obligaciones(k).filter(o=>iso(o.due)===di);const movs=(S.cycles[keyOf(parseISO(di))]?.movs||[]).filter(v=>v.fecha===di);const d=parseISO(di);
  const pg=progsActivos().flatMap(p=>[...(p.fecha===di?[`<div class="item">${ico(catIcon(p.cat),catColor(p.cat))}<div class="grow"><div class="t">${esc(p.nombre)}</div><div class="s">Gasto programado</div></div><span class="amt">${fmt(p.monto)}</span></div>`]:[]),...planProg(p).filter(x=>iso(x.fecha)===di).map(x=>`<div class="item">${ico('🐷','#9B5DE5')}<div class="grow"><div class="t">Apartar para ${esc(p.nombre)}</div><div class="s">Según tu plan</div></div><span class="amt">${fmt(x.monto)}</span></div>`)]).join('');
  return `<div class="stack" style="gap:6px"><b style="color:var(--ink)">${DSEML[(d.getDay()+6)%7]} ${fdate(d)}</b>${obs.map(o=>itemObl(k,o)).join('')}${pg}${movs.map(v=>itemMov(keyOf(d),v)).join('')}${!obs.length&&!movs.length&&!pg?'<span>Nada registrado ni por pagar este día.</span>':''}</div>`;}
function donaSVG(groups){const g=groups.filter(x=>x.v>0);const tot=g.reduce((a,x)=>a+x.v,0);if(!tot)return '';const R=52,C=2*Math.PI*R;let off=0;
  const segs=g.map(x=>{const len=x.v/tot*C;const s=`<circle r="${R}" cx="70" cy="70" fill="none" stroke="${x.id==='_'?'#5C7080':catColor(x.id)}" stroke-width="22" stroke-dasharray="${Math.max(0,len-1.5).toFixed(2)} ${(C-len+1.5).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"><title>${esc(x.n)}: ${fmt(x.v)}</title></circle>`;off+=len;return s;}).join('');
  return `<div class="row" style="align-items:center;gap:16px;flex-wrap:wrap"><svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Distribución de gastos por categoría" style="flex:none">${segs}<text x="70" y="66" text-anchor="middle" font-size="10" fill="var(--muted)">Total</text><text x="70" y="82" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${fmt(tot)}</text></svg>
  <div class="legend" style="flex-direction:column;flex:1;min-width:150px">${g.slice(0,7).map(x=>`<span><span class="dot" style="--c:${x.id==='_'?'#5C7080':catColor(x.id)}"></span>${esc(x.n)} <b style="margin-left:auto">${Math.round(x.v/tot*100)}%</b></span>`).join('')}</div></div>`;}
function trabajoHTML(){const all=Object.values(S.cycles).flatMap(c=>c.movs).filter(v=>v.t==='extra');if(!all.length)return '';
  const desde90=iso(addDays(today(),-90)),desde30=iso(addDays(today(),-30));const v90=all.filter(v=>v.fecha>=desde90);const by=Array.from({length:7},()=>({s:0,n:0}));
  for(const v of v90){const w=(parseISO(v.fecha).getDay()+6)%7;by[w].s+=v.monto;by[w].n++;}const avg=by.map(b=>b.n?b.s/b.n:0);const max=Math.max(1,...avg);const best=avg.indexOf(Math.max(...avg));
  const v30=all.filter(v=>v.fecha>=desde30);const tot30=v30.reduce((a,v)=>a+v.monto,0),bruto30=v30.reduce((a,v)=>a+(v.bruto||0),0);const dias30=new Set(v30.map(v=>v.fecha)).size;
  const hrs=v90.filter(v=>v.horas>0);const porHora=hrs.length?hrs.reduce((a,v)=>a+v.monto,0)/hrs.reduce((a,v)=>a+v.horas,0):0;
  const W=300,H=130,bw=30,gap=(W-7*bw)/6;
  const bars=avg.map((a,i)=>{const h=a/max*(H-34);const x=i*(bw+gap);return `<rect x="${x.toFixed(1)}" y="${(H-18-h).toFixed(1)}" width="${bw}" height="${Math.max(h,a?2:0).toFixed(1)}" rx="6" fill="${i===best&&a?'var(--accent)':'var(--surface2)'}" stroke="${i===best&&a?'none':'var(--line)'}"/><text x="${x+bw/2}" y="${H-4}" text-anchor="middle" font-size="11" fill="var(--muted)">${DSEM[i]}</text>${a?`<text x="${x+bw/2}" y="${(H-22-h).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--ink)">${Math.round(a/1000)}k</text>`:''}`;}).join('');
  return `<section class="card stack"><h2>Tu trabajo por días</h2>
  <div class="tiles"><div class="tile"><div class="label">Últimos 30 días</div><div class="v pos">${fmt(tot30)}</div><div class="muted" style="font-size:.78rem">neto en ${dias30} día${dias30===1?'':'s'} · bruto ${fmt(bruto30)}</div></div>
  <div class="tile"><div class="label">${porHora?'Por hora':'Por día'}</div><div class="v">${fmt(porHora||(dias30?tot30/dias30:0))}</div><div class="muted" style="font-size:.78rem">${porHora?'neto, en días con horas registradas':'neto promedio'}</div></div></div>
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Promedio neto por día de la semana">${bars}</svg>
  ${avg[best]?`<p class="small">Tu mejor día es el <b>${DSEML[best]}</b>: ${fmt(avg[best])} neto en promedio. ${avg.filter(a=>a).length>2?`El más flojo es el ${DSEML[avg.indexOf(Math.min(...avg.filter(a=>a)))]}.`:''}</p>`:''}
  <p class="muted" style="font-size:.78rem">Promedio de los últimos 90 días. Anota las horas al registrar tu día para ver cuánto te deja cada hora.</p></section>`;}
function resumenHTML(k,r){if(r.futuro)return '';const kp=addCycle(k,-1),rp=resumen(kp);const g=r.gastos+r.sinReg,gp=rp.gastos+rp.sinReg;
  const pres=cfg().presupuestos||{};const a=agruparCats(r.porCat,pres),b=agruparCats(rp.porCat,pres);let sube=null;for(const x of a){const y=b.find(z=>z.id===x.id);const d=x.v-(y?y.v:0);if(d>0&&(!sube||d>sube.d))sube={n:x.n,d};}
  const entro=r.ingresos+r.extra,ap=aporteDeudas(k);const ahorro=entro-g-r.pagos-r.abonos;
  return `<section class="card stack"><div class="row"><h2>Resumen del ciclo</h2>${dlFn?`<button class="btn ghost sm" id="xlsBtn">Descargar Excel</button>`:''}</div>
  <div class="list">
    <div class="item"><div class="grow">Entró</div><span class="amt pos">${fmt(entro)}</span></div>
    <div class="item"><div class="grow">Gastos del día a día</div><span class="amt neg">${fmt(g)}</span>${gp?`<span class="pill ${g>gp?'bad':'ok'}">${g>gp?'+':''}${Math.round((g-gp)/gp*100)}% vs anterior</span>`:''}</div>
    <div class="item"><div class="grow">Pagos fijos y deudas</div><span class="amt">${fmt(r.pagos+r.abonos)}</span></div>
    <div class="item"><div class="grow">De eso, a deudas</div><span class="amt">${fmt(ap)}</span></div>
    <div class="item"><div class="grow">Diferencia (lo que entró menos lo que salió)</div><span class="amt ${ahorro<0?'neg':'pos'}">${fmt(ahorro)}</span></div>
  </div>${sube&&gp?`<p class="small">Lo que más subió frente al ciclo anterior: <b>${esc(sube.n)}</b> (+${fmt(sube.d)}).</p>`:''}</section>`;}
async function descargarExcel(k,btn){btn.disabled=true;btn.textContent='Preparando…';
  try{if(!window.XLSX)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');const X=window.XLSX,r=resumen(k),c=C(k);
    const tipoN={gasto:'Gasto',ingreso:'Ingreso',extra:'Trabajo por días',pago:'Pago',abono:'Abono a deuda',apartar:'Ahorro apartado',mover:'Movimiento entre cuentas',ajuste:'Cuadre'};
    const movs=[...c.movs].sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(v=>[v.fecha,tipoN[v.t]||v.t,v.t==='gasto'?catN(v.cat):v.t==='ingreso'?ingN(v.cat):'',v.nota||v.nombre||'',(['ingreso','extra'].includes(v.t)?1:v.t==='ajuste'?Math.sign(v.monto):-1)*Math.abs(v.monto),medios(v)]);
    const wb=X.utils.book_new();const add=(n,rows)=>X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(rows),n);
    add('Resumen',[['Cuentas Claras',cfg().perfil.nombre||''],['Ciclo',cRange(k)],[],['Entró',r.ingresos+r.extra],['Gastos',r.gastos+r.sinReg],['Pagos y abonos',r.pagos+r.abonos],['A deudas',aporteDeudas(k)],['Pendiente por pagar',r.pendientes]]);
    add('Movimientos',[['Fecha','Tipo','Categoría','Detalle','Valor','Cuenta / medio'],...movs]);
    add('Categorías',[['Categoría','Gastado','Tope'],...agruparCats(r.porCat,cfg().presupuestos||{}).flatMap(x=>[[x.n,x.v,x.p||''],...x.kids.map(kd=>['   '+kd.n,kd.v,kd.p||''])])]);
    add('Deudas',[['Deuda','Tipo','Saldo','Interés mensual','Pago al mes','Día'],...deudas().map(d=>[d.nombre,d.tipo==='tarjeta'?'Tarjeta':'Préstamo',d.saldo,d.tasa||0,d.pago||0,d.dia])]);
    add('Cuentas',[['Cuenta','Saldo'],...(cfg().cuentas||[]).map(x=>[x.nombre,saldo(x.id)])]);
    const buf=X.write(wb,{bookType:'xlsx',type:'array'});await dlFn.save({filename:`cuentas-claras-${k}.xlsx`,data:new Uint8Array(buf)});toast('Excel listo');}
  catch(e){toast(e?.code==='declined'?'Descarga cancelada':'No se pudo generar el Excel');}
  finally{btn.disabled=false;btn.textContent='Descargar Excel';}}
function renderDeudas(){
  const ds=deudas(),hayT=ds.some(d=>d.tipo==='tarjeta'&&d.saldo>0),base=ds.filter(d=>d.tipo==='tarjeta').reduce((a,d)=>a+(d.pago||0),0);if(proj.pago==null)proj.pago=base||300000;
  const em=extraMoto();if(em){if(proj.netoDia==null)proj.netoDia=Math.round((em.prom||0)/1000)*1000;if(proj.dias==null)proj.dias=0;proj.extra=proj.dias*(proj.netoDia||0);}
  const P=hayT?proj.pago:null;const a=proyectar(P,0),b=proyectar(P,proj.extra);
  $('#view-deudas').innerHTML=`
  ${ds.some(d=>d.saldo>0)?`<section class="card stack"><div class="row"><h2>¿Cuándo quedas libre de deudas?</h2><span class="pill ${b.ok?'ok':'bad'}" id="pPill">${b.ok?finLabel(b):'No alcanza'}</span></div>
    ${hayT?`<label class="f">Lo que pagas a tarjetas al mes: <span class="amt" style="color:var(--ink)" id="pPagoV">${fmt(proj.pago)}</span><input id="pPago" type="range" min="100000" max="2000000" step="50000" value="${proj.pago}"></label>`:''}
    ${em?`<label class="f">Días extra en ${esc(em.f.nombre.toLowerCase())} al mes: <span class="amt" style="color:var(--ink)" id="pDiasV">${proj.dias} día${proj.dias===1?'':'s'}</span><input id="pDias" type="range" min="0" max="20" step="1" value="${proj.dias}"></label>
      <div class="grid2" style="align-items:end"><label class="f">Te queda libre por día<input id="pNeto" inputmode="numeric" value="${fmt(proj.netoDia)}"></label><div class="small" id="pExtraV">${proj.extra?`= <b>${fmt(proj.extra)}</b> extra al mes`:''}</div></div>
      <div class="muted" style="font-size:.78rem">${em.n?`Según tus ${em.n} día${em.n>1?'s':''} registrados.`:'Aún no registras días: escribe cuánto te queda libre en un día normal.'}</div>`
     :`<label class="f">Plata extra al mes: <span class="amt" style="color:var(--ink)" id="pExtraV">${fmt(proj.extra)}</span><input id="pExtra" type="range" min="0" max="1000000" step="50000" value="${proj.extra}"></label>
      <div class="muted" style="font-size:.78rem">¿Trabajas por días (moto, domicilios)? Agrégalo en Ajustes → Ingresos extra y aquí lo calculas por días.</div>`}
    <div id="chartBox">${chartSVG(a,proj.extra?b:null)}</div><div class="small" id="projTxt">${projTxt(a,b)}</div>
    <div class="muted" style="font-size:.78rem">Lo extra va primero a la deuda con más interés. Incluye cuotas de préstamos, la plata que otros te pasan, cuota de manejo y cargos fijos. Es un estimado: corrígelo con cada extracto.</div></section>`:''}
  ${progsHTML()}
  <section class="card stack"><div class="row"><h2>Leer un extracto</h2></div><p class="muted small">Sube el PDF del extracto o capturas de la app del banco. Saco saldo, mínimo, fecha y compras, y tú decides si actualizo la deuda.</p><div id="extHost"></div></section>
  <div class="row"><h2>Tus deudas</h2><button class="btn sm" data-action="nuevaDeuda">+ Agregar deuda</button></div>
  ${ds.map(d=>{const pr=d.plan?planResumen(d):null;return `<section class="card stack"><div class="row"><div><h2>${esc(d.nombre)}</h2><div class="muted small">${d.tipo==='tarjeta'?`${((d.tasa||0)*100).toFixed(2)}% mensual · pagas ${fmt(d.pago)} el ${d.dia}`:d.plan?(pr?`Próximo pago ${fmt(pr.prox.monto)} el ${fdate(pr.prox.f)} · faltan ${pr.n} de ${pr.tot} cuotas · sale de ${esc(cuentaN(d.cuenta))}`:'Pagada'):`Cuota ${fmt(d.pago)} el ${d.dia}`}</div></div><div style="text-align:right"><div class="label">Saldo</div><div class="amt" style="font-size:1.25rem;color:var(--debt)">${fmt(d.saldo)}</div></div></div>
    ${d.minimo?`<div class="muted small">Último mínimo del banco: ${fmt(d.minimo)}</div>`:''}${d.nota?`<div class="muted small">${esc(d.nota)}</div>`:''}${d.actualizado?`<div class="muted" style="font-size:.78rem">Saldo revisado el ${fdate(parseISO(d.actualizado))}</div>`:''}
    ${d.tipo==='tarjeta'?(()=>{const cs=compras(d).filter(c=>c.saldo>0);const otros=cs.filter(c=>duenos(c).some(o=>o.p!=='yo'));const P=planTarjeta(d);const ajeno=Object.keys(P).filter(p=>p!=='yo').reduce((a,p)=>a+(P[p][0]||0),0);
      return cs.length?`<div class="small">${cs.length} compras${otros.length?` · ${otros.length} compartidas · este mes te pasan ${fmt(ajeno)}`:''}</div>`:'';})():''}
    <div class="btns">${d.tipo==='tarjeta'?`<button class="btn sm" data-action="tarjeta" data-id="${esc(d.id)}">Compras y quién paga</button>`:''}<button class="btn ${d.tipo==='tarjeta'?'ghost ':''}sm" data-action="abonar" data-id="${esc(d.id)}">Abonar extra</button><button class="btn ghost sm" data-action="saldo" data-id="${esc(d.id)}">Corregir saldo</button><button class="btn ghost sm" data-action="editarDeuda" data-id="${esc(d.id)}">Editar</button></div>
    ${pr&&pr.n>1?`<details><summary class="small">Ver plan de pagos</summary><div class="list">${planDeuda(d).map(x=>`<div class="item"><div class="grow"><div class="t">Cuota ${x.i+1}</div><div class="s">${fdate(x.f)} ${x.f.getFullYear()}</div></div><span class="amt">${fmt(x.monto)}</span></div>`).join('')}</div></details>`:''}</section>`;}).join('')||'<div class="card empty">No tienes deudas registradas. Toca "+ Agregar deuda".</div>'}`;
  if(!extNode){extNode=document.createElement('div');mountExtracto(extNode,()=>render());}$('#extHost').appendChild(extNode);
  if($('#chartBox')){let tm=null;const upd=()=>{
      if($('#pPago')){proj.pago=Number($('#pPago').value);$('#pPagoV').textContent=fmt(proj.pago);}
      if($('#pDias')){proj.dias=Number($('#pDias').value);proj.netoDia=num($('#pNeto').value);proj.extra=proj.dias*proj.netoDia;$('#pDiasV').textContent=`${proj.dias} día${proj.dias===1?'':'s'}`;$('#pExtraV').innerHTML=proj.extra?`= <b>${fmt(proj.extra)}</b> extra al mes`:'';}
      else if($('#pExtra')){proj.extra=Number($('#pExtra').value);$('#pExtraV').textContent=fmt(proj.extra);}
      clearTimeout(tm);tm=setTimeout(()=>{const P2=hayT?proj.pago:null;const x=proyectar(P2,0),y=proyectar(P2,proj.extra);$('#chartBox').innerHTML=chartSVG(x,proj.extra?y:null);$('#projTxt').innerHTML=projTxt(x,y);$('#pPill').textContent=y.ok?finLabel(y):'No alcanza';$('#pPill').className='pill '+(y.ok?'ok':'bad');},60);};
    ['#pPago','#pDias','#pExtra','#pNeto'].forEach(s=>{const el=$(s);if(el)el.addEventListener('input',upd);});}
}
/* ===== préstamos y deudas personales con plan de cuotas ===== */
const CADA_D=[['pago','Cada pago de sueldo'],['quincena','Cada quincena'],['mes','Cada mes'],['semana','Cada semana']];
function diasPeriodo(p){return p.cada==='semana'?7:p.cada==='quincena'?15:p.cada==='pago'?30/paydays().length:30;}
const rPlan=d=>d.plan&&d.tasa?d.tasa*diasPeriodo(d.plan)/30:0;
function fechasPlan(d){const p=d.plan;if(!p||!p.inicio)return[];const out=[];let x=parseISO(p.inicio);const d0=x.getDate();
  if(p.cada==='pago'){const s=startOf(x);if(iso(s)!==iso(x))x=nextStart(s);}
  else if(p.cada==='quincena'){const y=x.getFullYear(),m=x.getMonth();x=[new Date(y,m,15),new Date(y,m,daysIn(y,m))].find(z=>z>=x)||new Date(y,m+1,15);}
  for(let i=0;i<Math.min(p.cuotas||1,240);i++){out.push(x);
    if(p.cada==='semana')x=addDays(x,7);
    else if(p.cada==='mes'){const nm=new Date(x.getFullYear(),x.getMonth()+1,1);x=new Date(nm.getFullYear(),nm.getMonth(),Math.min(d0,daysIn(nm.getFullYear(),nm.getMonth())));}
    else if(p.cada==='quincena'){const y=x.getFullYear(),m=x.getMonth();x=[new Date(y,m,15),new Date(y,m,daysIn(y,m)),new Date(y,m+1,15)].find(z=>z>x);}
    else x=nextStart(x)||addDays(x,30);}
  return out;}
function pagadosPlan(d){const s=new Set();for(const c of Object.values(S.cycles))for(const[k,v]of Object.entries(c.pagados||{}))if(k.startsWith(d.id+'#')&&v&&!v.aplazado)s.add(Number(k.split('#')[1]));return s;}
function planDeuda(d,saldoOver){const fs=fechasPlan(d),paid=pagadosPlan(d);const pend=fs.map((f,i)=>({i,f})).filter(x=>!paid.has(x.i));const n=pend.length;const saldo=Math.max(0,saldoOver??d.saldo??0);if(!n||!saldo)return[];
  const r=rPlan(d);let cuota=r?saldo*r/(1-Math.pow(1+r,-n)):saldo/n;cuota=Math.ceil(cuota/1000)*1000;
  if(r)return pend.map(x=>({...x,monto:Math.round(cuota)}));
  let q=saldo;return pend.map((x,j)=>{const m=j===n-1?q:Math.min(q,cuota);q-=m;return{...x,monto:Math.round(m)};}).filter(x=>x.monto>0);}
function obligacionesPlan(d,k){const c=C(k),s=cStart(k),e=cEnd(k),out=[];const fs=fechasPlan(d);const tot=fs.length;const quien=d.acreedor?personaN(d.acreedor):'';
  const base={dia:null,deudaId:d.id,extra:false,fam:0,cuenta:d.cuenta||null};
  fs.forEach((f,i)=>{const id=d.id+'#'+i;const est=c.pagados[id];if(est&&f>=s&&f<=e)out.push({...base,id,nombre:`${d.nombre} (${i+1}/${tot})`,propio:est.monto||0,monto:est.monto||0,due:f,estado:est});});
  for(const x of planDeuda(d)){const id=d.id+'#'+x.i;if(c.pagados[id])continue;const enCiclo=x.f>=s&&x.f<=e;const atrasado=k===curKey()&&x.f<s;
    if(enCiclo||atrasado)out.push({...base,id,nombre:`${d.nombre} (${x.i+1}/${tot})`,propio:x.monto,monto:x.monto,due:x.f,estado:null});}
  return out;}
function planResumen(d){const pl=planDeuda(d);if(!pl.length)return null;return{prox:pl[0],fin:pl[pl.length-1].f,n:pl.length,tot:(d.plan?.cuotas)||pl.length};}
function sheetDeuda(id){const d0=id?deuda(id):null;const esPlan=!d0||!!d0.plan;const tipo0=d0?.tipo==='tarjeta'?'tarjeta':'prestamo';
  const p=d0?.plan||{cuotas:2,cada:'pago',inicio:iso(nextStart(today())||addDays(today(),15))};
  const persOpts=()=>`<option value="">Otra persona o entidad</option>${(cfg().personas||[]).map(x=>`<option value="${esc(x.id)}" ${d0?.acreedor===x.id?'selected':''}>${esc(x.nombre)}</option>`).join('')}`;
  openSheet(`<div class="stack"><h2>${id?'Editar deuda':'Nueva deuda'}</h2>
    ${id?'':`<div class="seg" id="dT">${segBtns([['prestamo','Préstamo o deuda personal'],['tarjeta','Tarjeta de crédito']],'prestamo')}</div>`}
    <div id="dP" class="stack" style="gap:10px" ${tipo0==='tarjeta'?'hidden':''}>
      <div class="grid2"><label class="f">¿A quién le debes?<select id="dQ">${persOpts()}</select></label><label class="f" id="dQnBox">Nombre<input id="dQn" placeholder="Ej: Papá, Bancamía" value="${esc(d0&&!d0.acreedor?d0.nombre.replace(/^Préstamo (de |a )?/,''):'')}"></label></div>
      <div class="grid2"><label class="f">${id?'Lo que debes hoy':'¿Cuánto te prestaron?'}<input id="dM" inputmode="numeric" value="${d0?fmt(d0.saldo):''}" placeholder="$0"></label><label class="f">${id?'Cuotas en total':'¿En cuántas cuotas?'}<input id="dN" inputmode="numeric" data-plain value="${p.cuotas||2}"></label></div>
      <div class="label">¿Cada cuánto pagas?</div><div class="seg" id="dC">${segBtns(CADA_D.map(([v,n])=>[v,n.replace('Cada ','')]),p.cada||'pago')}</div>
      <div class="grid2"><label class="f">Primer pago<input id="dF" type="date" value="${esc(p.inicio)}"></label><label class="f">Interés mensual % (opcional)<input id="dI" inputmode="decimal" value="${d0?.tasa?(d0.tasa*100).toFixed(2):''}" placeholder="0"></label></div>
      <label class="f">¿De dónde sale la plata?<select id="dS">${(cfg().cuentas||[]).map(c=>`<option value="${esc(c.id)}" ${(d0?.cuenta||cfg().ingreso.cuenta)===c.id?'selected':''}>${esc(c.nombre)}${c.id===cfg().ingreso.cuenta&&conSueldo()?' (donde te llega el sueldo)':''}</option>`).join('')}</select></label>
      <div id="dPlan" class="note ok"></div>
    </div>
    <div id="dK" class="stack" style="gap:10px" ${tipo0==='tarjeta'?'':'hidden'}>
      <label class="f">Nombre de la tarjeta<input id="kN" value="${esc(d0?.tipo==='tarjeta'?d0.nombre:'')}" placeholder="Visa *1234"></label>
      <div class="grid2"><label class="f">Saldo hoy<input id="kS" inputmode="numeric" value="${d0?.tipo==='tarjeta'?fmt(d0.saldo):''}" placeholder="$0"></label><label class="f">Día de pago<input id="kD" inputmode="numeric" data-plain value="${d0?.dia||5}"></label>
      <label class="f">Pago que planeas al mes<input id="kP" inputmode="numeric" value="${d0?.pago?fmt(d0.pago):''}" placeholder="$0"></label><label class="f">Interés mensual %<input id="kI" inputmode="decimal" value="${d0?.tasa?(d0.tasa*100).toFixed(4):'2.15'}"></label></div>
      <p class="muted small">Después puedes subir el extracto para cargar las compras y repartirlas.</p>
    </div>
    <button class="btn" id="dOk">Guardar</button>${id?'<button class="btn danger" id="dDel">Eliminar deuda</button>':''}</div>`,sh=>{
    let tipo=tipo0;
    const t=$('#dT');if(t)t.addEventListener('click',e=>{const b=e.target.closest('[data-seg]');if(!b)return;tipo=b.dataset.seg;$$('#dT [data-seg]').forEach(z=>z.setAttribute('aria-pressed',z===b));$('#dP').hidden=tipo!=='prestamo';$('#dK').hidden=tipo!=='tarjeta';});
    $('#dC').addEventListener('click',e=>{const b=e.target.closest('[data-seg]');if(!b)return;$$('#dC [data-seg]').forEach(z=>z.setAttribute('aria-pressed',z===b));prev();});
    const leer=()=>{const q=$('#dQ').value;const nom=q?personaN(q):$('#dQn').value.trim();return{acreedor:q||null,nombre:nom?(id&&d0&&!d0.plan?d0.nombre:`Préstamo de ${nom}`):'',saldo:num($('#dM').value),tasa:dec($('#dI').value)/100,cuenta:$('#dS').value,
      plan:{cuotas:Math.max(1,num($('#dN').value)||1),cada:$('#dC [aria-pressed="true"]').dataset.seg,inicio:$('#dF').value||iso(today())}};};
    const prev=()=>{$('#dQnBox').hidden=!!$('#dQ').value;const x=leer();if(!x.saldo){$('#dPlan').textContent='Escribe el valor para ver el plan.';return;}
      const tmp={id:d0?.id||'tmp',saldo:x.saldo,tasa:x.tasa,plan:x.plan};const pl=planDeuda(tmp);const ct=pl.length;
      $('#dPlan').innerHTML=ct?`<b>${ct} pago${ct>1?'s':''}</b> de ${fmt(pl[0].monto)}${ct>1&&pl[ct-1].monto!==pl[0].monto?` (el último ${fmt(pl[ct-1].monto)})`:''} desde ${esc(cuentaN(x.cuenta))}:<br>${pl.slice(0,8).map(z=>`${fdate(z.f)} ${fmt(z.monto)}`).join(' · ')}${ct>8?' …':''}<br>Terminas el ${fdate(pl[ct-1].f)} de ${pl[ct-1].f.getFullYear()}.`:'Ya está pagada.';};
    sh.addEventListener('input',prev);sh.addEventListener('change',prev);prev();
    $('#dOk').onclick=()=>{if(!S.deudas)S.deudas={items:[]};
      if(tipo==='tarjeta'){const n=$('#kN').value.trim(),s=num($('#kS').value);if(!n)return toast('Pon el nombre de la tarjeta');const obj={tipo:'tarjeta',nombre:n,saldo:s,dia:Math.min(31,Math.max(1,num($('#kD').value)||5)),pago:num($('#kP').value),tasa:dec($('#kI').value)/100,actualizado:iso(today())};
        if(d0)Object.assign(d0,obj);else{S.deudas.items.push({id:'d-'+uid(),...obj});S.config.deudaInicial=(S.config.deudaInicial||0)+s;persist('config');}}
      else{const x=leer();if(!x.nombre||!x.saldo)return toast('Pon a quién le debes y cuánto');
        if(d0){if(d0.plan&&(d0.plan.inicio!==x.plan.inicio||d0.plan.cada!==x.plan.cada)&&pagadosPlan(d0).size)return toast('Ya hiciste pagos: cambia las cuotas o el valor, no la fecha ni la frecuencia');
          Object.assign(d0,{...x,tipo:'prestamo',dia:parseISO(x.plan.inicio).getDate(),pago:planDeuda({...d0,...x})[0]?.monto||0,actualizado:iso(today())});
          if(d0.plan)d0.plan.cuotas=Math.max(d0.plan.cuotas,pagadosPlan(d0).size+1);}
        else{const nd={id:'d-'+uid(),tipo:'prestamo',...x,dia:parseISO(x.plan.inicio).getDate(),actualizado:iso(today())};nd.pago=planDeuda(nd)[0]?.monto||0;S.deudas.items.push(nd);S.config.deudaInicial=(S.config.deudaInicial||0)+x.saldo;persist('config');}}
      persist('deudas');closeSheet();toast('Deuda guardada');render();};
    const dl=$('#dDel');if(dl)dl.onclick=()=>{if(!dl.dataset.c){dl.dataset.c=1;dl.textContent='Toca otra vez para eliminar';return;}S.deudas.items=deudas().filter(z=>z.id!==id);persist('deudas');closeSheet();toast('Deuda eliminada');render();};});}

/* ===== tarjetas: compras, compartidos y trazabilidad ===== */
const personas=()=>[{id:'yo',nombre:'Yo'},...(cfg().personas||[])];
const personaN=id=>personas().find(p=>p.id===id)?.nombre||'Alguien';
const compras=d=>Array.isArray(d?.compras)?d.compras:[];
const duenos=c=>Array.isArray(c.de)&&c.de.length?c.de:[{p:'yo',pct:100}];
function capCuota(c){const rest=c.cuotasTot&&c.cuotaN!=null?Math.max(1,c.cuotasTot-c.cuotaN):null;let v=c.valorCuota||0;if(rest&&(!v||v*rest<c.saldo*0.98))v=c.saldo/rest;if(!v)v=c.saldo;return Math.min(v,c.saldo);}
function simParte(d,c,pid,pct){const out=[];const r=(pid!=='yo'&&d.reparto?.intereses==='yo')?0:(c.tasa??d.tasa??0);let owed=(c.saldo||0)*pct/100;const cap=capCuota(c)*pct/100;
  for(let i=0;i<120&&owed>1;i++){const it=owed*r;const due=c.cobro?c.cobro*pct/100:cap+it;const pay=Math.min(due,owed+it);if(pay<=0.5)break;owed=owed+it-pay;out.push(pay);}return out;}
function planTarjeta(d){const P={};const add=(pid,arr)=>{if(!P[pid])P[pid]=[];arr.forEach((v,i)=>P[pid][i]=(P[pid][i]||0)+v);};
  for(const c of compras(d).filter(c=>c.saldo>0))for(const o of duenos(c))add(o.p,simParte(d,c,o.p,o.pct));
  const n=Math.max(0,...Object.values(P).map(a=>a.length));const man=d.manejo||0,rule=d.reparto?.manejo||'yo';
  if(man&&n){const tot=compras(d).reduce((a,c)=>a+(c.saldo||0),0)||1;const peso={};for(const c of compras(d))for(const o of duenos(c))peso[o.p]=(peso[o.p]||0)+(c.saldo||0)*o.pct/100;
    for(let i=0;i<n;i++){const act=Object.keys(P).filter(p=>(P[p][i]||0)>0);if(rule==='yo'||!act.length)add('yo',Array.from({length:i+1},(_,j)=>j===i?man:0));
      else if(rule==='iguales')act.forEach(p=>add(p,Array.from({length:i+1},(_,j)=>j===i?man/act.length:0)));
      else Object.keys(peso).forEach(p=>add(p,Array.from({length:i+1},(_,j)=>j===i?man*peso[p]/tot:0)));}}
  for(const k of Object.keys(P))P[k]=Array.from({length:P[k].length},(_,i)=>Math.round(P[k][i]||0));return P;}
function baseDue(d){const t=today();let b=new Date(t.getFullYear(),t.getMonth(),Math.min(d.dia,daysIn(t.getFullYear(),t.getMonth())));if(b<t)b=new Date(t.getFullYear(),t.getMonth()+1,Math.min(d.dia,daysIn(t.getFullYear(),t.getMonth()+1)));return b;}
function offTarjeta(d,k){const du=dueIn(k,d.dia);if(!du)return null;const b=baseDue(d);const i=(du.getFullYear()*12+du.getMonth())-(b.getFullYear()*12+b.getMonth());return i>=0?i:null;}
const mesN=(d,i)=>{const b=baseDue(d);return mlabel(new Date(b.getFullYear(),b.getMonth()+i,1));};
function cobrosTarjetas(k){const c=C(k),out=[];
  for(const d of deudas().filter(x=>x.tipo==='tarjeta'&&compras(x).some(cp=>duenos(cp).some(o=>o.p!=='yo')))){const i=offTarjeta(d,k);if(i==null)continue;let P=_ptCache&&_ptCache.get(d.id);if(!P){P=planTarjeta(d);if(_ptCache)_ptCache.set(d.id,P);}
    for(const pid of Object.keys(P)){if(pid==='yo')continue;const id=`t-${d.id}-${pid}`;const r=c.cobros[id];const m=P[pid][i]||0;
      const concepto='Su parte de '+d.nombre+' ('+compras(d).filter(cp=>cp.saldo>0&&duenos(cp).some(o=>o.p===pid)).map(cp=>cp.nombre).slice(0,3).join(', ')+')';
      if(r)out.push({id,quien:personaN(pid),concepto,monto:r.monto,destino:d.id,recibido:true,auto:true});else if(m>0&&k>=curKey())out.push({id,quien:personaN(pid),concepto,monto:c.cobrosMonto[id]??m,destino:d.id,recibido:false,auto:true});}}
  return out;}
function trazHTML(d){const e=d.extracto;let h='';
  if(e){const movs=Array.isArray(d.movsNuevos)?d.movsNuevos.filter(m=>!e.corte||!m.fecha||m.fecha>e.corte):[];const esperado=(e.saldoCorte||0)+movs.reduce((a,m)=>a+(m.valor||0),0);const diff=Math.round((d.saldo||0)-esperado);
    h+=`<div class="tiles"><div class="tile"><div class="label">Extracto (corte ${e.corte?fdate(parseISO(e.corte)):'—'})</div><div class="v">${fmt(e.saldoCorte)}</div><div class="muted" style="font-size:.78rem">Mínimo ${fmt(e.minimo)}${e.limite?` · paga antes del ${fdate(parseISO(e.limite))}`:''}</div></div><div class="tile"><div class="label">Saldo hoy en la app</div><div class="v">${fmt(d.saldo)}</div><div class="muted" style="font-size:.78rem">${d.actualizado?'Revisado el '+fdate(parseISO(d.actualizado)):''}</div></div></div>`;
    if(movs.length)h+=`<div class="small"><b>Movimientos desde el corte:</b><div class="list">${movs.map(m=>`<div class="item"><div class="grow"><div class="t">${esc(m.nombre)}</div><div class="s">${m.fecha?fdate(parseISO(m.fecha)):''}</div></div><span class="amt ${m.valor<0?'pos':''}">${m.valor<0?'−':'+'}${fmt(Math.abs(m.valor))}</span></div>`).join('')}</div></div>`;
    h+=Math.abs(diff)<2000?`<div class="note ok">Cuadra: extracto ${fmt(e.saldoCorte)}${movs.length?` + movimientos ${fmt(esperado-e.saldoCorte)}`:''} = saldo de hoy.</div>`:`<div class="note">Diferencia de ${fmt(diff)} entre extracto${movs.length?' + movimientos':''} y saldo de hoy. ${movs.length?'Pueden ser intereses del nuevo corte o compras que aún no aparecen.':'Sube una captura de los movimientos recientes de la app para cruzarlo.'}</div>`;}
  else h+=`<div class="note">Sube el último extracto para ver las compras con sus cuotas, y una captura de la app para cruzar con el saldo de hoy.</div>`;
  const sc=compras(d).reduce((a,c)=>a+(c.saldo||0),0);if(compras(d).length&&Math.abs(sc-d.saldo)>2000)h+=`<div class="muted small">Las compras suman ${fmt(sc)} y el saldo es ${fmt(d.saldo)}: la diferencia son intereses, cargos o movimientos sin detallar.</div>`;
  return h;}
function sheetTarjeta(id){const d=deuda(id);if(!d)return;const P=planTarjeta(d);const cs=compras(d).filter(c=>c.saldo>0);const rep=d.reparto||{};
  const filaC=c=>{const tot=simParte(d,c,'yo',100);return `<div class="item"><div class="grow"><div class="t">${esc(c.nombre)}</div><div class="s">${c.cuotaN!=null?`Cuota ${c.cuotaN}/${c.cuotasTot||'?'} · `:''}saldo ${fmt(c.saldo)} · termina ${tot.length?mesN(d,tot.length-1):'—'}${c.cobro?` · cobro fijo ${fmt(c.cobro)}`:''}</div><div class="chips" style="margin-top:4px">${duenos(c).map(o=>`<span class="pill ${o.p==='yo'?'soft':'ok'}">${esc(personaN(o.p))}${duenos(c).length>1?' '+o.pct+'%':''}</span>`).join('')}</div></div><button class="btn ghost sm" data-compra="${esc(c.id)}">Quién paga</button></div>`;};
  const pers=Object.keys(P).filter(p=>P[p].some(v=>v>0)).sort((a,b)=>a==='yo'?-1:b==='yo'?1:0);
  openSheet(`<div class="stack"><div class="row"><h2>${esc(d.nombre)}</h2><button class="btn ghost sm" id="tCerrar">Cerrar</button></div>
    <section class="stack" style="gap:8px"><div class="label">Trazabilidad</div>${trazHTML(d)}<details><summary>Subir extracto o captura de la app</summary><div id="tExt" style="margin-top:8px"></div></details></section>
    ${pers.length?`<section class="stack" style="gap:8px"><div class="label">Quién paga qué cada mes</div>${pers.map(p=>{const a=P[p];const tot=a.reduce((s,v)=>s+v,0);const i0=a.findIndex(v=>v>0);return `<div class="ed" style="gap:4px"><div class="row"><b>${esc(personaN(p))}</b><span class="amt">${fmt(a[0]||0)} <span class="muted" style="font-weight:500">este mes</span></span></div><div class="muted small">Le quedan ${fmt(tot)} · termina en ${mesN(d,a.length-1)}</div><div class="small">${a.slice(0,6).map((v,i)=>v?`${mesN(d,i).split(' ')[0]} ${fmt(v)}`:'').filter(Boolean).join(' · ')}${a.length>6?' …':''}</div></div>`;}).join('')}</section>`:''}
    <section class="stack" style="gap:8px"><div class="row"><div class="label">Compras (${cs.length})</div><button class="btn ghost sm" id="tAddC">+ Compra</button></div>${cs.length?`<div class="list">${cs.map(filaC).join('')}</div>`:'<div class="muted small">Sin compras detalladas. Sube el extracto para cargarlas.</div>'}</section>
    <section class="stack" style="gap:8px"><div class="label">Cuota de manejo e intereses</div><div class="grid2"><label class="f">Cuota de manejo al mes<input id="tMan" inputmode="numeric" value="${fmt(d.manejo||0)}"></label>
      <label class="f">¿Quién paga la cuota de manejo?<select id="tRM">${[['yo','Yo la asumo'],['iguales','Partes iguales entre quienes deben'],['proporcional','Según lo que debe cada uno']].map(([v,n])=>`<option value="${v}" ${(rep.manejo||'yo')===v?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="f">Intereses de las compras de otros<select id="tRI">${[['proporcional','Cada quien paga los de su compra'],['yo','Los asumo yo']].map(([v,n])=>`<option value="${v}" ${(rep.intereses||'proporcional')===v?'selected':''}>${n}</option>`).join('')}</select></label></div>
      <button class="btn sm" id="tRep">Guardar reparto</button></section>
    <section class="stack" style="gap:8px"><div class="label">Personas con las que compartes</div><div class="chips">${(cfg().personas||[]).map(p=>`<span class="chip">${esc(p.nombre)}</span>`).join('')||'<span class="muted small">Nadie todavía.</span>'}</div><div class="row" style="gap:8px"><input id="tPer" placeholder="Ej: Papá"><button class="btn ghost sm" id="tPerOk">Agregar</button></div></section></div>`,sh=>{
    $('#tCerrar').onclick=closeSheet;mountExtracto($('#tExt'),()=>sheetTarjeta(id),id);
    $('#tRep').onclick=()=>{d.manejo=num($('#tMan').value);d.reparto={manejo:$('#tRM').value,intereses:$('#tRI').value};persist('deudas');toast('Reparto guardado');sheetTarjeta(id);render();};
    $('#tPerOk').onclick=()=>{const n=$('#tPer').value.trim();if(!n)return;if(!S.config.personas)S.config.personas=[];S.config.personas.push({id:'p-'+uid(),nombre:n});persist('config');sheetTarjeta(id);};
    $('#tAddC').onclick=()=>sheetCompra(id,null);
    $$('[data-compra]',sh).forEach(b=>b.onclick=()=>sheetCompra(id,b.dataset.compra));});}
function sheetCompra(did,cid){const d=deuda(did);if(!d)return;if(!Array.isArray(d.compras))d.compras=[];const c=cid?d.compras.find(x=>x.id===cid):{id:'cp-'+uid(),nombre:'',saldo:0,cuotaN:0,cuotasTot:1,valorCuota:0,tasa:d.tasa,de:[{p:'yo',pct:100}]};if(!c)return;
  const sel=new Set(duenos(c).map(o=>o.p));const pctOf=p=>duenos(c).find(o=>o.p===p)?.pct;
  openSheet(`<div class="stack"><h2>${cid?esc(c.nombre):'Nueva compra'}</h2>
    ${cid?`<div class="muted small">Saldo ${fmt(c.saldo)}${c.cuotaN!=null?` · cuota ${c.cuotaN}/${c.cuotasTot}`:''}</div>`:`<label class="f">Compra<input id="cN" placeholder="Ej: Celular"></label><div class="grid2"><label class="f">Saldo<input id="cS" inputmode="numeric" placeholder="$0"></label><label class="f">Cuotas que faltan<input id="cR" inputmode="numeric" data-plain value="12"></label></div>`}
    <div class="label">¿De quién es?</div><div class="chips" id="cP">${personas().map(p=>`<button type="button" class="chip" data-p="${esc(p.id)}" aria-pressed="${sel.has(p.id)}">${esc(p.nombre)}</button>`).join('')}</div>
    <div id="cPct" class="grid2"></div>
    <label class="f">Cobro mensual fijo (opcional)<input id="cF" inputmode="numeric" value="${c.cobro?fmt(c.cobro):''}" placeholder="Lo que calcula la app"></label>
    <p class="muted small">Úsalo si la persona te paga un valor fijo, por ejemplo la cuota original aunque el banco la haya pasado a más cuotas. Si lo dejas vacío, cobro su parte de la cuota más sus intereses.</p>
    <button class="btn" id="cOk">Guardar</button>${cid?'<button class="btn danger" id="cDel">Quitar esta compra</button>':''}</div>`,sh=>{
    const drawPct=()=>{const ps=[...sel];$('#cPct').innerHTML=ps.length>1?ps.map(p=>`<label class="f">% de ${esc(personaN(p))}<input inputmode="numeric" data-plain data-pct="${esc(p)}" value="${pctOf(p)??Math.round(100/ps.length)}"></label>`).join(''):'';};drawPct();
    $('#cP').onclick=e=>{const b=e.target.closest('[data-p]');if(!b)return;const p=b.dataset.p;if(sel.has(p)&&sel.size>1)sel.delete(p);else sel.add(p);b.setAttribute('aria-pressed',sel.has(p));$$('#cP [data-p]').forEach(x=>x.setAttribute('aria-pressed',sel.has(x.dataset.p)));drawPct();};
    $('#cOk').onclick=()=>{const ps=[...sel];let de=ps.length===1?[{p:ps[0],pct:100}]:ps.map(p=>({p,pct:num($(`[data-pct="${p}"]`).value)}));const s=de.reduce((a,o)=>a+o.pct,0);if(s!==100)return toast(`Los porcentajes suman ${s}%, deben sumar 100%`);
      if(!cid){const n=$('#cN').value.trim(),sa=num($('#cS').value),r=Math.max(1,num($('#cR').value)||1);if(!n||!sa)return toast('Pon nombre y saldo');Object.assign(c,{nombre:n,saldo:sa,cuotaN:0,cuotasTot:r,valorCuota:Math.round(sa/r)});d.compras.push(c);}
      c.de=de;c.cobro=num($('#cF').value)||null;persist('deudas');toast('Guardado');sheetTarjeta(did);render();};
    const dl=$('#cDel');if(dl)dl.onclick=()=>{if(!dl.dataset.c){dl.dataset.c=1;dl.textContent='Toca otra vez para quitar';return;}d.compras=d.compras.filter(x=>x.id!==cid);persist('deudas');sheetTarjeta(did);render();};});}
const normN=s=>String(s||'').toLowerCase().replace(/[^a-z0-9ñ]/g,'');
function guardarLectura(r,did,saldoVal){if(!S.deudas)S.deudas={items:[]};let d=did==='nueva'?null:deuda(did);
  if(!d){d={id:'d-'+uid(),tipo:'tarjeta',nombre:`${r.tarjeta||'Tarjeta'}${r.ultimos4?' *'+r.ultimos4:''}`,ultimos4:r.ultimos4||'',saldo:0,tasa:r.tasaMensual||0.02,dia:r.diaPago||(r.fechaLimite?parseISO(r.fechaLimite).getDate():5),pago:r.pagoMinimo||0};S.deudas.items.push(d);}
  if(saldoVal)d.saldo=saldoVal;else if(!d.saldo&&r.deudaTotalPesos)d.saldo=r.deudaTotalPesos;if(r.pagoMinimo)d.minimo=r.pagoMinimo;if(r.tasaMensual)d.tasa=r.tasaMensual;d.actualizado=iso(today());
  if(r.tipo==='app'){if(Array.isArray(r.movimientos))d.movsNuevos=r.movimientos.filter(m=>m&&m.valor).map(m=>({fecha:m.fecha||null,nombre:String(m.nombre||''),valor:Number(m.valor)||0}));}
  else{d.extracto={corte:r.fechaCorte||null,limite:r.fechaLimite||null,saldoCorte:r.deudaTotalPesos||0,minimo:r.pagoMinimo||0,pagoTotal:r.pagoTotal||0};if(r.cuotaManejo)d.manejo=r.cuotaManejo;d.movsNuevos=[];
    if(Array.isArray(r.compras)&&r.compras.length){const old=compras(d);d.compras=r.compras.filter(x=>x&&x.saldo>0).map(x=>{const m=old.find(o=>normN(o.nombre)===normN(x.nombre)&&(!o.fecha||!x.fecha||o.fecha===x.fecha))||old.find(o=>normN(o.nombre)===normN(x.nombre));
      return{id:m?.id||'cp-'+uid(),nombre:String(x.nombre),fecha:x.fecha||null,valorTotal:x.valorTotal||null,cuotaN:x.cuotaActual??null,cuotasTot:x.cuotasTotal??null,valorCuota:x.valorCuota||0,saldo:x.saldo,tasa:x.tasaMensual||d.tasa,de:m?.de||[{p:'yo',pct:100}],cobro:m?.cobro||null};});}}
  persist('deudas');return d;}
function progCard(p){const fin=parseISO(p.fecha),dias=Math.round((fin-today())/DAY);const pl=planProg(p);const pct=p.monto?Math.min(100,(p.apartado||0)/p.monto*100):0;const listo=(p.apartado||0)>=p.monto;const hoyToca=pl[0]&&iso(pl[0].fecha)===iso(today());
  return `<div class="ed"><div class="row">${ico(catIcon(p.cat),catColor(p.cat))}<div class="grow" style="flex:1;min-width:0"><b>${esc(p.nombre)}</b><div class="muted small">${fmt(p.monto)} · ${fdate(fin)} ${dias>0?`(en ${dias} día${dias>1?'s':''})`:dias===0?'(hoy)':'(ya pasó)'}</div></div><span class="pill ${listo?'ok':hoyToca?'warn':'soft'}">${listo?'Listo':hoyToca?'Toca hoy':`${Math.round(pct)}%`}</span></div>
  <div class="bar"><i style="width:${pct.toFixed(1)}%;background:${catColor(p.cat)}"></i></div><div class="row small"><span>Apartado ${fmt(p.apartado||0)}</span><span class="muted">Faltan ${fmt(Math.max(0,p.monto-(p.apartado||0)))}</span></div>
  ${pl.length&&!listo?`<div class="small"><b>Plan:</b> ${pl.slice(0,6).map(x=>`${fdate(x.fecha)} → ${fmt(x.monto)}`).join(' · ')}${pl.length>6?' …':''}</div>`:''}
  <div class="btns">${!listo?`<button class="btn sm" data-action="progApartar" data-id="${esc(p.id)}">Apartar${pl[0]?' '+fmt(pl[0].monto):''}</button>`:''}${dias<=7||listo?`<button class="btn ${listo?'':'ghost '}sm" data-action="progPagar" data-id="${esc(p.id)}">Ya lo pagué</button>`:''}<button class="btn ghost sm" data-action="progEditar" data-id="${esc(p.id)}">Editar</button></div></div>`;}
function progsHTML(){const ps=progsActivos().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  return `<section class="card stack"><div class="row"><h2>Gastos programados</h2><button class="btn sm" data-action="progEditar">+ Programar</button></div><p class="muted small">Un viaje, un regalo, el SOAT, la matrícula: le pones fecha y valor, y te digo cuánto apartar y cuándo para tenerlo listo.</p>
  ${ps.length?ps.map(progCard).join(''):'<div class="empty">Aún no tienes gastos programados.</div>'}</section>`;}
function sheetProg(id){const p=id?JSON.parse(JSON.stringify(progs().find(x=>x.id===id)||{})):{nombre:'',monto:0,fecha:iso(addDays(today(),30)),cada:'quincena',cat:catObj('salidas')?'salidas':catsG()[0]?.id,apartado:0};
  openSheet(`<div class="stack"><h2>${id?'Editar':'Programar'} gasto</h2>
    <label class="f">¿Para qué?<input id="qN" value="${esc(p.nombre)}" placeholder="Ej: Finca con amigos"></label>
    <div class="grid2"><label class="f">Valor<input id="qM" inputmode="numeric" value="${p.monto?fmt(p.monto):''}" placeholder="$0"></label><label class="f">Fecha<input id="qF" type="date" value="${esc(p.fecha)}"></label></div>
    <div class="label">¿Cada cuánto apartas?</div><div class="seg" id="qC">${segBtns(CADA,p.cada||'quincena')}</div>
    <div class="grid2"><label class="f">Categoría<select id="qK">${catsG().map(c=>`<option value="${esc(c.id)}" ${c.id===p.cat?'selected':''}>${esc(catN(c.id))}</option>`).join('')}</select></label>${id?'':`<label class="f">Ya tienes apartado<input id="qA" inputmode="numeric" placeholder="$0"></label>`}</div>
    <div id="qPlan" class="note ok"></div>
    <button class="btn" id="qOk">Guardar</button>${id?'<button class="btn danger" id="qDel">Eliminar</button>':''}</div>`,sh=>{
    const leer=()=>({...p,nombre:$('#qN').value.trim(),monto:num($('#qM').value),fecha:$('#qF').value||p.fecha,cada:$('#qC [aria-pressed="true"]').dataset.seg,cat:$('#qK').value,apartado:id?p.apartado:num($('#qA')?.value)});
    const prev=()=>{const x=leer();if(!x.monto){$('#qPlan').textContent='Escribe el valor para ver el plan.';return;}const pl=planProg(x);$('#qPlan').innerHTML=pl.length?`Aparta <b>${fmt(pl[0].monto)}</b> ${pl.length>1?`${CADA.find(c=>c[0]===x.cada)[1].toLowerCase()}, ${pl.length} veces`:'hoy'}: ${pl.map(z=>`${fdate(z.fecha)} ${fmt(z.monto)}`).join(' · ')}.`:'Ya tienes todo apartado.';};
    $('#qC').addEventListener('click',e=>{const b=e.target.closest('[data-seg]');if(!b)return;$$('#qC [data-seg]').forEach(z=>z.setAttribute('aria-pressed',z===b));prev();});
    sh.addEventListener('input',prev);sh.addEventListener('change',prev);prev();
    $('#qOk').onclick=()=>{const x=leer();if(!x.nombre||!x.monto)return toast('Pon nombre y valor');if(!S.config.programados)S.config.programados=[];
      if(id){const i=S.config.programados.findIndex(z=>z.id===id);S.config.programados[i]=x;}else S.config.programados.push({...x,id:'pg-'+uid(),hecho:false});persist('config');closeSheet();toast('Gasto programado');render();};
    const dl=$('#qDel');if(dl)dl.onclick=()=>{if(!dl.dataset.c){dl.dataset.c=1;dl.textContent='Toca otra vez para eliminar';return;}S.config.programados=progs().filter(z=>z.id!==id);persist('config');closeSheet();toast('Eliminado. Lo apartado vuelve a estar libre.');render();};});}
function sheetProgApartar(id){const p=progs().find(x=>x.id===id);if(!p)return;const pl=planProg(p);
  openSheet(`<div class="stack"><h2>Apartar para ${esc(p.nombre)}</h2><input id="paM" class="money" inputmode="numeric" value="${fmt(pl[0]?.monto||0)}" aria-label="Valor"><p class="muted small">La plata se queda en tu cuenta, pero deja de contar como libre. Si la pasas a un bolsillo o la guardas aparte, mejor.</p><button class="btn" id="paOk">Apartar</button></div>`,sh=>{
    $('#paOk').onclick=()=>{const m=num($('#paM').value);if(!m)return;addMov({id:uid(),t:'apartar',progId:id,monto:m,fecha:iso(today()),fx:[{k:'prog',id,d:m}]});closeSheet();toast('Apartado');render();};});}
function sheetProgPagar(id){const p=progs().find(x=>x.id===id);if(!p)return;
  openSheet(`<div class="stack"><h2>Pagaste: ${esc(p.nombre)}</h2><input id="ppM" class="money" inputmode="numeric" value="${fmt(p.monto)}" aria-label="Valor">${payerHTML('prog',true,ls.get('cc-src-gasto'),'¿Con qué pagaste?')}<p class="muted small">Queda como gasto en ${esc(catN(p.cat))} y se libera lo que tenías apartado (${fmt(p.apartado||0)}).</p><button class="btn" id="ppOk">Registrar</button></div>`,sh=>{bindPayer(sh);
    $('#ppOk').onclick=()=>{const m=num($('#ppM').value);if(!m)return;const pr=readPayer(sh,'prog',m);if(pr.err)return toast(pr.err);
      addMov({id:uid(),t:'gasto',monto:m,cat:p.cat,nota:p.nombre,fecha:iso(today()),fx:[...fxFromParts(pr.parts,-1),{k:'prog',id,d:-(p.apartado||0)},{k:'progHecho',id,d:0}]});closeSheet();toast('Registrado');render();};});}
function projTxt(a,b){
  const hayT=deudas().some(d=>d.tipo==='tarjeta'&&d.saldo>0);
  if(!a.ok&&!(proj.extra&&b.ok))return 'Con lo que pagas hoy, los intereses le ganan al abono. Sube el pago mensual o suma días extra.';
  let t=a.ok?`${hayT?`Pagando ${fmt(proj.pago)} al mes a tarjetas`:'Con tus cuotas actuales'} quedas libre de deudas en <b>${finLabel(a)}</b>${a.intereses>500?` y pagas unos ${fmt(a.intereses)} de intereses`:''}.`:'Con lo que pagas hoy no alcanzas a terminar.';
  if(proj.extra&&b.ok){const ex=proj.dias?`${proj.dias} día${proj.dias>1?'s':''} extra al mes (${fmt(proj.extra)})`:`${fmt(proj.extra)} extra al mes`;
    if(!a.ok)t+=` Con ${ex} sí terminas, en <b>${finLabel(b)}</b>.`;
    else if(b.fin!==a.fin){const m=Math.round((cStart(a.fin)-cStart(b.fin))/DAY/30);t+=` Con ${ex} terminas en <b>${finLabel(b)}</b>${m>0?`: ${m} mes${m>1?'es':''} antes`:''}${a.intereses-b.intereses>500?` y te ahorras ${fmt(a.intereses-b.intereses)} en intereses`:''}.`;}
    else t+=` Con ${ex} terminas el mismo mes${a.intereses-b.intereses>500?`, pero te ahorras ${fmt(a.intereses-b.intereses)} en intereses`:''}.`;}
  const r=proj.extra&&b.ok?b:a;const lista=deudas().filter(d=>d.saldo>0&&r.finD&&r.finD[d.id]).sort((x,y)=>r.finD[x.id].localeCompare(r.finD[y.id]));
  if(lista.length>1)t+=`<div class="muted" style="margin-top:6px">${lista.map(d=>`${esc(d.nombre)}: ${mlabel(cEnd(r.finD[d.id]))}`).join(' · ')}</div>`;
  return t;}
function chartSVG(a,b){
  const W=340,H=170,L=44,R=10,T=12,Bm=26,pts=a.pts,n=Math.max(pts.length,b?b.pts.length:0);if(n<2)return '';
  const max=Math.max(...pts.map(p=>p.B),...(b?b.pts.map(p=>p.B):[0]),1);const x=i=>L+(W-L-R)*i/(n-1),y=v=>T+(H-T-Bm)*(1-v/max);
  const path=ps=>ps.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(p.B).toFixed(1)}`).join('');
  const ticks=[0,Math.floor((n-1)/2),n-1].filter((v,i,ar)=>ar.indexOf(v)===i);const all=n===pts.length?pts:b.pts;
  const lab=i=>{const d=cStart(all[i].k);return `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;};
  const mm=v=>v>=1e6?(v/1e6).toFixed(1).replace('.',',')+' M':Math.round(v/1e3)+' mil';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo de tarjetas proyectado">
  <line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/><line x1="${L}" x2="${W-R}" y1="${y(max/2)}" y2="${y(max/2)}" stroke="var(--line)" stroke-dasharray="3 4"/>
  ${[max,max/2,0].map(v=>`<text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v?mm(v):'0'}</text>`).join('')}
  <path d="${path(pts)}L${x(pts.length-1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z" fill="var(--debt)" fill-opacity=".12"/>
  <path d="${path(pts)}" fill="none" stroke="var(--debt)" stroke-width="2.5" stroke-linejoin="round"/>
  ${b?`<path d="${path(b.pts)}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="6 4"/>`:''}
  <circle cx="${x(pts.length-1)}" cy="${y(pts[pts.length-1].B)}" r="4" fill="var(--debt)"/>
  ${ticks.map(i=>`<text x="${x(i)}" y="${H-8}" text-anchor="${i===0?'start':i===n-1?'end':'middle'}" font-size="10" fill="var(--muted)">${lab(i)}</text>`).join('')}</svg>
  <div class="row" style="font-size:.78rem;justify-content:flex-start;gap:14px"><span style="color:var(--debt)">━ Con el pago mensual</span>${b?'<span style="color:var(--accent)">╍ Con el extra</span>':''}</div>`;
}
function renderConsejos(){
  $('#tipsBox').innerHTML=`<h2>Consejos para ti</h2>${consejos().map(tipHTML).join('')}`;
  if(!built.ai)buildAI();
}

/* ================= asesor IA ================= */
let sampleFn=null,imgOK=false,aiReady=false,turns=[],aiCtl=null,extNode=null,dlFn=null;
async function initDl(){try{dlFn=window.claude?await window.claude.use('downloads'):null;}catch(e){dlFn=null;}if(dlFn&&tab==='ciclo')render();}
async function initAI(){try{sampleFn=window.claude?await window.claude.use('sample'):null;}catch(e){sampleFn=null;}if(sampleFn){try{imgOK=!!(await sampleFn.limits()).images;}catch(e){}}aiReady=true;built.ai=false;extNode=null;built.setup=false;if(tab==='consejos')render();if(tab==='deudas')render();}
function contexto(){
  const k=curKey(),kp=addCycle(k,-1),c=cfg(),p=proyectar(null,0);
  const res=kk=>{const r=resumen(kk);return{ciclo:cRange(kk),ingresos:r.ingresos,ingresoExtra:{neto:r.extra,bruto:r.extraBruto,dias:r.extraN},gastos:r.gastos,aCredito:r.credito,sinRegistrar:r.sinReg,porCategoria:Object.fromEntries(Object.entries(r.porCat).map(([a,b])=>[catN(a),b])),hormiga:{total:r.hormiga,compras:r.hormigaN},pagos:r.pagos,abonosExtra:r.abonos,pendientes:r.obs.filter(o=>!o.estado).map(o=>({nombre:o.nombre,monto:o.monto,vence:iso(o.due)})),libre:r.libre};};
  return JSON.stringify({hoy:iso(today()),contexto:c.contexto,ingreso:{tipo:tipoIng()==='sueldo'?'sueldo fijo':tipoIng()==='diario'?'trabajo por días (sin sueldo)':'sueldo + trabajo por días',frecuenciaCuentas:c.ingreso.frecuencia,diasDePago:c.ingreso.dias,componentesSueldo:conSueldo()?c.ingreso.componentes:[],netoSueldoMensual:netoMensual(),actividadPrincipal:fuentePrincipal()?.nombre||null,diasTrabajoSemana:conDias()?c.ingreso.diasSemana:null,metaDiaria:metaDiaria(resumen(k))},
    cuentas:(c.cuentas||[]).map(x=>({nombre:x.nombre,tipo:x.tipo,saldo:saldo(x.id)})),diasDesdeUltimoCuadre:diasSinCuadre(),cicloActual:res(k),cicloAnterior:res(kp),
    deudas:deudas().map(d=>({nombre:d.nombre,tipo:d.tipo,saldo:d.saldo,tasaMensual:d.tasa,pagoPlaneado:d.pago,dia:d.dia,nota:d.nota,cuotaManejo:d.manejo,compras:compras(d).filter(c=>c.saldo>0).map(c=>({nombre:c.nombre,saldo:c.saldo,cuota:c.cuotaN!=null?`${c.cuotaN}/${c.cuotasTot}`:null,deQuien:duenos(c).map(o=>`${personaN(o.p)} ${o.pct}%`).join(', '),cobroFijo:c.cobro||null})),loQuePagaCadaUno:Object.fromEntries(Object.entries(planTarjeta(d)).map(([p,a])=>[personaN(p),{esteMes:a[0]||0,totalPendiente:a.reduce((s,v)=>s+v,0),meses:a.length}]))})),
    otrosTePasan:(c.cobros||[]).map(x=>({quien:x.quien,concepto:x.concepto,monto:x.monto,ciclosQueFaltan:(x.ciclos||[]).filter(z=>z>=k).length})),
    gastosFijos:c.fijos,ingresosExtra:(c.fuentes||[]).map(f=>({nombre:f.nombre,costos:f.deducciones,promedio:promExtra(f.id)})),presupuestos:c.presupuestos,metas:c.metas,gastosProgramados:progsActivos().map(p=>({nombre:p.nombre,monto:p.monto,fecha:p.fecha,apartado:p.apartado||0,plan:planProg(p).map(x=>({fecha:iso(x.fecha),monto:x.monto}))})),
    proyeccion:{libreDeTarjetas:p.ok?finLabel(p):'no alcanza',interesesQueFaltan:Math.round(p.intereses)}});
}
function reglas(){const n='la persona';return `Eres el asesor financiero personal de ${n}, en Colombia. Habla en español colombiano sencillo, cálido y directo, como un amigo que sabe de plata; sin regaños. Usa pesos con punto de miles ($1.250.000). Básate SOLO en los datos que te paso; si falta algo, dilo en una frase. Da pasos concretos con montos y fechas. Respeta su plan: no endeudarse más con tarjetas, abonar extra primero a la deuda de tasa más alta, y usar sus ingresos extra para cubrir huecos y acelerar. Responde corto: máximo 8 viñetas o 2 párrafos.`;}
const PROMPTS={analizar:'Analiza cómo voy en este ciclo: qué va bien, dónde se me va la plata (sobre todo hormiga y lo sin registrar), si llego al próximo pago sin quedarme corto y qué hago esta semana. Termina con UNA acción concreta.',
  extra:'Con lo que llevo en ingresos extra, ¿cuántos días me conviene trabajar más este ciclo y cómo reparto esa plata entre deudas, ahorro y gusto? Dame una meta semanal y dime cuánto adelanto la fecha de quedar libre.',
  diciembre:'Ayúdame a planear diciembre: regalos, salidas, aguinaldos y la prima. Propón un presupuesto que no me desarme el plan de deudas y dime qué parte de la prima conviene abonar.'};
function md(t){const L=esc(t).split('\n');let h='',ul=false;for(const l0 of L){const l=l0.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');if(/^\s*[-•*]\s+/.test(l)){if(!ul){h+='<ul>';ul=true;}h+='<li>'+l.replace(/^\s*[-•*]\s+/,'')+'</li>';}else{if(ul){h+='</ul>';ul=false;}if(l.trim())h+='<p style="margin:6px 0">'+l.replace(/^#+\s*/,'')+'</p>';}}if(ul)h+='</ul>';return h;}
function buildAI(){
  const box=$('#aiBox');built.ai=true;
  if(!aiReady){box.innerHTML='<div class="card empty">Preparando el asesor…</div>';built.ai=false;return;}
  if(!sampleFn){box.innerHTML='<div class="card"><h2>Asesor con IA</h2><p class="muted small" style="margin-top:6px">El asesor no está disponible en este momento. Revisa tu conexión.</p></div>';return;}
  box.innerHTML=`<section class="card stack"><h2>Pregúntale a tu asesor</h2><p class="muted small">Lee un resumen de tus cuentas, deudas y movimientos, sin tu nombre ni tu correo. Funciona con Gemini de Google.</p>
    <div class="btns"><button class="btn sm" data-ai="analizar">Analiza mi ciclo</button><button class="btn ghost sm" data-ai="extra">Plan con mis extras</button><button class="btn ghost sm" data-ai="diciembre">Planear diciembre</button></div>
    <div class="chat" id="chat"></div>
    <form id="chatForm" class="row" style="gap:8px"><input id="chatIn" placeholder="Ej: ¿me alcanza para salir el sábado?" autocomplete="off"><button class="btn" type="submit">Enviar</button></form>
    <div class="btns"><button class="btn ghost sm" id="stopAI" hidden>Detener</button><button class="btn ghost sm" id="clearAI">Nueva conversación</button></div></section>`;
  $('#chatForm').onsubmit=e=>{e.preventDefault();const t=$('#chatIn').value.trim();if(t){$('#chatIn').value='';preguntar(t);}};
  $('#stopAI').onclick=()=>aiCtl?.abort();$('#clearAI').onclick=()=>{turns=[];$('#chat').innerHTML='';};
  $$('[data-ai]',box).forEach(b=>b.onclick=()=>preguntar(PROMPTS[b.dataset.ai],b.textContent));
  for(const t of turns)bubble(t.role==='user'?'me':'ai',t.shown||t.content);
}
function bubble(w,t){const d=document.createElement('div');d.className='bubble '+w+(w==='ai'?' ai-out':'');if(w==='ai')d.innerHTML=md(t);else d.textContent=t;$('#chat').appendChild(d);return d;}
function aiErr(e){const c=e?.code;return c==='not_granted'?'No aceptaste usar el asistente con IA. Puedes aceptarlo la próxima vez que lo uses.':c==='rate_limited'?'Muchas consultas seguidas. Espera un rato.':c==='session_expired'?'Tu sesión expiró. Vuelve a iniciar sesión.':c==='cancelled'?'':c==='image_rejected'?'No pude leer esa imagen. Prueba otra captura.':'No se pudo completar. Intenta de nuevo.';}
async function preguntar(text,shown){
  if(aiCtl)return;turns.push({role:'user',content:text,shown:shown||text});bubble('me',shown||text);const b=bubble('ai','Pensando…');aiCtl=new AbortController();$('#stopAI').hidden=false;
  const input=[{role:'user',content:reglas()+'\n\nMis datos de hoy (JSON):\n'+contexto()},...turns.slice(-8).map(t=>({role:t.role,content:t.content}))];
  try{const{text:ans}=await sampleFn(input,{cache:false,signal:aiCtl.signal,onText:({text})=>{b.innerHTML=md(text);}});turns.push({role:'assistant',content:ans});}
  catch(e){b.innerHTML=e?.text?md(e.text):'';const m=aiErr(e);if(m){const n=document.createElement('div');n.className='note';n.textContent=m;b.appendChild(n);}turns.pop();}
  finally{aiCtl=null;const s=$('#stopAI');if(s)s.hidden=true;}
}
/* lector de extractos */
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('script'));document.head.appendChild(s);});}
async function pdfText(file,pw){if(!window.pdfjsLib){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');}
  const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),password:pw||undefined,isEvalSupported:false}).promise;let out='';for(let i=1;i<=Math.min(doc.numPages,8);i++){const tc=await(await doc.getPage(i)).getTextContent();out+=tc.items.map(x=>x.str).join(' ')+'\n';}return out;}
const EXT='Lee este documento de tarjeta de crédito o préstamo colombiano. Puede ser (a) un EXTRACTO mensual del banco o (b) CAPTURAS de la app o sucursal virtual con el saldo de hoy y movimientos recientes. Responde SOLO JSON con esta forma: {"tipo":"extracto o app","tarjeta":"Visa","ultimos4":"1234","deudaTotalPesos":2257046,"deudaDolares":0,"pagoMinimo":386745,"pagoTotal":2658783,"fechaCorte":"2026-09-15","fechaLimite":"2026-10-05","diaPago":5,"tasaMensual":0.021593,"cuotaManejo":21630,"interesesCorrientes":53877,"compras":[{"nombre":"AVANCE SUCURSAL VIRTUAL","fecha":"2024-12-31","valorTotal":3000000,"cuotaActual":21,"cuotasTotal":24,"valorCuota":125000,"saldo":375000,"tasaMensual":0.019658}],"movimientos":[{"fecha":"2026-10-02","nombre":"PAGO ALTERNATIVO","valor":-441227}],"resumen":"Una o dos frases en español sencillo."}. En "compras" pon solo compras o avances diferidos con saldo pendiente mayor a 0 (no pagos, ni intereses, ni cuota de manejo). En "movimientos" (sobre todo en capturas de la app) pon los movimientos recientes: pagos y abonos con valor NEGATIVO, compras y cargos con valor positivo. "deudaTotalPesos": en extracto es la deuda a la fecha de corte; en la app es la deuda a la fecha de hoy. Fechas en AAAA-MM-DD. Números sin puntos ni símbolos; null si no aparece. Si hay datos de varias tarjetas, responde un arreglo de objetos.';
function mountExtracto(host,onSaved,defId){
  if(!host)return;
  if(!aiReady){host.innerHTML='<div class="muted small">Preparando…</div>';return;}
  if(!sampleFn){host.innerHTML='<div class="muted small">La lectura de extractos no está disponible en este momento. Revisa tu conexión.</div>';return;}
  const p='x'+uid();
  host.innerHTML=`<label class="f">Archivo<input id="${p}f" type="file" accept="application/pdf${imgOK?',image/*':''}" multiple></label>
    <div id="${p}pw" hidden class="stack" style="gap:8px;margin-top:8px"><label class="f">Este PDF tiene clave (en muchos bancos es tu cédula)<input id="${p}p" type="password" autocomplete="off"></label><button class="btn sm" id="${p}r">Abrir con la clave</button></div><div id="${p}o" class="stack" style="margin-top:10px"></div>`;
  let files=null;
  const run=async pw=>{const out=$('#'+p+'o');files=pw!=null&&files?files:[...($('#'+p+'f').files||[])];if(!files.length)return;out.innerHTML='<div class="muted">Leyendo…</div>';$('#'+p+'pw').hidden=true;
    try{const res=[];for(const f of files.filter(f=>f.type==='application/pdf')){let t;try{t=await pdfText(f,pw);}catch(e){if(e&&e.name==='PasswordException'){$('#'+p+'pw').hidden=false;out.innerHTML='<div class="note">El PDF tiene clave.</div>';return;}throw e;}
        if(!t.trim()){out.innerHTML='<div class="note">Ese PDF no tiene texto legible. Sube capturas.</div>';return;}res.push(...[].concat(await sampleFn.json(EXT+'\n\nTEXTO:\n'+t.slice(0,60000))));}
      const imgs=files.filter(f=>f.type.startsWith('image/'));if(imgs.length)res.push(...[].concat(await sampleFn.json(EXT+'\n\nLos datos vienen en las imágenes adjuntas.',{images:imgs})));
      out.innerHTML=res.map((r,i)=>extCard(r,p+i,defId)).join('');
      res.forEach((r,i)=>{const id=p+i;const btn=$('#'+id+'b');if(!btn)return;btn.onclick=()=>{const sel=$('#'+id+'d').value,usar=$('#'+id+'u')?.checked!==false,val=usar?num($('#'+id+'v').value):0;
        guardarLectura(r,sel,val);btn.disabled=true;btn.textContent='Guardado';toast(r.tipo==='app'?'Saldo y movimientos actualizados':'Extracto cargado');onSaved&&onSaved();};});
    }catch(e){const m=e?.code?aiErr(e):'No pude leer ese archivo. Prueba con capturas.';out.innerHTML=m?`<div class="note">${esc(m)}</div>`:'';}};
  $('#'+p+'f').onchange=()=>run();$('#'+p+'r').onclick=()=>run($('#'+p+'p').value);
}
function extCard(r,id,defId){if(!r||typeof r!=='object')return '';
  const match=deudas().find(d=>r.ultimos4&&String(d.ultimos4||'')===String(r.ultimos4))||(defId&&deuda(defId));const cs=Array.isArray(r.compras)?r.compras:[];const mv=Array.isArray(r.movimientos)?r.movimientos:[];const app=r.tipo==='app';
  return `<div class="ed"><div class="row"><h3>${app?'📱 Captura de la app':'📄 Extracto'} · ${esc(r.tarjeta||'Tarjeta')} ${r.ultimos4?'*'+esc(r.ultimos4):''}</h3>${r.fechaLimite?`<span class="pill warn">Paga antes del ${esc(r.fechaLimite)}</span>`:''}</div>
  ${mv.length?`<div class="small"><b>Movimientos:</b> ${mv.slice(0,8).map(m=>`${esc(m.nombre)} ${m.valor<0?'−':'+'}${fmt(Math.abs(m.valor||0))}`).join(' · ')}</div>`:''}
  <div class="tiles"><div class="tile"><div class="label">Deuda</div><div class="v">${fmt(r.deudaTotalPesos)}</div>${r.deudaDolares?`<div class="muted" style="font-size:.78rem">+ USD ${esc(r.deudaDolares)}</div>`:''}</div><div class="tile"><div class="label">Mínimo</div><div class="v">${fmt(r.pagoMinimo)}</div></div></div>
  ${r.resumen?`<p>${esc(r.resumen)}</p>`:''}
  ${cs.length?`<div class="tablewrap"><table><thead><tr><th>Compra</th><th>Cuota</th><th class="n">Valor cuota</th><th class="n">Saldo</th></tr></thead><tbody>${cs.map(c=>`<tr><td>${esc(c.nombre)}</td><td>${c.cuotaActual!=null?esc(c.cuotaActual+'/'+(c.cuotasTotal??'?')):''}</td><td class="n">${fmt(c.valorCuota)}</td><td class="n">${fmt(c.saldo)}</td></tr>`).join('')}</tbody></table></div>`:''}
  <div class="grid2"><label class="f">Guardar en<select id="${id}d">${deudas().map(d=>`<option value="${esc(d.id)}" ${match&&match.id===d.id?'selected':''}>${esc(d.nombre)}</option>`).join('')}<option value="nueva" ${match?'':'selected'}>Agregar como nueva tarjeta</option></select></label>
  <label class="f">${app?'Saldo de hoy':'Saldo en pesos'}<input id="${id}v" inputmode="numeric" value="${fmt(r.deudaTotalPesos)}"></label></div>
  <label class="row small" style="justify-content:flex-start;gap:8px"><input type="checkbox" id="${id}u" style="width:auto" ${app?'checked':''}> Usar este valor como saldo actual de la deuda</label>
  <div class="muted" style="font-size:.8rem">${app?'':'El extracto es la foto al día de corte; las compras se cargan y conservan a quién pertenece cada una. Para el saldo de hoy sube también una captura de la app. '}Si hay saldo en dólares, súmalo en pesos.</div><button class="btn sm" id="${id}b">Guardar</button></div>`;}

/* ================= hojas ================= */
function openSheet(html,mount){$('#sheetHost').innerHTML=`<div class="overlay" id="ov"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;$('#ov').addEventListener('click',e=>{if(e.target.id==='ov')closeSheet();});const sh=$('.sheet');moneyInputs(sh);mount&&mount(sh);}
function closeSheet(){$('#sheetHost').innerHTML='';}
function moneyInputs(root){$$('input[inputmode="numeric"]:not([data-plain])',root).forEach(el=>{if(el.dataset.mi)return;el.dataset.mi=1;el.addEventListener('blur',()=>{if(el.value)el.value=fmt(num(el.value));});});}
function fuentesPago(tarj){const o=(cfg().cuentas||[]).map(c=>({tipo:'cuenta',id:c.id,n:c.nombre}));if(tarj)deudas().filter(d=>d.tipo==='tarjeta').forEach(d=>o.push({tipo:'tarjeta',id:d.id,n:d.nombre}));return o;}
function payerHTML(p,tarj,def,titulo){const fs=fuentesPago(tarj);const d=fs.find(f=>f.id===def)?def:fs[0]?.id;
  return `<div class="stack" style="gap:8px" data-payer="${p}"><div class="label">${titulo}</div><div class="chips">${fs.map(f=>`<button type="button" class="chip" data-src="${f.tipo}:${f.id}" aria-pressed="${f.id===d}">${esc(f.n)}${f.tipo==='tarjeta'?'<small>crédito</small>':''}</button>`).join('')}<button type="button" class="chip" data-split aria-pressed="false">Dividir</button></div>
  <div data-splitbox hidden class="grid2">${fs.map(f=>`<label class="f">${esc(f.n)}<input inputmode="numeric" data-part="${f.tipo}:${f.id}" placeholder="$0"></label>`).join('')}</div><div data-warn hidden class="note bad">Acordamos no meterle más a las tarjetas. Si fue a crédito, lo sumo a esa deuda.</div></div>`;}
function bindPayer(root){$$('[data-payer]',root).forEach(w=>{w.addEventListener('click',e=>{const b=e.target.closest('[data-src]');if(b&&!b.disabled){$$('[data-src]',w).forEach(x=>x.setAttribute('aria-pressed',x===b));$('[data-warn]',w).hidden=!b.dataset.src.startsWith('tarjeta');}
  const t=e.target.closest('[data-split]');if(t){const on=t.getAttribute('aria-pressed')!=='true';t.setAttribute('aria-pressed',on);$('[data-splitbox]',w).hidden=!on;$$('[data-src]',w).forEach(x=>x.disabled=on);}});moneyInputs(w);});}
function readPayer(root,p,total){const w=$(`[data-payer="${p}"]`,root);const split=$('[data-split]',w).getAttribute('aria-pressed')==='true';
  if(!split){const b=$('[data-src][aria-pressed="true"]',w);if(!b)return{err:'Elige de dónde sale la plata'};const[tipo,id]=b.dataset.src.split(':');ls.set('cc-src-'+p,id);return{parts:[{tipo,id,monto:total}]};}
  const parts=$$('[data-part]',w).map(i=>{const[tipo,id]=i.dataset.part.split(':');return{tipo,id,monto:num(i.value)};}).filter(x=>x.monto>0);const s=parts.reduce((a,x)=>a+x.monto,0);if(s!==total)return{err:`Las partes suman ${fmt(s)} y el total es ${fmt(total)}`};return{parts};}
const segBtns=(items,cur)=>items.map(([id,n])=>`<button type="button" data-seg="${id}" aria-pressed="${id===cur}">${n}</button>`).join('');

function sheetNuevo(tipo='gasto',pre={}){
  openSheet(`<div class="stack"><div class="seg" role="group" aria-label="Tipo">${segBtns([['gasto','Gasto'],['ingreso','Ingreso'],['extra',tipoIng()==='diario'?'Mi día':'Extra'],['pago','Pago'],['mover','Mover']],tipo)}</div><div id="nf"></div></div>`,sh=>{
    const draw=t=>{$$('[data-seg]',sh).forEach(b=>b.setAttribute('aria-pressed',b.dataset.seg===t));const nf=$('#nf',sh);nf.innerHTML=({gasto:fGasto,ingreso:fIngreso,extra:fExtra,pago:fPago,mover:fMover})[t](pre);moneyInputs(nf);bindPayer(nf);bindForm[t](nf,pre);pre={};};
    $$('[data-seg]',sh).forEach(b=>b.onclick=()=>draw(b.dataset.seg));draw(tipo);});
}
const fecha=(id)=>`<label class="f">Fecha<input id="${id}" type="date" value="${iso(today())}"></label>`;
function chipsCats(sel){return topsG().map(t=>`<button type="button" class="chip" data-cat="${esc(t.id)}" aria-pressed="${t.id===sel}">${esc(catIcon(t.id))} ${esc(t.nombre)}</button>`+catsG().filter(c=>c.padre===t.id).map(c=>`<button type="button" class="chip sub" data-cat="${esc(c.id)}" aria-pressed="${c.id===sel}">${c.icono?esc(c.icono)+' ':''}${esc(c.nombre)}</button>`).join('')).join('')+`<button type="button" class="chip add" data-newcat>+ Nueva categoría</button>`;}
function ultimoGasto(){return Object.values(S.cycles).flatMap(c=>c.movs).filter(v=>v.t==='gasto').sort((a,b)=>(b.fecha+b.id).localeCompare(a.fecha+a.id))[0];}
const padHTML=id=>`<div class="pad" data-pad="${id}">${['1','2','3','4','5','6','7','8','9','000','0','⌫'].map(k=>`<button type="button" data-k="${k}" aria-label="${k==='⌫'?'Borrar':k}">${k}</button>`).join('')}</div>`;
function bindPad(root){$$('[data-pad]',root).forEach(p=>{const inp=$('#'+p.dataset.pad,root);p.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;let d=String(num(inp.value)||'');d=b.dataset.k==='⌫'?d.slice(0,-1):(d+b.dataset.k).replace(/^0+/,'').slice(0,11);inp.value=d?fmt(Number(d)):'';inp.dispatchEvent(new Event('input',{bubbles:true}));});
  inp.addEventListener('input',()=>{const n=num(inp.value);const s=n?fmt(n):'';if(inp.value!==s)inp.value=s;});});}
function fGasto(){const sel=catObj('hormiga')?'hormiga':catsG()[0]?.id;const u=ultimoGasto();return `<div class="stack"><input id="gM" class="money" inputmode="none" placeholder="$0" aria-label="Valor" autocomplete="off">
  ${padHTML('gM')}
  <div class="chips">${u?`<button type="button" class="chip add" data-repeat>↻ Repetir: ${esc(u.nota||catN(u.cat))} <small>${fmt(u.monto)}</small></button>`:''}${rapidos().map(a=>`<button type="button" class="chip" data-rap="${esc(a.id)}">${esc(catIcon(a.cat))} ${esc(a.nombre)}<small>${fmt(a.monto)}</small></button>`).join('')}</div>
  <div class="label">Categoría</div><div class="chips" id="gC" data-sel="${esc(sel)}">${chipsCats(sel)}</div>
  <div id="gNew" hidden class="ed"><div class="grid2"><label class="f">Nombre<input id="gNewN" placeholder="Ej: Salida con la novia"></label><label class="f">Dentro de<select id="gNewP"><option value="">Ninguna (principal)</option>${topsG().map(t=>`<option value="${esc(t.id)}">${esc(t.nombre)}</option>`).join('')}</select></label><label class="f">Ícono (emoji)<input id="gNewI" placeholder="💑"></label><label class="f">Color<select id="gNewC">${PALETA.map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label></div><button type="button" class="btn sm" id="gNewOk">Crear y usar</button></div>
  ${payerHTML('gasto',true,ls.get('cc-src-gasto'),'¿Con qué pagaste?')}
  <div class="grid2"><label class="f">Qué fue<input id="gN" placeholder="Opcional"></label>${fecha('gF')}</div><button class="btn" id="gOk">Guardar gasto</button></div>`;}
function fIngreso(){return `<div class="stack"><div class="chips">${catsI().map(c=>`<button type="button" class="chip" data-ing="${esc(c.id)}" aria-pressed="${c.id==='sueldo'}">${esc(c.nombre)}</button>`).join('')}</div>
  <input id="iM" class="money" inputmode="numeric" value="${fmt(netoPorPago())}" aria-label="Valor">
  ${payerHTML('ingreso',false,cfg().ingreso.cuenta,'¿Dónde entró la plata?')}
  <div class="grid2"><label class="f">Detalle<input id="iN" placeholder="Opcional"></label>${fecha('iF')}</div><button class="btn" id="iOk">Guardar ingreso</button></div>`;}
function fExtra(){const fs=cfg().fuentes||[];if(!fs.length)return '<div class="empty">No tienes trabajos por días configurados. Agrégalos en Ajustes → Ingresos extra (por ejemplo: moto, domicilios, ventas).</div>';const f=fuentePrincipal()||fs[0];
  return `<div class="stack"><div class="chips">${fs.map(x=>`<button type="button" class="chip" data-fuente="${esc(x.id)}" aria-pressed="${x.id===f.id}">${esc(x.nombre)}</button>`).join('')}</div>
  <label class="f">Lo que hiciste (bruto)<input id="xB" class="money" inputmode="numeric" placeholder="$0"></label><div id="xDed" class="grid2"></div>
  <label class="f">Horas trabajadas (opcional)<input id="xH" inputmode="decimal" placeholder="Ej: 8"></label>
  <div class="row"><span class="label">Te quedó libre</span><span class="libre" id="xN" style="font-size:1.6rem">$0</span></div>
  ${payerHTML('extra',false,f.cuenta,'¿Dónde quedó la plata?')}${fecha('xF')}<button class="btn" id="xOk">Guardar</button></div>`;}
function fPago(pre){const k=curKey();const pend=[...obligaciones(k),...obligaciones(addCycle(k,1))].filter(o=>!o.estado);
  const opts=[...pend.map(o=>[`o:${o.due>cEnd(k)?addCycle(k,1):k}:${o.id}`,`${o.nombre} · ${fmt(o.monto)} · ${fdate(o.due)}`]),...deudas().map(d=>[`a:${d.id}`,`Abono extra a ${d.nombre}`]),...metas().map(m=>[`m:${m.id}`,`Apartar para ${m.nombre}`])];
  return `<div class="stack"><label class="f">¿Qué vas a pagar?<select id="pQ">${opts.map(([v,n])=>`<option value="${esc(v)}" ${pre.sel===v?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
  <input id="pM" class="money" inputmode="numeric" aria-label="Valor"><div id="pInfo"></div>
  ${payerHTML('pago',false,ls.get('cc-src-pago')||cfg().ingreso.cuenta,'¿Desde dónde?')}${fecha('pF')}
  <div class="btns"><button class="btn" id="pOk">Registrar</button><button class="btn ghost" id="pLater" hidden>Lo pago el otro ciclo</button></div></div>`;}
function fMover(){const cs=cfg().cuentas||[];const sel=(id,d)=>`<select id="${id}">${cs.map(c=>`<option value="${esc(c.id)}" ${c.id===d?'selected':''}>${esc(c.nombre)} (${fmt(saldo(c.id))})</option>`).join('')}</select>`;
  return `<div class="stack"><p class="muted small">Para retiros en cajero, pasar de Bancolombia a Nequi o guardar efectivo en el banco.</p><input id="mM" class="money" inputmode="numeric" placeholder="$0" aria-label="Valor">
  <div class="grid2"><label class="f">Sale de${sel('mDe',cfg().ingreso.cuenta)}</label><label class="f">Llega a${sel('mA',cs.find(c=>c.tipo==='efectivo')?.id)}</label></div>
  <label class="f">Costo del movimiento (opcional)<input id="mC" inputmode="numeric" placeholder="$0"></label>${fecha('mF')}<button class="btn" id="mOk">Guardar</button></div>`;}
const bindForm={
  gasto(nf){const box=$('#gC',nf);let cat=box.dataset.sel;const pick=id=>{cat=id;$$('[data-cat]',box).forEach(x=>x.setAttribute('aria-pressed',x.dataset.cat===id));};
    box.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b)pick(b.dataset.cat);if(e.target.closest('[data-newcat]')){$('#gNew').hidden=false;$('#gNewN').focus();}});
    $('#gNewOk').onclick=()=>{const n=$('#gNewN').value.trim();if(!n)return toast('Escribe el nombre');ensureCats();const id='cat-'+uid();S.config.categorias.gasto.push({id,nombre:n,padre:$('#gNewP').value,icono:[...$('#gNewI').value.trim()].slice(0,2).join(''),color:$('#gNewC').value});persist('config');box.innerHTML=chipsCats(id);cat=id;$('#gNew').hidden=true;$('#gNewN').value='';toast('Categoría creada');};
    $$('[data-rap]',nf).forEach(b=>b.onclick=()=>{const a=rapidos().find(x=>x.id===b.dataset.rap);if(!a)return;$('#gM').value=fmt(a.monto);$('#gN').value=a.nombre;if(catObj(a.cat))pick(a.cat);});
    bindPad(nf);
    const rp=$('[data-repeat]',nf);if(rp)rp.onclick=()=>{const u=ultimoGasto();if(!u)return;$('#gM').value=fmt(u.monto);$('#gN').value=u.nota||'';if(catObj(u.cat))pick(u.cat);const src=(u.fx||[]).filter(f=>f.k==='cuenta'||f.k==='deuda');if(src.length===1){const w=$('[data-payer="gasto"]',nf);const want=(src[0].k==='deuda'?'tarjeta:':'cuenta:')+src[0].id;const b=$(`[data-src="${want}"]`,w);if(b)b.click();}toast('Listo, revisa y guarda');};
    $('#gOk').onclick=()=>{const m=num($('#gM').value);if(!m)return toast('Escribe el valor');const pr=readPayer(nf,'gasto',m);if(pr.err)return toast(pr.err);
      addMov({id:uid(),t:'gasto',monto:m,cat,nota:$('#gN').value.trim(),fecha:$('#gF').value||iso(today()),fx:fxFromParts(pr.parts,-1)});closeSheet();const ph=puedesHoy();toast(ph?`Guardado · hoy te quedan ${fmt(Math.max(0,ph.restante))}`:'Gasto guardado');render();};},
  ingreso(nf){let cat='sueldo';$$('[data-ing]',nf).forEach(b=>b.onclick=()=>{cat=b.dataset.ing;$$('[data-ing]',nf).forEach(x=>x.setAttribute('aria-pressed',x===b));if(cat!=='sueldo'&&num($('#iM').value)===netoPorPago())$('#iM').value='';});
    $('#iOk').onclick=()=>{const m=num($('#iM').value);if(!m)return toast('Escribe el valor');const pr=readPayer(nf,'ingreso',m);if(pr.err)return toast(pr.err);
      addMov({id:uid(),t:'ingreso',cat,monto:m,nota:$('#iN').value.trim(),fecha:$('#iF').value||iso(today()),fx:fxFromParts(pr.parts,1)});closeSheet();toast('Ingreso guardado');render();};},
  extra(nf){const fs=cfg().fuentes||[];if(!fs.length)return;let f=fuentePrincipal()||fs[0];
    const drawDed=()=>{$('#xDed').innerHTML=(f.deducciones||[]).map((d,i)=>`<label class="f">${esc(d.nombre)}<input inputmode="numeric" data-ded="${i}" value="${d.monto?fmt(d.monto):''}" placeholder="$0"></label>`).join('');moneyInputs($('#xDed'));$$('[data-ded]',nf).forEach(x=>x.oninput=upd);upd();};
    const neto=()=>num($('#xB').value)-$$('[data-ded]',nf).reduce((a,x)=>a+num(x.value),0);
    const upd=()=>{const n=neto();$('#xN').textContent=fmt(n);$('#xN').className='libre '+(n<0?'neg':'pos');};
    $('#xB').oninput=upd;$$('[data-fuente]',nf).forEach(b=>b.onclick=()=>{f=fs.find(x=>x.id===b.dataset.fuente);$$('[data-fuente]',nf).forEach(x=>x.setAttribute('aria-pressed',x===b));drawDed();});drawDed();
    $('#xOk').onclick=()=>{const bruto=num($('#xB').value);if(!bruto)return toast('Escribe lo que hiciste');const n=neto();const pr=readPayer(nf,'extra',Math.max(0,n));if(pr.err)return toast(pr.err);
      const ded=(f.deducciones||[]).map((d,i)=>({nombre:d.nombre,monto:num($(`[data-ded="${i}"]`,nf).value)}));
      addMov({id:uid(),t:'extra',fuente:f.id,bruto,deducciones:ded,monto:n,horas:Math.min(24,dec($('#xH').value))||0,fecha:$('#xF').value||iso(today()),fx:n>0?fxFromParts(pr.parts,1):[]});closeSheet();render();if(n>0)sheetReparto(f,n);else toast('Guardado');};
    setTimeout(()=>$('#xB')?.focus(),30);},
  pago(nf){const upd=()=>{const v=$('#pQ').value;const[tp,a,b]=v.split(':');let m=0,info='';$('#pLater').hidden=true;
      if(tp==='o'){const o=obligaciones(a).find(x=>x.id===b);if(o){m=o.monto;const cta=o.cuenta||(o.deudaId&&deuda(o.deudaId)?.cuenta);if(cta){const w=$('[data-payer="pago"]',nf);const bt=w&&$(`[data-src="cuenta:${cta}"]`,w);if(bt&&bt.getAttribute('aria-pressed')!=='true')bt.click();}if(o.fam)info=`<div class="note ok">Incluye ${fmt(o.fam)} que te pasan. Tu parte: ${fmt(o.propio)}.</div>`;if(o.deudaId&&esTarjeta(o.deudaId)&&!o.extra)info+='<div class="muted small">Le descuento esto a la tarjeta y le sumo el interés del mes. Con el extracto corriges el saldo exacto.</div>';$('#pLater').hidden=o.extra;}}
      else if(tp==='a')info='<div class="muted small">Abono por encima del pago del mes. Pide que sea a capital reduciendo plazo.</div>';
      else info='<div class="muted small">Queda apartado: no cuenta como plata libre hasta que lo uses.</div>';
      $('#pM').value=m?fmt(m):'';$('#pInfo').innerHTML=info;$('[data-payer="pago"]',nf).hidden=tp==='m';};
    $('#pQ').onchange=upd;upd();
    $('#pOk').onclick=()=>{const m=num($('#pM').value);if(!m)return toast('Escribe el valor');const[tp,a,b]=$('#pQ').value.split(':');const f=$('#pF').value||iso(today());
      if(tp==='m'){addMov({id:uid(),t:'apartar',metaId:a,monto:m,fecha:f,fx:[{k:'meta',id:a,d:m}]});closeSheet();toast('Apartado');render();return;}
      const pr=readPayer(nf,'pago',m);if(pr.err)return toast(pr.err);const fx=fxFromParts(pr.parts,-1);
      if(tp==='a'){const d=deuda(a);fx.push({k:'deuda',id:a,d:-Math.min(m,d?.saldo||m)});addMov({id:uid(),t:'abono',deudaId:a,monto:m,fecha:f,fx});}
      else{const o=obligaciones(a).find(x=>x.id===b);if(!o)return;if(o.deudaId){const d=deuda(o.deudaId);if(d){const nuevo=(!o.extra&&d.tipo==='tarjeta')?d.saldo*(1+(d.tasa||0))-m:(d.plan&&d.tasa?d.saldo*(1+rPlan(d))-m:d.saldo-m);fx.push({k:'deuda',id:d.id,d:Math.round(Math.max(0,nuevo)-d.saldo)});}}
        const id=uid();C(a).pagados[o.id]={monto:m,fecha:f,mov:id};C(a).movs.push({id,t:'pago',ref:o.id,nombre:o.nombre,monto:m,fecha:f,deudaId:o.deudaId||null,fx});applyFx(fx);saveC(a);}
      closeSheet();toast('Registrado');render();};
    $('#pLater').onclick=()=>{const[,a,b]=$('#pQ').value.split(':');const o=obligaciones(a).find(x=>x.id===b);if(!o)return;C(a).pagados[o.id]={aplazado:true};const nk=addCycle(a,1);C(nk).extras.push({id:'ap-'+o.id+'-'+a,nombre:o.nombre+' (aplazado)',monto:o.monto,dia:cStart(nk).getDate(),deudaId:o.deudaId||null});saveC(a);saveC(nk);closeSheet();toast('Pasado al siguiente ciclo');render();};},
  mover(nf){$('#mOk').onclick=()=>{const m=num($('#mM').value),de=$('#mDe').value,a=$('#mA').value,c=num($('#mC').value);if(!m)return toast('Escribe el valor');if(de===a)return toast('Elige cuentas distintas');const f=$('#mF').value||iso(today());
    addMov({id:uid(),t:'mover',de,a,monto:m,fecha:f,fx:[{k:'cuenta',id:de,d:-m},{k:'cuenta',id:a,d:m}]});if(c)addMov({id:uid(),t:'gasto',cat:'otros',nota:'Costo de transacción',monto:c,fecha:f,fx:[{k:'cuenta',id:de,d:-c}]});closeSheet();toast('Movimiento guardado');render();};}
};
function sheetReparto(f,n){
  const r=resumen(curKey());const sp=f.reparto||{deudas:50,ahorro:30};let cubrir=r.libre<0?Math.min(n,-r.libre):0;const resto=n-cubrir;const dd=Math.round(resto*(sp.deudas||0)/100),ah=Math.round(resto*(sp.ahorro||0)/100),lib=resto-dd-ah;
  const dest=deuda(cfg().destinoExtra)||deudas().filter(d=>d.saldo>0).sort((a,b)=>(b.tasa||0)-(a.tasa||0))[0];const meta=metas()[0];
  const pr=dest&&dd?proyectar(null,0):null;
  openSheet(`<div class="stack"><h2>Quedaron ${fmt(n)} libres</h2>${cubrir?`<div class="note">Primero cubre lo que falta del ciclo: ${fmt(cubrir)}.</div>`:''}
    <div class="split"><div><div class="label">Deudas</div><div class="v">${fmt(dd)}</div><div class="muted" style="font-size:.75rem">${esc(dest?.nombre||'—')}</div></div><div><div class="label">Ahorro</div><div class="v">${fmt(ah)}</div><div class="muted" style="font-size:.75rem">${esc(meta?.nombre||'—')}</div></div><div><div class="label">Para ti</div><div class="v">${fmt(lib)}</div><div class="muted" style="font-size:.75rem">Sin culpa</div></div></div>
    <p class="muted small">Cuando lo hagas, márcalo aquí y se descuenta de tus cuentas.</p>
    <div class="btns">${dest&&dd?`<button class="btn sm" id="rD">Abonar ${fmt(dd)} a ${esc(dest.nombre)}</button>`:''}${meta&&ah?`<button class="btn ghost sm" id="rA">Apartar ${fmt(ah)}</button>`:''}</div><button class="btn ghost" id="rOk">Listo</button></div>`,sh=>{
    $('#rOk').onclick=closeSheet;
    const d=$('#rD');if(d)d.onclick=()=>{closeSheet();sheetNuevo('pago',{sel:'a:'+dest.id});setTimeout(()=>{$('#pM').value=fmt(dd);},40);};
    const a=$('#rA');if(a)a.onclick=()=>{addMov({id:uid(),t:'apartar',metaId:meta.id,monto:ah,fecha:iso(today()),fx:[{k:'meta',id:meta.id,d:ah}]});a.disabled=true;a.textContent='Apartado';render();};});
}
function sheetCuadre(){
  const cs=cfg().cuentas||[];
  openSheet(`<div class="stack"><h2>Cuadrar cuentas</h2><p class="muted small">Mira tu billetera y las apps del banco y escribe cuánto tienes de verdad. Si hay diferencia, la registro como gasto sin registrar (o plata de más).</p>
    ${cs.map(c=>`<label class="f">${esc(c.nombre)} <span style="font-weight:500">· en la app: ${fmt(saldo(c.id))}</span><input inputmode="numeric" data-real="${esc(c.id)}" value="${fmt(saldo(c.id))}"></label>`).join('')}
    <div id="qD"></div><button class="btn" id="qOk">Guardar cuadre</button></div>`,sh=>{
    const diff=()=>$$('[data-real]',sh).map(i=>({id:i.dataset.real,d:num(i.value)-saldo(i.dataset.real)})).filter(x=>x.d);
    $$('[data-real]',sh).forEach(i=>i.addEventListener('input',()=>{const t=diff().reduce((a,x)=>a+x.d,0);$('#qD').innerHTML=t?`<div class="note ${t<0?'bad':'ok'}">${t<0?`Se fueron ${fmt(-t)} sin registrar.`:`Tienes ${fmt(t)} más de lo registrado.`}</div>`:'';}));
    $('#qOk').onclick=()=>{const ds=diff();const t=ds.reduce((a,x)=>a+x.d,0);if(ds.length)addMov({id:uid(),t:'ajuste',monto:t,fecha:iso(today()),fx:ds.map(x=>({k:'cuenta',id:x.id,d:x.d}))});S.config.ultimoCuadre=iso(today());persist('config');closeSheet();toast(ds.length?'Cuentas cuadradas':'Todo cuadraba');render();};});
}
function sheetRecibir(k,id){const x=cobrosDe(k).find(z=>z.id===id);if(!x)return;
  openSheet(`<div class="stack"><h2>Recibí de ${esc(x.quien)}</h2><input id="rM" class="money" inputmode="numeric" value="${fmt(x.monto)}" aria-label="Valor">${payerHTML('recibir',false,cfg().ingreso.cuenta,'¿Dónde entró?')}<p class="muted small">Se suma al pago de ${esc(deuda(x.destino)?.nombre||'la deuda')} de este ciclo.</p><button class="btn" id="rOk">Guardar</button></div>`,sh=>{bindPayer(sh);
    $('#rOk').onclick=()=>{const m=num($('#rM').value);const pr=readPayer(sh,'recibir',m);if(pr.err)return toast(pr.err);const mid=uid();C(k).cobros[id]={monto:m,fecha:iso(today()),mov:mid};C(k).movs.push({id:mid,t:'ingreso',cat:'familia',monto:m,nota:`${x.quien}: ${x.concepto}`,fecha:iso(today()),cobro:id,fx:fxFromParts(pr.parts,1)});applyFx(C(k).movs[C(k).movs.length-1].fx);saveC(k);closeSheet();toast('Recibido');render();};});}
function sheetSaldo(id){const d=deuda(id);if(!d)return;openSheet(`<div class="stack"><h2>Corregir saldo: ${esc(d.nombre)}</h2><p class="muted small">El saldo que muestra el banco hoy.</p><input id="sM" class="money" inputmode="numeric" value="${fmt(d.saldo)}" aria-label="Saldo">${d.tipo==='tarjeta'?`<label class="f">Pago mínimo del último extracto<input id="sMin" inputmode="numeric" value="${fmt(d.minimo||0)}"></label>`:''}<button class="btn" id="sOk">Guardar</button></div>`,sh=>{$('#sOk').onclick=()=>{d.saldo=num($('#sM').value);if($('#sMin'))d.minimo=num($('#sMin').value);d.actualizado=iso(today());persist('deudas');closeSheet();toast('Saldo actualizado');render();};});}
function sheetLiberar(id){const m=metas().find(x=>x.id===id);if(!m)return;openSheet(`<div class="stack"><h2>Usar plata de ${esc(m.nombre)}</h2><p class="muted small">Vuelve a contar como plata libre. Luego registra el gasto normal.</p><input id="lM" class="money" inputmode="numeric" value="${fmt(m.ahorrado)}" aria-label="Valor"><button class="btn" id="lOk">Liberar</button></div>`,sh=>{$('#lOk').onclick=()=>{const v=Math.min(num($('#lM').value),m.ahorrado||0);if(!v)return;addMov({id:uid(),t:'apartar',metaId:id,monto:-v,fecha:iso(today()),fx:[{k:'meta',id,d:-v}]});closeSheet();render();};});}

/* ================= configuración (ajustes y asistente) ================= */
const EDS={};
function fieldEd(f,v){const lab=`<span>${esc(f.label)}</span>`;
  if(f.type==='select')return `<label class="f">${lab}<select data-k="${f.k}">${(typeof f.options==='function'?f.options():f.options).map(([a,n])=>`<option value="${esc(a)}" ${String(a)===String(v)?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  if(f.type==='money')return `<label class="f">${lab}<input data-k="${f.k}" inputmode="numeric" value="${v?fmt(v):''}" placeholder="$0"></label>`;
  if(f.type==='num')return `<label class="f">${lab}<input data-k="${f.k}" inputmode="numeric" data-plain value="${v??''}"></label>`;
  if(f.type==='pct')return `<label class="f">${lab}<input data-k="${f.k}" inputmode="decimal" value="${v!=null?(v*100).toFixed(4).replace(/0+$/,'').replace(/\.$/,''):''}" placeholder="2,15"></label>`;
  return `<label class="f">${lab}<input data-k="${f.k}" value="${esc(v??'')}" placeholder="${esc(f.ph||'')}"></label>`;}
function rowEd(key,it,i){const e=EDS[key];return `<div class="ed" data-row="${i}"><div class="grid2">${e.fields.map(f=>fieldEd(f,it[f.k])).join('')}</div><button type="button" class="x" data-rm>Quitar</button></div>`;}
function listEd(key,items,fields,addLabel,newItem){EDS[key]={fields,newItem,base:items};return `<div class="stack" data-list="${key}" style="gap:10px">${items.map((it,i)=>rowEd(key,it,i)).join('')}</div><button type="button" class="btn ghost sm" data-add="${key}">${esc(addLabel)}</button>`;}
function readList(root,key){const e=EDS[key];return $$(`[data-list="${key}"] > [data-row]`,root).map(row=>{const i=Number(row.dataset.row);const it=JSON.parse(JSON.stringify(e.base[i]||{...e.newItem(),id:(e.newItem().id||'i')+'-'+uid()}));
  for(const f of e.fields){const el=$(`[data-k="${f.k}"]`,row);if(!el)continue;it[f.k]=f.type==='money'?num(el.value):f.type==='num'?num(el.value):f.type==='pct'?dec(el.value)/100:f.type==='select'&&f.numeric?Number(el.value):el.value.trim();}return it;});}
function bindEds(root){root.addEventListener('click',e=>{const a=e.target.closest('[data-add]');if(a){const key=a.dataset.add,box=$(`[data-list="${key}"]`,root);const i=1000+box.children.length+Math.floor(Math.random()*1e5);box.insertAdjacentHTML('beforeend',rowEd(key,EDS[key].newItem(),i));moneyInputs(box);}
  const r=e.target.closest('[data-rm]');if(r)r.closest('.ed').remove();});moneyInputs(root);}
const cuentasOpts=()=>(cfg().cuentas||[]).map(c=>[c.id,c.nombre]);
const deudasOpts=()=>deudas().map(d=>[d.id,d.nombre]);
const SECCIONES={
  plantilla:{t:'¿Cuál se parece más a ti?',d:'Así arranco con categorías, atajos e ingresos pensados para tu caso. Todo lo puedes cambiar después.',html:c=>`<div class="preset" id="sPre">${PRESETS.map(p=>`<button type="button" data-pre="${p.id}" aria-pressed="${p.id===(c.plantilla||'empleado')}"><span class="e" aria-hidden="true">${p.e}</span><span><b>${esc(p.n)}</b><span class="muted small">${esc(p.d)}</span></span></button>`).join('')}</div>`,
    mount:root=>$('#sPre',root).addEventListener('click',e=>{const b=e.target.closest('[data-pre]');if(b)$$('[data-pre]',root).forEach(x=>x.setAttribute('aria-pressed',x===b));}),
    save:(root,c)=>{const id=$('[data-pre][aria-pressed="true"]',root)?.dataset.pre||'empleado';c.plantilla=id;PRESETS.find(p=>p.id===id)?.apply(c);}},
  perfil:{t:'Tu perfil',d:'Cómo te llamamos.',html:c=>`<label class="f">Tu nombre<input id="sNombre" value="${esc(c.perfil.nombre)}" placeholder="Ej: Alexis"></label>`,
    save:(root,c)=>{c.perfil.nombre=$('#sNombre',root).value.trim();}},
  ingresos:{t:'¿Cómo te entra la plata?',d:'Elige tu forma de ganar. La app se ajusta: con sueldo te cuenta de un pago al otro; trabajando por días te pone una meta diaria.',html:c=>{const tp=c.ingreso.tipo||'sueldo';const fs=c.fuentes||[];return `
    <div class="seg" role="group" aria-label="Tipo de ingreso" id="sTipo">${segBtns([['sueldo','Sueldo fijo'],['diario','Trabajo por días'],['ambos','Las dos']],tp)}</div>
    <div id="bDiario" class="stack" ${tp==='sueldo'?'hidden':''} style="gap:10px">
      <p class="muted small">Moto, domicilios, ventas, rebusque: registras cada día lo que hiciste y sus costos, y la app calcula cuánto necesitas por día para cubrir tus pagos.</p>
      <div class="grid2"><label class="f">Actividad principal<select id="sFp">${fs.map(f=>`<option value="${esc(f.id)}" ${f.id===c.ingreso.fuentePrincipal?'selected':''}>${esc(f.nombre)}</option>`).join('')}<option value="nueva" ${fs.length?'':'selected'}>Crear una nueva</option></select></label>
      <label class="f">Días que trabajas a la semana<input id="sDs" inputmode="numeric" data-plain value="${c.ingreso.diasSemana||6}"></label></div>
      <div id="bNueva" class="grid2" ${fs.length?'hidden':''}><label class="f">Nombre<input id="sFn" placeholder="Moto"></label><label class="f">Costo fijo por día<input id="sFc" inputmode="numeric" placeholder="$9.000"></label></div>
      <label class="f" id="bCorte" ${tp==='diario'?'':'hidden'}>¿Cada cuánto haces cuentas?<select id="sCorte"><option value="mensual">Cada mes (del 1 al 30)</option><option value="quincenal" ${tp==='diario'&&(c.ingreso.dias||[]).length>1?'selected':''}>Cada quincena (1 y 16)</option></select></label>
    </div>
    <div id="bSueldo" class="stack" ${tp==='diario'?'hidden':''} style="gap:10px">
    <div class="grid2"><label class="f">¿Cada cuánto te pagan?<select id="sFreq"><option value="mensual" ${c.ingreso.frecuencia==='mensual'?'selected':''}>Una vez al mes</option><option value="quincenal" ${c.ingreso.frecuencia==='quincenal'?'selected':''}>Cada quincena</option></select></label>
    <label class="f">Día(s) de pago<input id="sDias" value="${esc((c.ingreso.dias||[]).join(', '))}" placeholder="25 · o 15, 30"></label></div>
    <div class="label">Componentes del sueldo (al mes)</div>${listEd('comp',c.ingreso.componentes||[],[{k:'nombre',label:'Concepto',ph:'Salario básico'},{k:'monto',label:'Valor',type:'money'},{k:'signo',label:'Tipo',type:'select',numeric:true,options:[[1,'Suma'],[-1,'Resta (deducción)']]}],'Agregar concepto',()=>({id:'c',nombre:'',monto:0,signo:1}))}
    <div class="row"><span class="label">Neto al mes</span><span class="amt" id="sNeto">${fmt(netoMensual())}</span></div>
    <label class="f">¿A qué cuenta te llega?<select id="sCta">${cuentasOpts().map(([a,n])=>`<option value="${esc(a)}" ${a===c.ingreso.cuenta?'selected':''}>${esc(n)}</option>`).join('')}</select></label></div>`;},
    mount:root=>{const upd=()=>{const items=readList(root,'comp');$('#sNeto',root).textContent=fmt(items.reduce((a,x)=>a+(x.signo<0?-1:1)*x.monto,0));};root.addEventListener('input',upd);root.addEventListener('change',upd);
      $('#sTipo',root).addEventListener('click',e=>{const b=e.target.closest('[data-seg]');if(!b)return;$$('#sTipo [data-seg]',root).forEach(x=>x.setAttribute('aria-pressed',x===b));const t=b.dataset.seg;$('#bDiario',root).hidden=t==='sueldo';$('#bSueldo',root).hidden=t==='diario';$('#bCorte',root).hidden=t!=='diario';});
      $('#sFp',root).addEventListener('change',e=>{$('#bNueva',root).hidden=e.target.value!=='nueva';});},
    save:(root,c)=>{const t=$('#sTipo [aria-pressed="true"]',root)?.dataset.seg||'sueldo';c.ingreso.tipo=t;
      if(t!=='diario'){c.ingreso.frecuencia=$('#sFreq',root).value;let dias=$('#sDias',root).value.split(/[^\d]+/).map(Number).filter(x=>x>=1&&x<=31);if(!dias.length)dias=[30];if(c.ingreso.frecuencia==='mensual')dias=[dias[0]];c.ingreso.dias=dias;c.ingreso.componentes=readList(root,'comp').filter(x=>x.nombre||x.monto);const cta=$('#sCta',root);if(cta)c.ingreso.cuenta=cta.value;}
      else{const q=$('#sCorte',root).value==='quincenal';c.ingreso.frecuencia=q?'quincenal':'mensual';c.ingreso.dias=q?[1,16]:[1];}
      if(t!=='sueldo'){c.ingreso.diasSemana=Math.min(7,Math.max(1,num($('#sDs',root).value)||6));let fp=$('#sFp',root).value;
        if(fp==='nueva'){const n=$('#sFn',root).value.trim()||'Mi trabajo';const id='x-'+uid();const cta=(c.cuentas||[]).find(x=>x.tipo==='efectivo')?.id||c.cuentas?.[0]?.id||'';
          c.fuentes=[...(c.fuentes||[]),{id,nombre:n,cuenta:cta,deducciones:[{nombre:'Costo fijo del día',monto:num($('#sFc',root).value)},{nombre:'Gasolina',monto:0},{nombre:'Otros',monto:0}],reparto:{deudas:40,ahorro:20,libre:40}}];fp=id;}
        c.ingreso.fuentePrincipal=fp;}}},
  cuentas:{t:'Tus cuentas',d:'Dónde tienes la plata: efectivo, bancos, Nequi, Daviplata, bolsillos.',html:(c,wiz)=>`${listEd('ctas',(c.cuentas||[]).map(x=>({...x,saldoHoy:saldo(x.id)})),[{k:'nombre',label:'Nombre',ph:'Nequi'},{k:'tipo',label:'Tipo',type:'select',options:TIPOS_CUENTA},...(wiz?[{k:'saldoHoy',label:'¿Cuánto tienes hoy?',type:'money'}]:[])],'Agregar cuenta',()=>({id:'cta',nombre:'',tipo:'billetera',saldoHoy:0}))}
    ${wiz?'':'<button type="button" class="btn ghost sm" data-action="cuadrar">Cuadrar saldos</button>'}`,
    save:(root,c,wiz)=>{const items=readList(root,'ctas').filter(x=>x.nombre);c.cuentas=items.map(({saldoHoy,...x})=>x);if(wiz){S.saldos={cuentas:Object.fromEntries(items.map(x=>[x.id,x.saldoHoy||0]))};persist('saldos');c.ultimoCuadre=iso(today());}
      if(!c.cuentas.find(x=>x.id===c.ingreso.cuenta))c.ingreso.cuenta=c.cuentas[0]?.id||'';}},
  fijos:{t:'Gastos fijos',d:'Lo que pagas todos los meses: arriendo, servicios, internet, mercado. Las deudas van aparte.',html:c=>listEd('fijos',c.fijos||[],[{k:'nombre',label:'Concepto',ph:'Arriendo'},{k:'monto',label:'Valor',type:'money'},{k:'dia',label:'Día del mes',type:'num'}],'Agregar gasto fijo',()=>({id:'f',nombre:'',monto:0,dia:30})),
    save:(root,c)=>{c.fijos=readList(root,'fijos').filter(x=>x.nombre).map(x=>({...x,dia:Math.min(31,Math.max(1,x.dia||1))}));}},
  deudas:{t:'Tus deudas',d:'Tarjetas de crédito y préstamos. En "Pago al mes" pon lo que planeas pagar (o la cuota del préstamo). Puedes llenarlas leyendo un extracto.',html:()=>`${listEd('deudas',deudas(),[{k:'nombre',label:'Nombre',ph:'Visa *1234'},{k:'tipo',label:'Tipo',type:'select',options:[['tarjeta','Tarjeta de crédito'],['prestamo','Préstamo / crédito']]},{k:'saldo',label:'Saldo hoy',type:'money'},{k:'pago',label:'Pago al mes',type:'money'},{k:'dia',label:'Día de pago',type:'num'},{k:'tasa',label:'Interés mensual %',type:'pct'}],'Agregar deuda',()=>({id:'d',nombre:'',tipo:'tarjeta',saldo:0,pago:0,dia:5,tasa:0.02}))}
    <details><summary>Leer un extracto para llenar esto</summary><div id="sExt" style="margin-top:8px"></div></details>
    <label class="f">Cargos fijos de tarjetas al mes (cuota de manejo, suscripciones)<input id="sCargos" inputmode="numeric" value="${fmt(cfg().cargosTarjeta)}"></label>`,
    mount:root=>mountExtracto($('#sExt',root),()=>{built.setup=false;built.ajustes=false;render();}),
    save:(root,c)=>{const items=readList(root,'deudas').filter(x=>x.nombre);const old=deudas();S.deudas={items:items.map(x=>({...x,dia:Math.min(31,Math.max(1,x.dia||1)),actualizado:(old.find(o=>o.id===x.id)?.saldo===x.saldo)?x.actualizado:iso(today())}))};persist('deudas');
      c.cargosTarjeta=num($('#sCargos',root).value);const tot=S.deudas.items.reduce((a,d)=>a+d.saldo,0);if(!c.deudaInicial||tot>c.deudaInicial)c.deudaInicial=tot;}},
  fuentes:{t:'Ingresos extra',d:'Cada uno es una categoría de ingreso extra: moto, domicilios, ventas. Pon los costos de cada día (pase, gasolina); si cambian, déjalos en $0 y los escribes cada vez.',html:c=>`${listEd('fuentes',(c.fuentes||[]).map(f=>({...f,d1n:f.deducciones?.[0]?.nombre||'',d1:f.deducciones?.[0]?.monto||0,d2n:f.deducciones?.[1]?.nombre||'',d2:f.deducciones?.[1]?.monto||0,d3n:f.deducciones?.[2]?.nombre||'',d3:f.deducciones?.[2]?.monto||0,pd:f.reparto?.deudas??50,pa:f.reparto?.ahorro??30})),
    [{k:'nombre',label:'Nombre',ph:'Moto'},{k:'cuenta',label:'¿Dónde queda la plata?',type:'select',options:cuentasOpts},{k:'d1n',label:'Costo 1',ph:'Pase'},{k:'d1',label:'Valor fijo',type:'money'},{k:'d2n',label:'Costo 2',ph:'Gasolina'},{k:'d2',label:'Valor fijo',type:'money'},{k:'d3n',label:'Costo 3',ph:'Comida'},{k:'d3',label:'Valor fijo',type:'money'},{k:'pd',label:'% a deudas',type:'num'},{k:'pa',label:'% a ahorro',type:'num'}],'Agregar ingreso extra',()=>({id:'x',nombre:'',cuenta:'efectivo',d1n:'',d1:0,d2n:'',d2:0,d3n:'',d3:0,pd:50,pa:30}))}`,
    save:(root,c)=>{c.fuentes=readList(root,'fuentes').filter(x=>x.nombre).map(x=>{const pd=Math.min(100,x.pd||0),pa=Math.min(100-pd,x.pa||0);return{id:x.id,nombre:x.nombre,cuenta:x.cuenta,deducciones:[[x.d1n,x.d1],[x.d2n,x.d2],[x.d3n,x.d3]].filter(([n])=>n).map(([nombre,monto])=>({nombre,monto})),reparto:{deudas:pd,ahorro:pa,libre:100-pd-pa}};});}},
  cobros:{t:'Otra plata que te pasan',d:'Para compras de tarjeta compartidas usa Deudas → "Compras y quién paga": ahí se calcula solo. Aquí van ayudas fijas que no son de una compra (por ejemplo, alguien que te ayuda con un valor al mes).',html:c=>listEd('cobros',(c.cobros||[]).map(x=>({...x,meses:(x.ciclos||[]).filter(z=>z>=curKey()).length})),[{k:'quien',label:'¿Quién?',ph:'Papá'},{k:'concepto',label:'¿Por qué?',ph:'Compra de Shein'},{k:'monto',label:'Valor al mes',type:'money'},{k:'destino',label:'Va a',type:'select',options:deudasOpts},{k:'meses',label:'Meses que faltan',type:'num'}],'Agregar',()=>({id:'cb',quien:'',concepto:'',monto:0,destino:deudas()[0]?.id||'',meses:1})),
    save:(root,c)=>{c.cobros=readList(root,'cobros').filter(x=>x.quien).map(({meses,...x})=>{const fut=(x.ciclos||[]).filter(z=>z>=curKey());if(fut.length!==meses){let k=curKey();if(C(k).cobros[x.id])k=addCycle(k,1);x.ciclos=[...(x.ciclos||[]).filter(z=>z<k),...Array.from({length:meses},(_,i)=>addCycle(k,i))];}return x;});}},
  personas:{t:'Personas con las que compartes',d:'Familia, pareja o amigos que te pagan parte de tus compras con tarjeta. Las asignas a cada compra en Deudas → "Compras y quién paga".',html:c=>listEd('personas',c.personas||[],[{k:'nombre',label:'Nombre',ph:'Papá'}],'Agregar persona',()=>({id:'p',nombre:''})),
    save:(root,c)=>{c.personas=readList(root,'personas').filter(x=>x.nombre).map(x=>({id:x.id,nombre:x.nombre}));}},
  metas:{t:'Metas de ahorro',d:'Colchón de emergencia, diciembre, un viaje. La plata apartada no cuenta como libre.',html:c=>listEd('metas',c.metas||[],[{k:'nombre',label:'Meta',ph:'Colchón de emergencia'},{k:'meta',label:'Objetivo',type:'money'},{k:'ahorrado',label:'Ya tienes apartado',type:'money'}],'Agregar meta',()=>({id:'m',nombre:'',meta:0,ahorrado:0})),
    save:(root,c)=>{c.metas=readList(root,'metas').filter(x=>x.nombre);}},
  categorias:{t:'Categorías',d:'Crea las tuyas. Una subcategoría va dentro de otra (Salidas → Con amigos, Con la novia) y en el análisis ves el total del grupo y el detalle.',html:()=>`
    <div class="label">De gastos</div>${listEd('catg',catsG().map(x=>({...x,icono:x.icono||catIcon(x.id),color:x.color||catColor(x.id)})),[{k:'nombre',label:'Nombre',ph:'Salida con amigos'},{k:'padre',label:'Dentro de',type:'select',options:()=>[['','Ninguna (principal)'],...topsG().map(t=>[t.id,t.nombre])]},{k:'icono',label:'Ícono (un emoji)',ph:'🍕'},{k:'color',label:'Color',type:'select',options:PALETA}],'Agregar categoría de gasto',()=>({id:'cat',nombre:'',padre:'',icono:'',color:'#5C7080'}))}
    <div class="label" style="margin-top:6px">De ingresos</div>${listEd('cati',catsI(),[{k:'nombre',label:'Nombre',ph:'Bonificación'}],'Agregar categoría de ingreso',()=>({id:'ing',nombre:''}))}
    <p class="muted small">Los ingresos extra con costos del día (moto, domicilios) se crean en "Ingresos extra". Si borras una categoría, lo que ya registraste queda como "Sin categoría".</p>`,
    save:(root,c)=>{const g=readList(root,'catg').filter(x=>x.nombre);const ids=new Set(g.map(x=>x.id));const tops=new Set(g.filter(x=>!x.padre||!ids.has(x.padre)).map(x=>x.id));
      const gasto=g.map(x=>({id:x.id,nombre:x.nombre,padre:x.padre&&x.padre!==x.id&&tops.has(x.padre)?x.padre:'',icono:[...(x.icono||'')].slice(0,2).join(''),color:x.color||'#5C7080'}));
      const ing=readList(root,'cati').filter(x=>x.nombre).map(x=>({id:x.id,nombre:x.nombre}));if(!ing.find(x=>x.id==='sueldo'))ing.unshift({id:'sueldo',nombre:'Sueldo'});
      c.categorias={gasto:gasto.length?gasto:JSON.parse(JSON.stringify(DEF_CG)),ingreso:ing};}},
  atajos:{t:'Atajos rápidos',d:'Los botones para registrar en un toque lo que compras seguido.',html:()=>listEd('atajos',rapidos(),[{k:'nombre',label:'Nombre',ph:'Gaseosa'},{k:'monto',label:'Valor',type:'money'},{k:'cat',label:'Categoría',type:'select',options:()=>catsG().map(x=>[x.id,catN(x.id)])}],'Agregar atajo',()=>({id:'a',nombre:'',monto:0,cat:catsG()[0]?.id||''})),
    save:(root,c)=>{c.atajos=readList(root,'atajos').filter(x=>x.nombre);}},
  topes:{t:'Topes por categoría',d:'Cuánto quieres gastar como máximo en cada cosa por ciclo. El tope de un grupo cuenta también sus subcategorías. Vacío = sin tope.',html:c=>`<div class="grid2">${catsG().map(x=>`<label class="f">${esc(catN(x.id))}<input inputmode="numeric" data-pres="${esc(x.id)}" value="${c.presupuestos?.[x.id]?fmt(c.presupuestos[x.id]):''}" placeholder="Sin tope"></label>`).join('')}</div>`,
    save:(root,c)=>{c.presupuestos={};$$('[data-pres]',root).forEach(i=>{const v=num(i.value);if(v)c.presupuestos[i.dataset.pres]=v;});}},
  general:{t:'Plan y recordatorios',d:'',html:c=>`<label class="f">Deuda a la que va lo extra<select id="sDest"><option value="">La de tasa más alta</option>${deudasOpts().map(([a,n])=>`<option value="${esc(a)}" ${a===c.destinoExtra?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="f">Recordarme cuadrar cuentas cada (días)<input id="sRec" inputmode="numeric" data-plain value="${c.recordatorioDias||7}"></label>
    <label class="f">Lo que el asesor debe saber de ti<textarea id="sCtx" rows="5" placeholder="Tu trabajo, tus planes, decisiones que tomaste">${esc(c.contexto||'')}</textarea></label>`,
    save:(root,c)=>{c.destinoExtra=$('#sDest',root).value;c.recordatorioDias=Math.max(1,num($('#sRec',root).value)||7);c.contexto=$('#sCtx',root).value;}}
};
function seccionCard(key,wiz){const s=SECCIONES[key];const c=cfg();return `<section class="card stack" data-sec="${key}"><h2>${esc(s.t)}</h2>${s.d?`<p class="muted small">${esc(s.d)}</p>`:''}${s.html(c,wiz)}${wiz?'':`<button class="btn" data-save="${key}">Guardar</button>`}</section>`;}
function guardarSeccion(key,root,wiz){if(!S.config)S.config=JSON.parse(JSON.stringify(DEFAULT_CONFIG));const c=S.config;SECCIONES[key].save(root,c,wiz);persist('config');}
function renderAjustes(){
  if(built.ajustes)return;built.ajustes=true;const v=$('#view-ajustes');
  v.innerHTML=`<h2>Ajustes</h2>${['perfil','ingresos','cuentas','fijos','deudas','categorias','atajos','fuentes','personas','cobros','metas','topes','general'].map(k=>seccionCard(k,false)).join('')}
   <section class="card stack"><h2>Probar desde cero</h2><p class="muted small">Abre la app vacía, como la vería una persona nueva, sin tocar tus datos. Ideal para probar el asistente o mostrársela a alguien. Al salir se borra la prueba.</p><button class="btn ghost" data-action="demo">Entrar al modo prueba</button></section>
   <section class="card stack"><h2>Volver a configurar</h2><p class="muted small">Repite el asistente para cambiar tu configuración. No borra nada: tus movimientos, cuentas y deudas se quedan.</p><button class="btn ghost" id="reset">Volver al asistente</button></section>
   <section class="card stack"><h2>Copia de tus datos</h2><p class="muted small">Descarga un archivo con toda tu información, por si quieres guardarla.</p><button class="btn ghost" data-action="respaldo">Descargar copia</button></section>
   <section class="card stack" style="border:1px solid var(--debt-soft)"><h2>Borrar todo y empezar de cero</h2><p class="muted small">¿Se te acumularon cosas sin registrar y prefieres arrancar limpio? Borra toda tu historia y la app queda como nueva, sin cerrar sesión.</p><button class="btn danger" data-action="borrarTodo">Borrar todos mis datos</button></section>`;
  bindEds(v);$$('[data-sec]',v).forEach(sec=>SECCIONES[sec.dataset.sec].mount?.(sec));
  $$('[data-save]',v).forEach(b=>b.onclick=()=>{const sec=b.closest('[data-sec]');guardarSeccion(b.dataset.save,sec,false);toast('Guardado');proj.pago=null;if(['ingresos','categorias','cuentas','deudas'].includes(b.dataset.save)){built.ajustes=false;render();}});
  $('#reset').onclick=e=>{const b=e.currentTarget;if(b.dataset.c){S.config.onboarded=false;persist('config');setupStep=0;built.setup=false;render();}else{b.dataset.c=1;b.textContent='Toca otra vez para confirmar';}};
}
const PASOS=['plantilla','perfil','cuentas','ingresos','fijos','deudas','fuentes','categorias','metas'];
const cg=(id,nombre,icono,color,padre='')=>({id,nombre,icono,color,padre});
const PRESETS=[
  {id:'empleado',e:'💼',n:'Tengo un sueldo',d:'Me pagan cada mes o cada quincena en una empresa.',apply:c=>{c.ingreso.tipo='sueldo';c.categorias={gasto:JSON.parse(JSON.stringify(DEF_CG)),ingreso:JSON.parse(JSON.stringify(DEF_CI))};c.atajos=JSON.parse(JSON.stringify(DEF_RAP));}},
  {id:'independiente',e:'🛵',n:'Trabajo por mi cuenta',d:'Moto, domicilios, ventas, oficios: gano por días y no tengo sueldo fijo.',apply:c=>{c.ingreso.tipo='diario';c.ingreso.frecuencia='mensual';c.ingreso.dias=[1];c.ingreso.diasSemana=6;
    if(!(c.fuentes||[]).length)c.fuentes=[{id:'trabajo',nombre:'Moto / domicilios',cuenta:(c.cuentas||[]).find(x=>x.tipo==='efectivo')?.id||'efectivo',deducciones:[{nombre:'Pase o comisión',monto:0},{nombre:'Gasolina',monto:0},{nombre:'Comida en la calle',monto:0}],reparto:{deudas:30,ahorro:20,libre:50}}];c.ingreso.fuentePrincipal=c.fuentes[0].id;
    c.categorias={gasto:[...JSON.parse(JSON.stringify(DEF_CG)),cg('trabajo','Gastos del trabajo','🛠️','#00A5CF'),cg('trabajo-rep','Repuestos y mantenimiento','🔧','#00A5CF','trabajo'),cg('trabajo-datos','Datos y recargas','📶','#00A5CF','trabajo')],ingreso:JSON.parse(JSON.stringify(DEF_CI))};
    c.atajos=[{id:'a0',nombre:'Gasolina',monto:20000,cat:'transporte'},{id:'a1',nombre:'Almuerzo',monto:15000,cat:'comida'},{id:'a2',nombre:'Tinto',monto:2000,cat:'hormiga'},{id:'a3',nombre:'Gaseosa',monto:3500,cat:'hormiga'},{id:'a4',nombre:'Recarga',monto:10000,cat:'trabajo-datos'}];}},
  {id:'estudiante',e:'🎒',n:'Estudio',d:'Vivo de una mesada, beca o trabajo de medio tiempo.',apply:c=>{c.ingreso.tipo='sueldo';if(!(c.ingreso.componentes||[]).some(x=>x.monto))c.ingreso.componentes=[{id:'c1',nombre:'Mesada o beca',monto:0,signo:1}];
    c.categorias={gasto:[...JSON.parse(JSON.stringify(DEF_CG)),cg('estudio','Estudio','📚','#4C6EF5'),cg('estudio-copias','Fotocopias e impresiones','🖨️','#4C6EF5','estudio'),cg('estudio-mat','Materiales','✏️','#4C6EF5','estudio')],ingreso:JSON.parse(JSON.stringify(DEF_CI))};
    c.atajos=[{id:'a0',nombre:'Pasaje',monto:3500,cat:'transporte'},{id:'a1',nombre:'Fotocopias',monto:2000,cat:'estudio-copias'},{id:'a2',nombre:'Almuerzo',monto:12000,cat:'comida'},{id:'a3',nombre:'Mecato',monto:3000,cat:'hormiga'}];}},
  {id:'libre',e:'✍️',n:'Prefiero armarlo yo',d:'Empiezo con lo básico y lo configuro a mi manera.',apply:()=>{}}
];
function renderSetup(){
  if(built.setup)return;built.setup=true;const v=$('#view-setup');const key=PASOS[setupStep];
  v.innerHTML=`<section class="card stack" style="background:var(--ink);color:var(--bg)"><h2>${setupStep===0?'Organicemos tu plata':'Configuración inicial'}</h2><p style="opacity:.8" class="small">${setupStep===0?'En unos minutos dejamos listo tu sueldo, tus cuentas, tus gastos fijos y tus deudas. Después solo registras el día a día.':`Paso ${setupStep+1} de ${PASOS.length}`}</p><div class="steps">${PASOS.map((_,i)=>`<i class="${i<=setupStep?'on':''}"></i>`).join('')}</div></section>
    ${seccionCard(key,true)}<div class="btns">${setupStep>0?'<button class="btn ghost" id="wBack">Atrás</button>':''}<button class="btn" id="wNext" style="flex:1">${setupStep===PASOS.length-1?'Terminar':'Guardar y seguir'}</button></div>
    ${setupStep>2?'<button class="x" id="wSkip">Saltar este paso</button>':''}`;
  bindEds(v);SECCIONES[key].mount?.($('[data-sec]',v));
  const next=save=>{if(save)guardarSeccion(key,$('[data-sec]',v),true);if(setupStep===PASOS.length-1){S.config.onboarded=true;if(!S.saldos){S.saldos={cuentas:{}};persist('saldos');}if(!S.deudas){S.deudas={items:[]};persist('deudas');}persist('config');tab='hoy';built.setup=false;render();toast('¡Listo! Ya puedes registrar tu día a día');return;}setupStep++;built.setup=false;window.scrollTo({top:0});render();};
  $('#wNext').onclick=()=>next(true);const s=$('#wSkip');if(s)s.onclick=()=>next(false);const b=$('#wBack');if(b)b.onclick=()=>{setupStep--;built.setup=false;render();};
}

/* ================= acciones globales ================= */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab]');if(t){go(t.dataset.tab);return;}
  const g=e.target.closest('[data-go]');if(g){viewKey=curKey();go(g.dataset.go);return;}
  const a=e.target.closest('[data-action]');if(!a)return;const{action,id,k}=a.dataset;
  if(action==='nuevo')sheetNuevo('gasto');
  else if(action==='pagar')sheetNuevo('pago',{sel:`o:${k}:${id}`});
  else if(action==='recibir')sheetRecibir(k,id);
  else if(action==='abonar')sheetNuevo('pago',{sel:'a:'+id});
  else if(action==='apartar')sheetNuevo('pago',{sel:'m:'+id});
  else if(action==='liberar')sheetLiberar(id);
  else if(action==='saldo')sheetSaldo(id);
  else if(action==='cuadrar')sheetCuadre();
  else if(action==='mover')sheetNuevo('mover');
  else if(action==='sueldo')sheetNuevo('ingreso');
  else if(action==='midia')sheetNuevo('extra');
  else if(action==='progEditar')sheetProg(id);
  else if(action==='tarjeta')sheetTarjeta(id);
  else if(action==='nuevaDeuda')sheetDeuda(null);
  else if(action==='borrarTodo')sheetBorrarTodo();
  else if(action==='respaldo')descargarRespaldo(a);
  else if(action==='editarDeuda')sheetDeuda(id);
  else if(action==='demo')entrarDemo();
  else if(action==='salirDemo')salirDemo();
  else if(action==='progApartar')sheetProgApartar(id);
  else if(action==='progPagar')sheetProgPagar(id);
  else if(action==='dia'){$$('.cal button').forEach(b=>b.classList.toggle('sel',b===a));$('#calInfo').innerHTML=infoDia(k,a.dataset.d);}
  else if(action==='ciclo'){viewKey=addCycle(viewKey,Number(a.dataset.d));render();}
  else if(action==='borrar'){if(a.dataset.c==='1'){borrarMov(k,id);toast('Movimiento borrado');render();}else{a.dataset.c='1';a.textContent='¿Borrar?';a.style.color='var(--debt)';setTimeout(()=>{if(a.isConnected){a.dataset.c='';a.textContent='✕';a.style.color='';}},3000);}}
});
initStore();initAI();initDl();
})();
