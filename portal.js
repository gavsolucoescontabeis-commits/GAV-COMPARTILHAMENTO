import {createClient} from "https://esm.sh/@supabase/supabase-js@2.76.1";
const ROOT="https://kiunegfjbfhvvlkxqvos.supabase.co";
const PUB="sb_publishable_QpDD6nZEdRPtvOeJCSOZ9A_FMaA2Za7";
const sb=createClient(ROOT,PUB,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
const logo="assets/logo-gav-sem-fundo.svg",lion="assets/leao-gav-sem-fundo.svg";
const app=document.getElementById("app");
const portalLayoutStyle=document.createElement("style");
portalLayoutStyle.textContent="@media(min-width:721px){.shell.gav-portal-shell{display:block;padding-left:248px}.shell.gav-portal-shell>.side{position:fixed;inset:0 auto 0 0;width:248px;height:100dvh;max-height:100dvh;overflow-y:auto;overscroll-behavior:contain;z-index:65;box-sizing:border-box}.shell.gav-portal-shell>.app-main{width:100%;min-width:0}}@media(max-width:720px){.shell.gav-portal-shell{display:block;padding-left:0}.shell.gav-portal-shell>.side{display:none}}.gav-client-preview-banner{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:#fcf8ee;color:#5b4622;border:1px solid #dfc991;border-radius:10px;padding:13px 15px;margin:0 0 20px}.gav-client-preview-banner p{font-size:12px;margin:4px 0}.gav-client-preview-banner .btn{min-height:42px}";
portalLayoutStyle.textContent += ".gav-company-toolbar{display:flex;align-items:end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:16px 0}.gav-company-toolbar>.form-field{min-width:220px}.gav-company-form-grid{display:grid;grid-template-columns:140px minmax(180px,1fr);gap:12px}.gav-company-form-grid .gav-company-name{grid-column:1/-1}.gav-company-actions{display:flex;gap:8px;flex-wrap:wrap}.gav-company-warning{color:#955616;font-size:12px;padding:10px 0}@media(max-width:650px){.gav-company-form-grid{grid-template-columns:1fr}.gav-company-form-grid .gav-company-name{grid-column:auto}.gav-company-toolbar>.form-field{width:100%}}";
portalLayoutStyle.textContent += ".gav-process-head{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px 0}.gav-process-filters{display:flex;gap:9px;align-items:end;flex-wrap:wrap}.gav-process-filters label{display:grid;gap:5px;font-size:12px;color:#69717b;font-weight:700}.gav-process-filters select{min-width:118px}.gav-process-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.gav-process-card{padding:17px}.gav-process-card strong{display:block;font-size:25px}.gav-process-table{overflow-x:auto}.gav-process-row{display:grid;grid-template-columns:minmax(190px,2.3fr) repeat(5,minmax(110px,1fr)) minmax(110px,1.2fr) minmax(70px,.7fr);gap:12px;align-items:center;padding:13px 16px;border-bottom:1px solid #edf0f3;font-size:12px}.gav-process-row.gav-process-header{background:#f7f7f6;color:#666;font-size:11px;font-weight:800}.gav-process-row>div:first-child{min-width:0}.gav-process-row small{display:block;color:#7b838a;line-height:1.4;margin-top:4px}.gav-process-good{color:#137650;font-weight:800}.gav-process-pending{color:#a06921;font-weight:800}.gav-process-status{display:inline-flex;align-items:center;justify-content:center;gap:5px;font-weight:800;font-size:12px;line-height:1.25;padding:8px 10px;border:1px solid transparent;border-radius:8px;white-space:nowrap}.gav-process-status.is-complete{background:#e6f5eb;border-color:#95d5ac;color:#11653c;box-shadow:0 1px 2px rgba(17,101,60,.09)}.gav-process-status.is-pending{background:#fbf5e9;border-color:#ead5ab;color:#895b19}.gav-process-note{font-size:12px;color:#69717b;line-height:1.6;margin-top:16px}@media(max-width:860px){.gav-process-row{grid-template-columns:minmax(170px,2fr) repeat(5,minmax(100px,1fr)) minmax(100px,1fr) minmax(70px,.7fr);width:1020px}.gav-process-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:520px){.gav-process-cards{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.gav-process-card{padding:11px}.gav-process-card strong{font-size:20px}}";
document.head.appendChild(portalLayoutStyle);
const M=["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO","DÉCIMO TERCEIRO"];
const C=[["ADMISSOES","Admissões"],["RESCISOES","Rescisões"],["FERIAS","Férias"],["FOLHA","Folha de Pagamento"],["GUIAS_IMPOSTOS","Guias e Impostos"],["OUTROS","Outros Documentos"]];
let role="",companies=[],docs=[],links=[],candidates=[],selected="",view="offices",cat="",year=2026,month="ALL",session=null,googleToken="",hasDriveSecret=false,notice="",busy=false;
let previewAsClient=false,clientDocs=[],pilotTestCredential=null;
let passwordChangeRequired=false,clientManaged=false,accessPanelOpen=false,accessPanelCompany="",accessStatus=null,clientCredential=null,clientInvite=null;
const invitationHash=location.hash.match(/^#convite=([a-f0-9]{64})$/i);
let activationToken=invitationHash?.[1]?.toLowerCase()||"",activationCompany=null;
try{
 if(activationToken)sessionStorage.setItem("gav-activation-token",activationToken);
 else{
  const saved=sessionStorage.getItem("gav-activation-token")||"";
  activationToken=/^[a-f0-9]{64}$/.test(saved)?saved:"";
 }
}catch(_e){}
if(invitationHash)history.replaceState(null,"",location.pathname+location.search);
let syncRuns=[],mappingReport=null,offices=[],officeId="";
let folderLookup={officeId:"",loaded:false,items:[],error:""};
let companyFolders={officeId:"",loaded:false,rootAvailable:false,items:[],notice:"",error:""};
let companyEditorOpen=false,companyEditId="",companyDraft={cnpj:"",legalName:"",code:"",folderId:""};
const initialCompetence=new Date();initialCompetence.setDate(1);initialCompetence.setMonth(initialCompetence.getMonth()-1);
let processingYear=initialCompetence.getFullYear(),processingMonth=initialCompetence.getMonth()+1;
let processingData={officeId:"",year:0,month:0,loaded:false,companies:[],total:0,concluded:0,pending:0};
try{officeId=sessionStorage.getItem("gav-selected-office")||""}catch(_e){}
const adminView=()=>role==="admin"&&!previewAsClient;
const displayDocs=()=>previewAsClient?clientDocs:docs;
let previewId="",previewLoading=false,downloadBusy="";
const navigationHistory=[];
const pdfCache=new Map();
const pdfInFlight=new Map();
let pdfGeneration=0;
let autoSyncRunning=false,autoSyncLastAttempt=0,autoSyncLastResult="";
const esc=v=>String(v??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));
const cn=v=>String(v||"").replace(/\D/g,"");
const showError=e=>{notice=e?.message||String(e);busy=false;render()};
const current=()=>companies.find(c=>c.id===selected);
const currentOffice=()=>offices.find(o=>o.id===officeId);
const officeCompanies=()=>role==="admin"?companies.filter(c=>c.office_id===officeId):companies;
const officeName=o=>o?.code==="REL GAV"?"GAV":o?.display_name||"Selecione o escritório";
const officeLabel=()=>officeName(currentOffice());
const officeSort={TTM:0,"DS CONTÁBIL":1,"REL GAV":2,AVULSOS:3};
const supportsOfficeCatalog=()=>["DS CONTÁBIL","REL GAV"].includes(currentOffice()?.code||"");
async function loadCompanyFolders(){
 const requested=officeId;
 companyFolders={officeId:requested,loaded:false,rootAvailable:false,items:[],notice:"",error:""};
 try{
  const result=await invoke("gav-company-admin","folders",{officeId:requested});
  if(requested===officeId)companyFolders={officeId:requested,loaded:true,rootAvailable:!!result.rootAvailable,
   items:result.folders||[],notice:result.notice||"",error:""};
 }catch(e){
  if(requested===officeId)companyFolders={officeId:requested,loaded:true,rootAvailable:false,
   items:[],notice:"",error:e?.message||"Não foi possível consultar as pastas."};
 }
}
async function loadOfficeFolders(){
 const requested=officeId;
 if(!supportsOfficeCatalog()){folderLookup={officeId:requested,loaded:true,items:[],error:""};return}
 try{
  const result=await invoke("gav-office-catalog","list",{officeId:requested});
  if(requested===officeId)folderLookup={officeId:requested,loaded:true,items:result.folders||[],error:""};
 }catch(e){if(requested===officeId)folderLookup={officeId:requested,loaded:true,items:[],error:e?.message||"Falha ao consultar as pastas."}}
}
const fmt=v=>v&&v.length===14?v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):v;
async function invoke(fn,action,body={}){
 const currentSession=await sb.auth.getSession();session=currentSession.data.session;const token=session?.access_token;if(!token)throw Error("Faça login novamente.");
 const r=await fetch(ROOT+"/functions/v1/"+fn,{method:"POST",headers:{"Content-Type":"application/json",apikey:PUB,Authorization:"Bearer "+token},body:JSON.stringify({action,...body})});
 const ct=r.headers.get("Content-Type")||"";
 if(fn==="gav-drive-pdf"&&r.ok)return await r.blob();
 const j=ct.includes("json")?await r.json():{error:"Serviço indisponível."};
 if(!r.ok)throw Error(j.error||"Falha no servidor.");return j;
}
const api=(action,body={})=>invoke("gav-portal-api",action,body);
async function publicActivation(action,body={}){
 const r=await fetch(ROOT+"/functions/v1/gav-client-activate",{
  method:"POST",headers:{"Content-Type":"application/json",apikey:PUB},
  body:JSON.stringify({action,...body})});
 const j=await r.json().catch(()=>({error:"Serviço indisponível."}));
 if(!r.ok)throw Error(j.error||"Não foi possível ativar o acesso.");
 return j;
}
const run=async task=>{busy=true;notice="";render();try{await task()}catch(e){notice=e.message||"Não foi possível concluir."}busy=false;render()};
async function loadDocs(){
 const company=selected;
 docs=[];
 if(!company)return;
 const all=[];
 for(let page=0;page<=40;page++){
  const result=await api("documents",{companyId:company,page});
  if(company!==selected)throw Error("A empresa mudou durante o carregamento.");
  all.push(...(result.documents||[]));
  if(!result.hasMore){docs=all;return}
 }
 throw Error("A empresa possui mais documentos do que o limite atual de listagem.");
}
async function loadClientPreview(){
 const company=selected,all=[];
 for(let page=0;page<=40;page++){
  const result=await api("clientPreview",{companyId:company,page});
  if(company!==selected)throw Error("A empresa mudou durante a conferência.");
  all.push(...(result.documents||[]));
  if(!result.hasMore)return all;
 }
 throw Error("A visualização do cliente ultrapassou o limite atual.");
}
async function syncPilot({interactive=false}={}){
 if(role!=="admin"||autoSyncRunning)return;
 const pilot=companies.find(c=>c.cnpj==="60955798000157");
 if(!pilot||!links.some(l=>l.company_id===pilot.id&&l.auto_publish_new))return;
 const now=Date.now();
 if(!interactive&&now-autoSyncLastAttempt<15*60*1000)return;
 autoSyncLastAttempt=now;
 autoSyncRunning=true;
 try{
  const result=await invoke("gav-drive-index","index",{companyId:pilot.id});
  autoSyncLastResult="Última verificação: "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})+" · "+result.newFiles+" novos";
  if(selected===pilot.id){await loadDocs();render()}
  if(result.newFiles&&interactive)toastMessage(result.newFiles+" novo(s) arquivo(s); "+result.autoPublished+" liberado(s) automaticamente.");
 }catch(e){
  autoSyncLastResult="Sincronização pendente: "+(e.message||"verifique a autorização do Drive");
  if(interactive)toastMessage(autoSyncLastResult);
 }finally{autoSyncRunning=false}
}

async function bootstrap(){
 const s=await sb.auth.getSession();session=s.data.session;
 if(!session){role="";render();return}
 if(session.provider_token)googleToken=session.provider_token;
 try{
  const me=await api("me");role=me.role;passwordChangeRequired=!!me.passwordChangeRequired;clientManaged=!!me.clientManaged;companies=me.companies||[];offices=role==="admin"?(me.offices||[]).sort((a,b)=>(officeSort[a.code]??99)-(officeSort[b.code]??99)):[];links=me.linked||[];candidates=me.candidate||[];syncRuns=me.sync||[];hasDriveSecret=me.driveSecretsConfigured;
  if(role==="admin"){
   if(!offices.some(o=>o.id===officeId)){
    officeId=offices.find(o=>o.code==="TTM")?.id||offices[0]?.id||"";
   }
   if(!companies.some(c=>c.id===selected&&c.office_id===officeId)){
    selected=officeCompanies()[0]?.id||"";
   }
  }else{
   officeId="";
   if(!selected||!companies.some(c=>c.id===selected))selected=companies[0]?.id||"";
  }
  if(role==="admin"&&session.provider_refresh_token){
   try{await api("connectDrive",{refreshToken:session.provider_refresh_token})}catch(e){notice="Autenticação concluída, mas não foi possível guardar o acesso offline do Drive: "+e.message}
  }
  if(passwordChangeRequired){docs=[];view="home"}else await loadDocs();
  render();
  if(role==="admin")void syncPilot();
 }catch(e){role="";notice=e.message||"Erro de autenticação.";render()}
}
const brand=()=>`<div class="logo-official"><img src="${logo}" alt="GAV Soluções Contábeis" onerror="this.style.display='none'"><span class="logo-text">GAV <small>SOLUÇÕES CONTÁBEIS</small></span></div>`;
function invitationLogin(){
 const message=notice?'<div class="error" style="display:block;margin-bottom:15px">'+esc(notice)+'</div>':"";
 const form=activationCompany?
   '<h2>Crie sua senha</h2><p class="subtle">Empresa identificada: <strong>'+esc(activationCompany.legalName)+'</strong></p><p class="subtle">CNPJ: '+esc(fmt(activationCompany.cnpj))+'</p>'+
   '<form id="clientActivationPassword"><div class="form-field"><label for="activatePassword">Nova senha</label><input id="activatePassword" class="input" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></div>'+
   '<div class="form-field"><label for="activatePasswordRepeat">Confirme a senha</label><input id="activatePasswordRepeat" class="input" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></div>'+
   '<p class="subtle">Use pelo menos 12 caracteres, com letras e números.</p><button class="btn btn-dark login-action" type="submit" '+(busy?"disabled":"")+'>Criar minha senha e entrar</button></form>':
   '<h2>Primeiro acesso</h2><p class="subtle">Informe o CNPJ da empresa para identificar seu cadastro e criar sua senha.</p>'+
   '<form id="clientActivationIdentify"><div class="form-field"><label for="activateCnpj">CNPJ da empresa</label><input id="activateCnpj" class="input" placeholder="00.000.000/0000-00" inputmode="numeric" autocomplete="username" required></div>'+
   '<button class="btn btn-dark login-action" type="submit" '+(busy?"disabled":"")+'>Identificar empresa</button></form>';
 return '<div class="login-wrap"><section class="login-brand"><div>'+brand()+'</div><div><div class="gold-line"></div><div class="gav-lion-login"><img src="'+lion+'" alt="Símbolo GAV"></div><h1>Seus documentos.<br>Em um só lugar.</h1><p>Acesso individual e protegido para sua empresa.</p></div><span class="login-foot">Compromisso, organização e responsabilidade.</span></section>'+
 '<section class="login-panel"><div class="eyebrow">GAV COMPARTILHAR DOCS · ATIVAÇÃO DE CLIENTE</div>'+message+form+
 '<p class="subtle" style="font-size:12px;margin-top:25px">Este convite é individual e válido uma única vez. Não encaminhe a outras pessoas.</p><button class="btn btn-line btn-small" data-do="activation-cancel" type="button">Voltar ao login</button></section></div>';
}
function login(){
 if(activationToken)return invitationLogin();
 return `<div class="login-wrap"><section class="login-brand"><div>${brand()}</div><div><div class="gold-line"></div><div class="gav-lion-login"><img src="${lion}" alt="Símbolo GAV"></div><h1>Seus documentos.<br>Em um só lugar.</h1><p>Documentos originais organizados por empresa, competência e categoria, com acesso individual e protegido.</p></div><span class="login-foot">Compromisso, organização e responsabilidade.</span></section><section class="login-panel"><div class="eyebrow">GAV COMPARTILHAR DOCS · PORTAL SEGURO</div><h2>Bem-vindo!</h2>${notice?`<div class="error" style="display:block;margin-bottom:15px">${esc(notice)}</div>`:""}<p class="subtle">Entre com o CNPJ e a senha que você cadastrou.</p><form id="clientLogin"><div class="form-field"><label for="cnpj">CNPJ da empresa</label><input id="cnpj" class="input" placeholder="00.000.000/0000-00" autocomplete="username" required></div><div class="form-field"><label for="pwd">Senha</label><input id="pwd" class="input" type="password" autocomplete="current-password" required></div><button class="btn btn-dark login-action" type="submit">Acessar documentos</button></form><div style="margin-top:24px;border-top:1px solid #e3e3e3;padding-top:20px"><div class="subtle" style="font-size:12px;margin-bottom:10px">Acesso da administração GAV</div><button class="btn btn-line" data-do="google" ${busy?"disabled":""}>Entrar com Google · Administrador</button></div><p class="subtle" style="font-size:11px;margin-top:22px">Sua empresa precisa estar autorizada. No primeiro acesso, use o convite individual enviado pela GAV no WhatsApp. <button class="btn btn-line btn-small" data-do="activation-help" type="button">Primeiro acesso: criar minha senha</button> Para recuperar a senha, solicite à GAV.</p></section></div>`;
}
const nav=()=>adminView()?[["offices","Escritórios"],["home","Início"],["processing","Processamento"],["drive","Google Drive"],["companies","Empresas"]]:clientManaged?[["home","Início"],["security","Minha senha"]]:[["home","Início"]];
function shell(){
 const firm=current(),navLinks=nav();
 return `<div class="shell gav-portal-shell"><aside class="side"><div class="side-top"><div class="side-logo">${brand()}</div></div><div class="side-caption">NAVEGAÇÃO</div>${navLinks.map(([id,name])=>`<button class="nav ${view===id?"active":""}" data-do="view" data-val="${id}">${esc(name)}</button>`).join("")}<div class="gav-lion-sidebar" aria-label="Símbolo da GAV Soluções Contábeis"><img src="${lion}" alt="Leão GAV"></div><div class="side-bottom"><div style="font-weight:800;margin-bottom:9px">${adminView()?"Administrador GAV":"Portal do cliente"}</div><div class="subtle" style="margin-bottom:14px">Conexão segura · v0.13.1</div><button class="nav" data-do="${previewAsClient?"exit-preview":"logout"}">${previewAsClient?"Voltar à GAV":"Sair da conta"}</button></div></aside><main class="app-main"><header class="topbar"><div><span class="mobile-brand">GAV <small>SOLUÇÕES CONTÁBEIS</small></span><div class="header-title">${adminView()?"Painel administrativo":"Portal de documentos"}</div><div class="header-desc">${esc(adminView()?(officeLabel()+(firm?" · "+firm.legal_name:"")):(firm?.legal_name||"GAV Soluções Contábeis"))}</div></div><div class="top-actions"><div class="avatar">${adminView()?"AD":"CL"}</div><button class="btn btn-line btn-small" data-do="${previewAsClient?"exit-preview":"logout"}">${previewAsClient?"Voltar à GAV":"Sair"}</button></div></header><div class="content">${previewAsClient?`<div class="gav-client-preview-banner"><div><strong>Prévia do cliente — ${esc(firm?.legal_name||"empresa")}</strong><p>Mostra somente arquivos liberados. Não é login real e não concede acesso a ninguém.</p></div><button class="btn btn-dark btn-small" data-do="exit-preview">Voltar à administração</button></div>`:""}${notice?`<div class="error" style="display:block;margin-bottom:18px">${esc(notice)}</div>`:""}${busy?`<div class="card card-pad" style="margin-bottom:18px">Processando sua solicitação…</div>`:""}${content()}</div></main><nav class="bottom-bar" aria-label="Navegação">${navLinks.map(([id,name])=>`<button class="bottom-nav ${view===id?"active":""}" data-do="view" data-val="${id}">${esc(name)}</button>`).join("")}</nav></div>`;
}
const title=(name,sub)=>`<div class="page-head"><div><div class="eyebrow">CENTRAL DE DOCUMENTOS</div><h1>${esc(name)}</h1><p>${esc(sub)}</p></div></div>`;
const officePicker=()=>adminView()?`<div class="form-field"><label for="officeSelect">Escritório</label><select id="officeSelect" class="input">${offices.map(o=>`<option value="${esc(o.id)}" ${o.id===officeId?"selected":""}>${esc(officeName(o))}</option>`).join("")}</select></div>`:"";
const picker=()=>adminView()?`<div class="gav-scope-picker">${officePicker()}<div class="form-field"><label for="companySelect">Empresa do escritório</label><select id="companySelect" class="input" ${officeCompanies().length?"":"disabled"}>${officeCompanies().length?officeCompanies().map(c=>`<option value="${esc(c.id)}" ${c.id===selected?"selected":""}>${esc((c.code||"")+" · "+c.legal_name)}</option>`).join(""):`<option>Nenhuma empresa cadastrada</option>`}</select></div></div>`:"";
const filtered=()=>displayDocs().filter(d=>(year==="ALL"||d.year===Number(year))&&(month==="ALL"||d.month===Number(month))&&(view!=="category"||d.category===cat));

const checkedDocs=new Set();
let listPage=0;
const PAGE_SIZE=60;
let bulkDownloading=false,bulkProgress="";
function visibleSelectionDocs(){
 if(view==="category"||view==="recent")return filtered().slice().sort(documentSort).slice(listPage*PAGE_SIZE,(listPage+1)*PAGE_SIZE);
 if(view==="home")return displayDocs().slice().sort(documentSort).slice(0,5);
 return [];
}
function resetSelection(){checkedDocs.clear();bulkProgress="";}
function selectionBar(items){
 const count=items.filter(d=>checkedDocs.has(d.id)).length;
 const all=items.length>0&&count===items.length;
 return '<div class="gav-bulk-toolbar" role="group" aria-label="Download de varios documentos">'
  +'<label class="gav-select-all-label"><input type="checkbox" data-check-all '+(all?'checked ':'')+(!items.length||bulkDownloading?'disabled ':'')+'> Marcar todos ('+items.length+')</label>'
  +'<span class="gav-select-count" id="gavSelectionCount">'+count+' selecionado(s) · até 60 por ZIP</span>'
  +'<button class="btn btn-dark btn-small" data-do="bulk-download" id="gavDownloadSelected" '+(!count||bulkDownloading?'disabled':'')+'>'+(bulkDownloading?esc(bulkProgress||"Preparando ZIP..."):"Baixar selecionados")+'</button>'
  +'</div>';
}
function refreshSelectionToolbar(){
 const eligible=visibleSelectionDocs();
 const count=eligible.filter(d=>checkedDocs.has(d.id)).length;
 const all=document.querySelector("[data-check-all]");
 if(all){all.checked=eligible.length>0&&count===eligible.length;all.indeterminate=count>0&&count<eligible.length;}
 const label=document.getElementById("gavSelectionCount");if(label)label.textContent=count+" selecionado(s) · até 60 por ZIP";
 const btn=document.getElementById("gavDownloadSelected");
 if(btn){btn.disabled=!count||bulkDownloading;btn.textContent=bulkDownloading?(bulkProgress||"Preparando ZIP..."):"Baixar selecionados";}
}
function sanitizeZipName(name){
 return (String(name||"documento").replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").replace(/^\.+/,"_").trim().slice(0,160)||"documento");
}


async function downloadSelectedZip(){
 if(bulkDownloading)return;
 const items=visibleSelectionDocs().filter(d=>checkedDocs.has(d.id));
 if(!items.length){toastMessage("Marque os documentos que deseja baixar.");return}
 if(items.length>60){toastMessage("Selecione até 60 arquivos por ZIP. Use o filtro de mês para dividir os documentos.");return}
 const company=selected,generation=pdfGeneration;
 bulkDownloading=true;bulkProgress="Preparando arquivos...";refreshSelectionToolbar();
 try{
  const entries={};const names=new Set();let totalSize=0,done=0;
  for(let i=0;i<items.length;i+=3){
   await Promise.all(items.slice(i,i+3).map(async d=>{
    const file=await fetchPdf(d.id,"download");
    if(company!==selected||generation!==pdfGeneration||!role)throw Error("A sessão mudou. Faça a seleção novamente.");
    totalSize+=file.blob.size;
    if(totalSize>180*1024*1024)throw Error("O lote ultrapassa 180 MB. Selecione menos documentos.");
    // ZIP sem pastas internas: o usuário já selecionou categoria e mês no portal.
    const name=sanitizeZipName(d.file_name);
    const dot=name.lastIndexOf(".");
    const stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):"";
    let zipPath=name,serial=2;
    while(names.has(zipPath.toLocaleLowerCase("pt-BR"))){
     zipPath=stem+" ("+serial+")"+ext;
     serial++;
    }
    names.add(zipPath.toLocaleLowerCase("pt-BR"));
    entries[zipPath]=new Uint8Array(await file.blob.arrayBuffer());
    done++;bulkProgress="Baixando: "+done+"/"+items.length;refreshSelectionToolbar();
   }));
  }
  bulkProgress="Montando ZIP...";refreshSelectionToolbar();
  const {zip}=await import("https://esm.sh/fflate@0.8.3");
  const result=await new Promise((resolve,reject)=>{
   zip(entries,{level:0},(error,data)=>error?reject(error):resolve(data));
  });
  if(company!==selected||generation!==pdfGeneration||!role)throw Error("A sessão mudou. Refaça a seleção.");
  const blob=new Blob([result],{type:"application/zip"});
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;
  anchor.download="GAV_"+sanitizeZipName((current()?.legal_name||"EMPRESA").replace(/\s+/g,"_"))+"_"+new Date().toISOString().slice(0,10)+".zip";
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  resetSelection();
  toastMessage("Download do ZIP solicitado: "+items.length+" arquivos.");
 }catch(e){toastMessage("Não foi possível baixar o ZIP: "+(e.message||String(e)))}
 finally{bulkDownloading=false;bulkProgress="";refreshSelectionToolbar()}
}

function periodLabel(d){
 if(d.year&&d.month&&M[d.month-1])return M[d.month-1]+"/"+d.year;
 if(d.year)return "DOCUMENTOS DE "+d.year+" · SEM MÊS DEFINIDO";
 return "SEM COMPETÊNCIA DEFINIDA";
}
function documentSort(a,b){
 return (Number(b.year)||0)-(Number(a.year)||0)
  ||(Number(b.month)||0)-(Number(a.month)||0)
  ||String(a.file_name||"").localeCompare(String(b.file_name||""),"pt-BR");
}
function fileGroups(items){
 if(!items.length)return '<div class="empty">Nenhum documento disponível nesta seleção.</div>';
 const groups=new Map();
 items.slice().sort(documentSort).forEach(d=>{
  const label=periodLabel(d);
  if(!groups.has(label))groups.set(label,[]);
  groups.get(label).push(d);
 });
 return [...groups.entries()].map(([label,list])=>{
  const first=list[0],isAdminMonth=adminView()&&view==="category"&&first?.month&&first?.year;
  const allPublished=list.every(d=>!!d.published_at),target=isAdminMonth?first.category+"|"+first.year+"|"+first.month:"";
  const action=isAdminMonth?(allPublished?"revoke-month":"publish-month"):"";
  const caption=allPublished?"Revogar":"Publicar";
  return `<section class="gav-month-group"><div class="gav-month-head"><strong>${esc(label)}</strong><div class="gav-month-head-right"><span>${list.length} ${list.length===1?"arquivo":"arquivos"}</span>${isAdminMonth?`<button class="btn ${allPublished?"btn-line":"btn-dark"} btn-small gav-month-main-action" data-do="${action}" data-val="${esc(target)}">${caption} pasta inteira</button>`:""}</div></div>${files(list)}</section>`;
 }).join("");
}
function files(items){
 if(!items.length)return '<div class="empty">Nenhum documento disponível nesta seleção.</div>';
 return `<div class="gav-document-list">${items.map(d=>{
  const date=d.month&&d.year?M[d.month-1]+"/"+d.year:d.year?String(d.year):"SEM COMPETÊNCIA";
  const status=adminView()?(d.published_at?" · PUBLICADO":" · A CONFERIR"):"";
  const isImage=String(d.mime_type||"").startsWith("image/"),kind=isImage?"IMG":"PDF",typeLabel=isImage?"imagem":"PDF";
  return `<div class="gav-doc-row"><label class="gav-doc-checkbox" title="Selecionar para baixar"><input type="checkbox" data-check-id="${esc(d.id)}" aria-label="Selecionar ${esc(d.file_name)}" ${checkedDocs.has(d.id)?"checked":""} ${bulkDownloading?"disabled":""}></label><span class="gav-doc-file" aria-hidden="true">${kind}</span><div class="gav-doc-main"><strong class="gav-doc-name">${esc(d.file_name)}</strong><span class="gav-doc-detail">${esc(date)}${status}</span></div><div class="gav-doc-actions"><button class="btn btn-line btn-small gav-btn-preview" data-do="pdf" data-val="${esc(d.id)}" aria-label="Visualizar ${esc(d.file_name)}">Visualizar</button><button class="btn btn-dark btn-small gav-btn-download" data-do="download" data-val="${esc(d.id)}" aria-label="Baixar ${esc(d.file_name)}">Baixar</button>${adminView()?`<button class="btn btn-line btn-small" data-do="publish" data-val="${esc(d.id)}">${d.published_at?"Revogar":"Publicar"}</button>`:""}</div></div>`;
 }).join("")}</div>`;
}
function clientPasswordHtml(){
 return title(passwordChangeRequired?"Primeiro acesso — defina sua senha":"Minha senha",passwordChangeRequired?"Antes de acessar os documentos, cadastre sua senha definitiva.":"Altere sua senha quando precisar.")
 +'<div class="card card-pad" style="max-width:530px"><p class="subtle">A senha deve ter ao menos 12 caracteres, incluindo letras e números.</p><form id="clientPasswordForm"><div class="form-field"><label for="newClientPass">Nova senha</label><input id="newClientPass" class="input" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></div><div class="form-field"><label for="repeatClientPass">Confirme a senha</label><input id="repeatClientPass" class="input" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></div><button class="btn btn-dark login-action" type="submit">Salvar minha senha</button></form></div>';
}
function clientAccessHtml(){
 if(!adminView()||!accessPanelOpen||accessPanelCompany!==selected)return "";
 const info=accessStatus;
 let out='<div class="card card-pad" style="margin:15px 0"><h3 class="block-title">Login do cliente</h3><p class="subtle">Para o primeiro acesso, envie um convite individual ao WhatsApp do responsável. O cliente informa o CNPJ e cria a própria senha.</p>';
 if(!info)return out+'<p class="subtle">Conferindo situação da conta...</p></div>';
 const status=!info.exists?"Ainda não criado":!info.active?"Suspenso":info.needsPasswordChange?"Aguardando troca da senha":"Ativo";
 out+='<div class="notice">CNPJ: <strong>'+esc(fmt(info.cnpj))+'</strong> · Situação: <strong>'+esc(status)+'</strong></div><div class="admin-actions" style="margin-top:14px">';
 if(!info.exists||info.needsPasswordChange)out+='<button class="btn btn-dark" data-do="issue-client-invite">Gerar convite para criar senha</button>';
 out+='<button class="btn btn-line" data-do="issue-client-access">'+(info.exists?"Renovar senha provisória":"Senha provisória (alternativa)")+'</button>';
 if(info.active)out+='<button class="btn btn-line" data-do="disable-client-access">Suspender acesso</button>';
 out+='<button class="btn btn-line" data-do="close-client-access">Fechar</button></div>';
 if(clientInvite?.companyId===selected){
  out+='<div class="notice" style="margin-top:14px"><strong>Convite pronto para enviar por WhatsApp</strong><p>CNPJ: <strong>'+esc(fmt(clientInvite.cnpj))+'</strong></p><p><code style="user-select:all;overflow-wrap:anywhere">'+esc(clientInvite.inviteUrl)+'</code></p><p class="subtle">Link individual de uso único, válido por 7 dias. Compartilhe somente com o responsável pela empresa.</p><button class="btn btn-dark btn-small" data-do="copy-client-invite">Copiar mensagem e convite</button></div>';
 }
 if(clientCredential?.companyId===selected){
  out+='<div class="notice" style="margin-top:14px"><strong>Dados para entregar ao cliente — exibição temporária</strong><p><b>CNPJ:</b> '+esc(fmt(clientCredential.cnpj))+'</p><p><b>Senha provisória:</b> <code style="user-select:all;font-weight:800;overflow-wrap:anywhere">'+esc(clientCredential.password)+'</code></p><p class="subtle">Copie agora. Não há envio automático. A senha provisória deverá ser trocada no primeiro acesso.</p><button class="btn btn-dark btn-small" data-do="copy-client-access">Copiar mensagem para envio privado</button></div>';
 }
 return out+"</div>";
}
function home(){
 const firm=current(),items=displayDocs();
 if(adminView()&&!firm)return `${title("Início — "+officeLabel(),"Empresas e pastas do escritório selecionado.")}${picker()}<div class="card card-pad" style="margin-top:20px"><div class="empty">Nenhuma empresa com CNPJ cadastrado. Confira as pastas encontradas para vincular somente empresas autorizadas.</div></div>${folderCatalogHtml()}`;
 return `${title("Meus documentos",adminView()?"Conferência dos arquivos da empresa selecionada":"Documentos liberados pela GAV para sua empresa.")}${picker()}${adminView()?`<div style="margin:12px 0 20px"><button class="btn btn-dark" data-do="client-preview">Ver como o cliente</button>${items.some(d=>d.review_status==="PENDENTE")&&links.some(l=>l.company_id===firm?.id&&l.last_synced_at)?` <button class="btn btn-line" data-do="release-history">Liberar histórico após conferência</button>`:""}${links.some(l=>l.company_id===firm?.id&&l.is_active)?` <button class="btn btn-dark" data-do="client-access">Gerenciar login do cliente</button> <button class="btn btn-line" data-do="create-company-test">Gerar login de teste</button> <button class="btn btn-line" data-do="remove-company-test">Desativar login de teste</button>`:""}${pilotTestCredential&&pilotTestCredential.cnpj===firm?.cnpj?`<div class="card card-pad" style="margin-top:14px"><strong>Acesso de teste criado (não encaminhe ao cliente)</strong><p>CNPJ de acesso: <strong>${esc(pilotTestCredential.cnpj)}</strong></p><p>Senha de teste: <code style="user-select:all;overflow-wrap:anywhere">${esc(pilotTestCredential.password)}</code></p><p class="subtle">Para testar o login real sem sair da GAV, abra o portal em uma janela anônima e entre com o CNPJ e esta senha. Apenas os arquivos publicados ficarão visíveis.</p></div>`:""}<p class="subtle" style="margin-top:9px">Novos arquivos são liberados automaticamente. Publicar serve para o histórico antigo ainda pendente; Revogar oculta um arquivo.</p></div>`:""}${adminView()?clientAccessHtml():""}${firm?`<div class="hero"><div><small>ÁREA EXCLUSIVA DA EMPRESA</small><h2>${esc(firm.legal_name)}</h2><p>CNPJ ${esc(fmt(firm.cnpj))} · Documentos por competência e categoria.</p></div></div>`:""}<div class="stats"><div class="card stat"><span class="caption">${adminView()?"Documentos cadastrados":"Documentos disponíveis"}</span><strong>${items.length}</strong></div>${adminView()?`<div class="card stat"><span class="caption">Documentos liberados</span><strong>${items.filter(x=>x.published_at).length}</strong></div>`:""}<div class="card stat"><span class="caption">Categorias com arquivos</span><strong>${new Set(items.map(x=>x.category)).size}</strong></div></div><div class="section-title">Categorias</div><div class="cat-grid">${C.map(([id,n])=>`<button class="category" data-do="cat" data-val="${id}"><span class="cat-name">${esc(n)}</span><span class="cat-count">${items.filter(d=>d.category===id).length} documento(s)</span></button>`).join("")}</div><div class="section-title">Documentos recentes</div><div class="card card-pad">${selectionBar(items.slice().sort(documentSort).slice(0,5))}${files(items.slice().sort(documentSort).slice(0,5))}</div>`;
}
function recent(){
 const arr=filtered().slice().sort(documentSort),years=[...new Set(displayDocs().map(d=>d.year).filter(Boolean))].sort((a,b)=>b-a);
 const shown=arr.slice(listPage*PAGE_SIZE,(listPage+1)*PAGE_SIZE);
 const heading=view==="category"?(C.find(c=>c[0]===cat)?.[1]||"Documentos"):"Documentos";
 const from=arr.length?listPage*PAGE_SIZE+1:0,to=arr.length?Math.min(arr.length,(listPage+1)*PAGE_SIZE):0;
 return `${title(heading,"Arquivos por mês, com visualização e download em um clique.")}<button class="btn btn-line btn-small" data-do="back" style="margin-bottom:16px">← Voltar</button>${picker()}<div class="gav-month-filter"><select id="yearSelect" class="input" aria-label="Selecionar ano"><option value="ALL">TODOS OS ANOS</option>${years.map(y=>`<option value="${y}" ${String(year)===String(y)?"selected":""}>${y}</option>`).join("")}</select><select id="monthSelect" class="input" aria-label="Selecionar mês"><option value="ALL">TODOS OS MESES</option>${M.map((m,i)=>`<option value="${i+1}" ${String(month)===String(i+1)?"selected":""}>${m}</option>`).join("")}</select></div><div class="card card-pad">${selectionBar(shown)}${fileGroups(shown)}<div class="gav-doc-pager"><span>Exibindo ${from}–${to} de ${arr.length} documentos. Selecione um mês para localizar mais rápido.</span><div><button class="btn btn-line btn-small" data-do="prev-doc-page" ${listPage===0?"disabled":""}>Anterior</button> <button class="btn btn-line btn-small" data-do="next-doc-page" ${to>=arr.length?"disabled":""}>Próximos</button></div></div></div>`;
}
function folderCatalogHtml(){
 if(!adminView()||!supportsOfficeCatalog())return "";
 const full=folderLookup.officeId===officeId?folderLookup:{loaded:false,items:[],error:""};
 const data={...full,items:(full.items||[]).filter(f=>/^\s*\d{1,4}(?:\s|[_.-]|$)/.test(f.name))};
 const unknown=data.items.filter(f=>!f.hasCnpj);
 let html='<div class="card card-pad" style="margin-top:18px"><h3 class="block-title">Empresas numeradas no Google Drive — '+esc(officeLabel())+'</h3><p class="subtle">Somente pastas com código numérico no início. Pastas sem número ficam fora desta carteira; cadastro avulso apenas quando solicitado.</p><button class="btn btn-line btn-small" data-do="catalog-refresh" '+(busy?"disabled":"")+'>Atualizar relação do Drive</button>';
 if(data.error)html+='<div class="notice" style="margin-top:12px">Consulta indisponível: '+esc(data.error)+'</div>';
 if(data.loaded)html+='<p class="subtle" style="margin:14px 0">'+data.items.length+' pasta(s) numerada(s) · '+(data.items.length-unknown.length)+' empresa(s) cadastrada(s) · '+unknown.length+' registro(s) aguardando conferência.</p>';
 else html+='<p class="subtle" style="margin-top:14px">Aguardando consulta das pastas numeradas.</p>';
 for(const f of unknown){
  html+='<div class="gav-drive-row"><div class="gav-drive-firm"><strong>'+esc(f.name)+'</strong><small>Relação de cadastro em conferência · sem liberação de documentos</small></div></div>';
 }
 html+='<p class="footnote">Não é necessário redigitar razão social ou CNPJ. Os dados disponíveis serão reaproveitados e os registros incompletos permanecerão em conferência, sem inventar informações.</p></div>';
 return html;
}
function officesPage(){
 const cards=offices.map(o=>{
  const firms=companies.filter(c=>c.office_id===o.id&&c.is_active);
  const linked=firms.filter(c=>links.some(l=>l.company_id===c.id&&l.is_active)).length;
  return `<button class="gav-office-card ${o.id===officeId?"is-current":""}" data-do="office-select" data-val="${esc(o.id)}"><span class="gav-office-card-title">${esc(officeName(o))}</span><span class="gav-office-card-count">${firms.length} ${firms.length===1?"empresa":"empresas"}</span><span class="gav-office-card-meta">${linked} pasta(s) vinculada(s)</span><span class="gav-office-card-link">Abrir escritório</span></button>`;
 }).join("");
 return `${title("Escritórios","Selecione o escritório para consultar somente as empresas e documentos dessa carteira.")}<div class="gav-office-grid">${cards}</div><p class="footnote">A organização por escritório é exclusiva do painel administrativo. O cliente continua acessando somente a própria empresa pelo CNPJ e senha.</p>`;
}
function companyEditorHtml(){
 if(!companyEditorOpen||!adminView())return "";
 const f=companyFolders.officeId===officeId?companyFolders:{loaded:false,items:[],rootAvailable:false,notice:"",error:""};
 const folder=f.items.find(x=>x.id===companyDraft.folderId);
 const used=f.items.filter(x=>!x.linkedCompanyId||x.linkedCompanyId===companyEditId);
 const options='<option value="">'+(companyEditId?"Manter pasta vinculada / Sem pasta":"Selecione uma pasta (ou cadastre sem pasta)")+'</option>'+
  used.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===companyDraft.folderId?"selected":"")+'>'+esc(x.name)+(x.linkedCompanyId===companyEditId?" · já vinculada":"")+'</option>').join("");
 const current=companyEditId?companies.find(c=>c.id===companyEditId):null;
 return '<div class="card card-pad gav-company-editor" style="margin:16px 0">'+
  '<h3 class="block-title">'+(current?"Editar empresa":"Cadastrar nova empresa")+'</h3>'+
  '<p class="subtle">Informe os dados corretos e selecione a pasta que você criou dentro do diretório deste escritório. O CNPJ é validado antes de salvar.</p>'+
  '<form id="companyEditorForm"><div class="gav-company-form-grid">'+
  '<div class="form-field"><label for="companyCode">Código (opcional)</label><input class="input" id="companyCode" maxlength="4" inputmode="numeric" placeholder="Ex.: 080" value="'+esc(companyDraft.code)+'"></div>'+
  '<div class="form-field"><label for="companyCnpj">CNPJ da empresa</label><input class="input" id="companyCnpj" inputmode="numeric" maxlength="18" placeholder="00.000.000/0000-00" value="'+esc(companyDraft.cnpj)+'" required></div>'+
  '<div class="form-field gav-company-name"><label for="companyLegalName">Razão social / nome</label><input class="input" id="companyLegalName" maxlength="180" value="'+esc(companyDraft.legalName)+'" required></div>'+
  '<div class="form-field gav-company-name"><label for="companyFolderId">Pasta do Google Drive</label><select class="input" id="companyFolderId" '+(!f.rootAvailable?"disabled":"")+'>'+options+'</select></div></div>'+
  (current?.folder_label?'<p class="subtle">Pasta atualmente cadastrada: <strong>'+esc(current.folder_label)+'</strong></p>':"")+
  (folder?'<p class="subtle">Pasta selecionada: <strong>'+esc(folder.name)+'</strong>. O vínculo será conferido no Google Drive antes de salvar.</p>':"")+
  (f.error?'<p class="gav-company-warning">'+esc(f.error)+'</p>':"")+
  (f.notice?'<p class="subtle">'+esc(f.notice)+'</p>':"")+
  '<p class="subtle">Nenhum documento antigo será publicado automaticamente. Para liberar acesso ao cliente, a pasta precisa estar vinculada e os documentos revisados.</p>'+
  '<div class="admin-actions"><button class="btn btn-dark" type="submit" '+(busy?"disabled":"")+'>Salvar cadastro</button>'+
  '<button class="btn btn-line" type="button" data-do="company-reload-folders" '+(busy?"disabled":"")+'>Atualizar pastas do Drive</button>'+
  '<button class="btn btn-line" type="button" data-do="company-cancel">Cancelar</button></div></form></div>';
}
function companiesPage(){
 const list=officeCompanies().slice().sort((a,b)=>(a.code||"").localeCompare(b.code||"","pt-BR",{numeric:true})||a.legal_name.localeCompare(b.legal_name,"pt-BR"));
 const folder=companyFolders.officeId===officeId?companyFolders:{loaded:false,items:[],rootAvailable:false,notice:"",error:""};
 const unmatched=folder.items.filter(f=>!f.linkedCompanyId);
 let out=title("Cadastro de empresas — "+officeLabel(),"Inclua ou edite clientes e vincule cada empresa à pasta correta do Google Drive.");
 out+='<div class="gav-company-toolbar">'+officePicker()+'<div class="admin-actions"><button class="btn btn-dark" data-do="company-new">+ Nova empresa</button>'+
  '<button class="btn btn-line" data-do="company-reload-folders">Atualizar pastas do Drive</button></div></div>';
 out+='<div class="card card-pad"><strong>'+list.length+' empresa(s) cadastrada(s)</strong>'+
  '<p class="subtle">Criar a pasta no Drive não cria automaticamente um CNPJ no sistema. Você confirma os dados da empresa e escolhe a pasta localizada aqui.</p>'+
  (folder.error?'<p class="gav-company-warning">'+esc(folder.error)+'</p>':"")+
  (folder.notice?'<p class="subtle">'+esc(folder.notice)+'</p>':"")+
  (folder.loaded&&folder.rootAvailable?'<p class="subtle">'+folder.items.length+' pasta(s) encontradas no diretório do escritório · '+unmatched.length+' sem vínculo de empresa.</p>':"")+'</div>';
 out+=companyEditorHtml();
 out+='<div class="card card-pad" style="margin-top:16px"><div class="section-title">Empresas deste escritório</div>';
 out+=list.length?'<div class="file-list">'+list.map(c=>{
  const link=links.some(l=>l.company_id===c.id&&l.is_active);
  return '<div class="file-row"><div class="file-expand"><b>'+esc((c.code?c.code+" · ":"")+c.legal_name)+'</b>'+
   '<small class="file-meta">CNPJ '+esc(fmt(c.cnpj))+' · '+(link?"Pasta vinculada":"Sem pasta vinculada")+(c.is_active?"":" · Inativa")+'</small></div>'+
   '<div class="gav-company-actions"><button class="btn btn-line btn-small" data-do="company-edit" data-val="'+esc(c.id)+'">Editar</button>'+
   '<button class="btn btn-line btn-small" data-do="pick" data-val="'+esc(c.id)+'">Documentos</button></div></div>';
 }).join("")+'</div>':'<div class="empty">Nenhuma empresa cadastrada neste escritório.</div>';
 out+='</div>';
 if(folder.rootAvailable&&unmatched.length){
  out+='<div class="card card-pad" style="margin-top:16px"><div class="section-title">Pastas ainda sem empresa vinculada</div>'+
  '<p class="subtle">Ao selecionar uma pasta, você ainda precisará confirmar a razão social e o CNPJ.</p>'+
  unmatched.map(f=>'<div class="gav-drive-row"><div class="gav-drive-firm"><strong>'+esc(f.name)+'</strong><small>Aguardando cadastro e conferência</small></div>'+
   '<button class="btn btn-line btn-small" data-do="company-from-folder" data-val="'+esc(f.id)+'">Cadastrar esta pasta</button></div>').join("")+'</div>';
 }
 return out;
}
async function loadProcessing(){
 if(!adminView())return;
 const office=officeId,y=processingYear,m=processingMonth;
 processingData={officeId:office,year:y,month:m,loaded:false,companies:[],total:0,concluded:0,pending:0};
 const result=await invoke("gav-processing-summary","summary",{officeId:office,year:y,month:m});
 if(office===officeId&&y===processingYear&&m===processingMonth)processingData={...result,loaded:true};
}
function processingPage(){
 const all=officeCompanies().filter(x=>x.is_active);
 const currentData=processingData.officeId===officeId&&processingData.year===processingYear&&processingData.month===processingMonth?processingData:{loaded:false,companies:[],total:0,concluded:0,pending:0};
 const years=Array.from({length:8},(_,i)=>new Date().getFullYear()+1-i);
 const mark=(v)=>v?'<span class="gav-process-good">✓ Encontrado</span>':'<span class="gav-process-pending">— Ausente</span>';
 let out=title("Processamento — "+officeLabel(),"Conferência automática de folha e parcelamentos por empresa e competência, exclusiva da administração GAV.");
 out+='<div class="gav-process-head">'+officePicker()+'<div class="gav-process-filters"><label>Competência<select class="input" id="processingMonthSelect">'+M.map((n,i)=>'<option value="'+(i+1)+'" '+(processingMonth===i+1?"selected":"")+'>'+esc(n)+'</option>').join("")+'</select></label><label>Ano<select class="input" id="processingYearSelect">'+years.map(y=>'<option value="'+y+'" '+(processingYear===y?"selected":"")+'>'+y+'</option>').join("")+'</select></label><button class="btn btn-dark btn-small" data-do="processing-refresh">Atualizar conferência</button></div></div>';
 out+='<div class="gav-process-cards"><div class="card gav-process-card"><span class="subtle">Serviços acompanhados</span><strong>'+currentData.total+'</strong></div><div class="card gav-process-card"><span class="subtle">Concluídas</span><strong>'+currentData.concluded+'</strong></div><div class="card gav-process-card"><span class="subtle">Pendentes</span><strong>'+currentData.pending+'</strong></div></div>';
 if(!currentData.loaded)return out+'<div class="card card-pad">Atualizando o controle de '+esc(M[processingMonth-1])+'/'+processingYear+'...</div>';
 const columns='<div class="gav-process-row gav-process-header"><span>Empresa</span><span>DARF de INSS</span><span>FGTS mensal</span><span>Recibo DCTFWeb</span><span>GPS</span><span>DARF parcelamento</span><span>Situação</span><span>Consultar</span></div>';
 const rows=currentData.companies.map(c=>{
  const ev=c.evidence||{},done=c.status==="CONCLUIDA",isParcel=c.serviceKey==="PARCELAMENTOS";
  const label=(key)=>{
   if((isParcel&&key!=="parcelamento")||(!isParcel&&key==="parcelamento"))return '<span class="subtle">—</span>';
   return mark(!!ev[key])+(ev[key]?'<small title="'+esc(ev[key].name)+'">'+esc(ev[key].name)+'</small>':"");
  };
  return '<div class="gav-process-row"><div><strong>'+esc((c.code||"")+" · "+c.legalName)+'</strong><small>'+esc(c.serviceLabel||"Folha")+' · '+esc(c.reason)+'</small></div><div>'+label("darf")+'</div><div>'+label("fgts")+'</div><div>'+label("dctf")+'</div><div>'+label("gps")+'</div><div>'+label("parcelamento")+'</div><div><span class="gav-process-status '+(done?"is-complete":"is-pending")+'" aria-label="'+(done?"Concluída":"Pendente")+'">'+(done?"✓ Concluída":"• Pendente")+'</span></div><div><button class="btn btn-line btn-small" data-do="pick" data-val="'+esc(c.id)+'">Abrir</button></div></div>';
 }).join("");
 out+='<div class="card gav-process-table">'+columns+(rows||'<div class="card-pad">Nenhum serviço de processamento está configurado neste escritório.</div>')+'</div>';
 out+='<p class="gav-process-note"><strong>Regra:</strong> DARF de INSS + guia mensal do FGTS, ou recibo de entrega da DCTFWeb, ou GPS da competência (Folha). Para o serviço Parcelamentos, basta DARF de parcelamento do mês; DARFs em atraso de competências anteriores não são considerados. Relatórios de FGTS, declarações DCTFWeb sem recibo e FGTS rescisório não fecham a folha. O controle usa documentos já indexados no Drive; se acabou de salvar um arquivo, confira a sincronização antes de atualizar. Concluída indica documentação encontrada, não pagamento confirmado.</p>';
 return out;
}
function drivePage(){
 const all=officeCompanies().filter(c=>c.is_active),linked=all.filter(c=>links.some(l=>l.company_id===c.id&&l.is_active));
 const completed=all.filter(c=>links.some(l=>l.company_id===c.id&&l.last_synced_at));
 const report=currentOffice()?.code==="TTM"?mappingReport:null;
 const reportHtml=report?'<div class="card card-pad" style="margin:16px 0"><strong>Conferência das pastas TTM</strong><p class="subtle">'
   +report.linked+' novas pastas vinculadas; '+report.already+' já estavam vinculadas.</p>'
   +(report.summary||[]).map(r=>'<div class="gav-drive-row"><span>'+esc(r.code+' · '+r.name)+'</span><small>'+esc(r.status.replaceAll("_"," "))+'</small></div>').join("")+'</div>':"";
 return `${title("Google Drive — "+officeLabel(),"Pastas verificadas por empresa, com importação segura e arquivos novos automáticos após revisão.")}${officePicker()}
 <div class="card card-pad">
 <div class="section-title">Conexão Google Drive</div>
 <p>Os documentos continuam nas pastas originais. O servidor consulta apenas empresas autorizadas.</p>
 <button class="btn btn-line" data-do="google">Autorizar / renovar Google Drive</button>
 <p class="subtle" style="margin-top:10px">Credenciais: ${hasDriveSecret?"configuradas":"pendentes"}. ${esc(autoSyncLastResult)}</p>
 </div>
 <div class="card card-pad" style="margin-top:16px">
 <div class="section-title">Carteira ${esc(officeLabel())}</div>
 <p><strong>${all.length} empresas cadastradas</strong> · ${linked.length} com pasta vinculada · ${completed.length} com sincronização concluída.</p>
 ${currentOffice()?.code==="TTM"?`<p class="subtle">Somente nomes de pasta correspondentes exatamente aos cadastros serão vinculados. O histórico não é publicado automaticamente.</p><button class="btn btn-dark" data-do="ttm-expand" ${busy?"disabled":""}>Conferir e vincular pastas da TTM</button> <p class="subtle" style="margin-top:10px">A importação inicial será realizada pelo servidor, uma empresa por vez.</p>`:`<p class="subtle">As empresas deste escritório serão cadastradas e vinculadas à sua pasta própria, sem misturar arquivos com a carteira TTM.</p>`} <button class="btn btn-line" data-do="refresh-drive-status">Atualizar situação</button>
 </div>
 ${reportHtml}
 ${folderCatalogHtml()}
 <div class="card card-pad" style="margin-top:16px"><div class="section-title">Empresas e sincronização</div>
 <div class="gav-drive-table">
 ${all.map(c=>{
  const l=links.find(x=>x.company_id===c.id&&x.is_active);
  const last=syncRuns.find(x=>x.company_id===c.id);
  const success=l?.last_synced_at?{indexed_count:l.last_indexed_count,finished_at:l.last_synced_at}:syncRuns.find(x=>x.company_id===c.id&&x.state==="CONCLUIDO");
  const state=!l?"Pasta não vinculada":last?.state==="FALHOU"?"Falha: "+(last.error_safe||"verificar Drive"):success?success.indexed_count+" arquivos indexados":last?.state==="INICIADO"?"Importação em andamento":"Aguardando primeira importação";
  return `<div class="gav-drive-row"><div class="gav-drive-firm"><strong>${esc((c.code||"")+" · "+c.legal_name)}</strong><small>${esc(state)}</small>${l?`<small>${l.auto_publish_new?"Novos documentos automáticos":"Novos documentos ainda não automáticos"}</small>`:""}</div><div class="gav-drive-actions">${l?`<button class="btn btn-line btn-small" data-do="index-company" data-val="${esc(c.id)}">Sincronizar agora</button>${success?`<button class="btn btn-line btn-small" data-do="${l.auto_publish_new?"pause-company-auto":"enable-company-auto"}" data-val="${esc(c.id)}">${l.auto_publish_new?"Pausar automático":"Ativar novos automáticos"}</button>`:""}`:""}<button class="btn btn-line btn-small" data-do="pick" data-val="${esc(c.id)}">Abrir</button></div></div>`;
 }).join("")}
 </div></div>`;
}
function content(){if(view==="companies"&&adminView())return companiesPage();if(clientManaged&&(passwordChangeRequired||view==="security"))return clientPasswordHtml();if(!companies.length)return title("Sem empresas autorizadas","O acesso está ativo, mas não há vínculo de empresa. Solicite liberação à GAV.");if(view==="offices"&&adminView())return officesPage();if(view==="companies"&&adminView())return companiesPage();if(view==="drive"&&adminView())return drivePage();if(view==="processing"&&adminView())return processingPage();if(view==="recent"||view==="category")return recent();return home()}
function toastMessage(message){
 document.querySelectorAll(".gav-toast").forEach(e=>e.remove());
 const node=document.createElement("div");
 node.className="gav-toast";node.setAttribute("role","status");node.textContent=message;
 document.body.appendChild(node);
 setTimeout(()=>{if(node.isConnected)node.remove()},4600);
}
function clearPdfCache(){
 pdfGeneration++;
 pdfInFlight.clear();
 for(const item of pdfCache.values())URL.revokeObjectURL(item.url);
 pdfCache.clear();
 previewId="";previewLoading=false;
 document.body.style.overflow="";
}
function previewMarkup(){
 if(!previewId)return "";
 const d=displayDocs().find(x=>x.id===previewId);if(!d)return "";
 const stored=pdfCache.get(selected+":"+previewId);
 const ready=stored&&!previewLoading,im=String(d.mime_type||"").startsWith("image/");
 return `<div class="gav-preview-overlay" id="gavPdfOverlay" role="dialog" aria-modal="true" aria-label="Visualização do documento"><div class="gav-preview-box"><div class="gav-preview-header"><div class="gav-preview-header-title">${esc(d.file_name)}</div><div class="gav-preview-header-actions"><button class="btn btn-dark btn-small" data-do="preview-download" data-val="${esc(d.id)}">Baixar</button>${ready?`<a class="btn btn-line btn-small" href="${esc(stored.url)}" target="_blank" rel="noopener">Abrir em outra aba</a>`:""}<button class="btn btn-line btn-small" data-do="close-preview">Fechar</button></div></div><div class="gav-preview-content">${ready?`${im?`<img src="${esc(stored.url)}" alt="${esc(d.file_name)}" style="max-width:100%;max-height:100%;object-fit:contain">`:`<iframe src="${esc(stored.url)}" title="Documento PDF original" loading="eager"></iframe>`}`:`<div class="gav-preview-pending"><strong>Carregando documento…</strong>Buscando o arquivo original no Google Drive.<div class="subtle" style="margin-top:9px">Arquivos maiores podem levar alguns instantes.</div></div>`}</div><div class="gav-preview-note">Para anexar este documento em outro sistema, use o botão <strong>Baixar</strong>.</div></div></div>`;
}
function paintPreview(){
 document.getElementById("gavPdfOverlay")?.remove();
 if(!previewId)return;
 app.insertAdjacentHTML("beforeend",previewMarkup());
 document.body.style.overflow="hidden";
 const layer=document.getElementById("gavPdfOverlay");
 if(!layer)return;
 layer.querySelectorAll("[data-do]").forEach(b=>b.addEventListener("click",handle));
 layer.addEventListener("click",e=>{if(e.target===layer)closePdf()});
}
function closePdf(){
 previewId="";previewLoading=false;
 document.getElementById("gavPdfOverlay")?.remove();
 document.body.style.overflow="";
}
async function fetchPdf(id,mode){
 const key=selected+":"+id;
 if(pdfCache.has(key)){
  const saved=pdfCache.get(key);
  pdfCache.delete(key);pdfCache.set(key,saved);
  return saved;
 }
 if(pdfInFlight.has(key))return pdfInFlight.get(key);
 const requestedCompany=selected,generation=pdfGeneration;
 const promise=(async()=>{
  const blob=await invoke("gav-drive-pdf","download",{companyId:requestedCompany,documentId:id,mode,...(role==="admin"&&googleToken?{googleToken}:{})});
  // Não permitir reutilização após troca de CNPJ, saída da conta ou expiração de sessão.
  if(generation!==pdfGeneration||requestedCompany!==selected||!role)throw Error("A sessão mudou. Reabra o documento.");
  if(!blob||!["application/pdf","image/jpeg","image/png","image/webp"].includes(blob.type))throw Error("O servidor não retornou um documento válido.");
  const item={url:URL.createObjectURL(blob),blob};
  pdfCache.set(key,item);
  while(pdfCache.size>3){
   const oldest=pdfCache.keys().next().value;
   if(oldest===key)break;
   const dropped=pdfCache.get(oldest);
   URL.revokeObjectURL(dropped.url);
   pdfCache.delete(oldest);
  }
  return item;
 })();
 pdfInFlight.set(key,promise);
 try{return await promise}
 finally{if(pdfInFlight.get(key)===promise)pdfInFlight.delete(key)}
}
async function openPdf(id){
 if(!displayDocs().some(x=>x.id===id))return;
 previewId=id;
 previewLoading=!pdfCache.has(selected+":"+id);
 paintPreview();
 if(!previewLoading)return;
 try{
  await fetchPdf(id,"preview");
  if(previewId===id){previewLoading=false;paintPreview();}
 }catch(e){
  if(previewId===id){closePdf();toastMessage("Não foi possível visualizar: "+e.message);}
 }
}
async function downloadPdf(id){
 const d=displayDocs().find(x=>x.id===id);if(!d||downloadBusy)return;
 downloadBusy=id;
 const controls=[...document.querySelectorAll('[data-do="download"],[data-do="preview-download"]')].filter(b=>b.dataset.val===id);
 controls.forEach(b=>{b.disabled=true;b.textContent="Baixando…";b.setAttribute("aria-busy","true")});
 try{
  const file=await fetchPdf(id,"download");
  const anchor=document.createElement("a");
  anchor.href=file.url;anchor.download=(d.file_name||"documento.pdf").replace(/[\\/:*?"<>|]/g,"_");
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  toastMessage("Download solicitado: "+d.file_name);
 }catch(e){toastMessage("Não foi possível baixar: "+e.message)}
 finally{
  downloadBusy="";
  controls.forEach(b=>{if(b.isConnected){b.disabled=false;b.textContent="Baixar";b.removeAttribute("aria-busy")}});
 }
}
function render(){
 app.innerHTML=role?shell():login();
 app.querySelectorAll("[data-do]").forEach(b=>b.addEventListener("click",handle));
 app.querySelectorAll("[data-check-id]").forEach(b=>b.addEventListener("change",()=>{
  if(b.checked)checkedDocs.add(b.dataset.checkId);else checkedDocs.delete(b.dataset.checkId);
  refreshSelectionToolbar();
 }));
 app.querySelector("[data-check-all]")?.addEventListener("change",event=>{
  for(const d of visibleSelectionDocs()){if(event.currentTarget.checked)checkedDocs.add(d.id);else checkedDocs.delete(d.id)}
  app.querySelectorAll("[data-check-id]").forEach(b=>{b.checked=checkedDocs.has(b.dataset.checkId)});
  refreshSelectionToolbar();
 });
 app.querySelector("#clientLogin")?.addEventListener("submit",loginClient);
 app.querySelector("#companyEditorForm")?.addEventListener("submit",saveCompanyEditor);
 for(const [field,key] of [["companyCnpj","cnpj"],["companyLegalName","legalName"],["companyCode","code"]]){
  app.querySelector("#"+field)?.addEventListener("input",e=>{companyDraft[key]=e.target.value});
 }
 app.querySelector("#companyFolderId")?.addEventListener("change",e=>{
  companyDraft.folderId=e.target.value;
  const entry=companyFolders.items.find(f=>f.id===companyDraft.folderId);
  const prefix=entry?.name.match(/^\s*(\d{1,4})(?:\s|[_.-]|$)/)?.[1];
  if(prefix&&!companyDraft.code){companyDraft.code=prefix;const code=app.querySelector("#companyCode");if(code)code.value=prefix;}
 });
 app.querySelector("#clientActivationIdentify")?.addEventListener("submit",identifyActivation);
 app.querySelector("#clientActivationPassword")?.addEventListener("submit",completeActivation);
 app.querySelector("#clientPasswordForm")?.addEventListener("submit",saveClientPassword);
 app.querySelector("#officeSelect")?.addEventListener("change",e=>changeOffice(e.target.value));
 app.querySelector("#processingMonthSelect")?.addEventListener("change",e=>{processingMonth=Number(e.target.value);void run(loadProcessing)});
 app.querySelector("#processingYearSelect")?.addEventListener("change",e=>{processingYear=Number(e.target.value);void run(loadProcessing)});
 app.querySelector("#companySelect")?.addEventListener("change",e=>changeCompany(e.target.value));
 app.querySelector("#yearSelect")?.addEventListener("change",e=>{resetSelection();listPage=0;year=e.target.value;render()});
 app.querySelector("#monthSelect")?.addEventListener("change",e=>{resetSelection();listPage=0;month=e.target.value;render()});
 if(previewId)paintPreview();
 refreshSelectionToolbar();
}
function beginCompanyEditor(id="",folderId=""){
 if(!adminView())return;
 const company=id?companies.find(c=>c.id===id&&c.office_id===officeId):null;
 if(id&&!company){toastMessage("Empresa não encontrada neste escritório.");return}
 companyEditId=company?.id||"";
 const existing=companyFolders.items.find(f=>f.linkedCompanyId===companyEditId);
 const chosen=companyFolders.items.find(f=>f.id===folderId);
 const codeFromFolder=chosen?.name.match(/^\s*(\d{1,4})(?:\s|[_.-]|$)/)?.[1]||"";
 companyDraft={cnpj:company?fmt(company.cnpj):"",legalName:company?.legal_name||"",
  code:company?.code||codeFromFolder,folderId:folderId||existing?.id||""};
 companyEditorOpen=true;view="companies";
 render();
}
async function saveCompanyEditor(e){
 e.preventDefault();
 if(!adminView()||!companyEditorOpen||busy)return;
 const d={cnpj:cn(app.querySelector("#companyCnpj")?.value),
  legalName:app.querySelector("#companyLegalName")?.value?.trim()||"",
  code:app.querySelector("#companyCode")?.value?.trim()||"",
  folderId:app.querySelector("#companyFolderId")?.value||""};
 if(d.cnpj.length!==14){notice="Informe os 14 números do CNPJ.";render();return}
 if(d.legalName.length<2){notice="Informe a razão social da empresa.";render();return}
 await run(async()=>{
  const result=await invoke("gav-company-admin","save",{officeId,companyId:companyEditId,...d});
  const companyId=result.companyId;
  let syncMessage="";
  if(result.linked){
   try{
    const sync=await invoke("gav-drive-index","index",{companyId});
    syncMessage=" Primeira sincronização: "+sync.indexed+" documento(s) conferido(s) no índice.";
   }catch(syncError){
    syncMessage=" Pasta vinculada, mas a primeira sincronização precisa ser repetida em Google Drive: "+(syncError?.message||"falha temporária")+".";
   }
  }
  companyEditorOpen=false;companyEditId="";companyDraft={cnpj:"",legalName:"",code:"",folderId:""};
  selected=companyId;
  await bootstrap();
  view="companies";
  await loadCompanyFolders();
  notice=result.notice+syncMessage;
 });
}
async function changeOffice(id){
 if(role!=="admin"||!offices.some(o=>o.id===id))return;
 const keepProcessing=view==="processing"&&adminView();
 const keepCompanies=view==="companies"&&adminView();
 companyEditorOpen=false;companyEditId="";companyDraft={cnpj:"",legalName:"",code:"",folderId:""};
 companyFolders={officeId:id,loaded:false,rootAvailable:false,items:[],notice:"",error:""};
 resetSelection();listPage=0;pilotTestCredential=null;previewAsClient=false;clientDocs=[];mappingReport=null;accessPanelOpen=false;accessStatus=null;clientCredential=null;
 clearPdfCache();officeId=id;
 try{sessionStorage.setItem("gav-selected-office",id)}catch(_e){}
 selected=officeCompanies()[0]?.id||"";
 view=keepProcessing?"processing":keepCompanies?"companies":"home";cat="";year="ALL";month="ALL";
 folderLookup={officeId:id,loaded:false,items:[],error:""};
 await run(async()=>{
  await loadDocs();
  await loadOfficeFolders();
  if(keepProcessing)await loadProcessing();
  if(keepCompanies)await loadCompanyFolders();
 });
}
async function changeCompany(id){
 if(role==="admin"&&!officeCompanies().some(c=>c.id===id)){
  toastMessage("Selecione uma empresa do escritório atual.");return;
 }
 if(!companies.some(c=>c.id===id))return;
 resetSelection();listPage=0;pilotTestCredential=null;previewAsClient=false;clientDocs=[];accessPanelOpen=false;accessStatus=null;clientCredential=null;clearPdfCache();
 selected=id;view="home";cat="";year="ALL";month="ALL";
 await run(async()=>{await loadDocs()});
}
async function saveClientPassword(e){
 e.preventDefault();
 const p=app.querySelector("#newClientPass")?.value||"",confirmPass=app.querySelector("#repeatClientPass")?.value||"";
 if(p!==confirmPass){toastMessage("As senhas informadas não são iguais.");return}
 if(p.length<12||!/[a-zA-Z]/.test(p)||!/[0-9]/.test(p)){toastMessage("Use pelo menos 12 caracteres, com letras e números.");return}
 await run(async()=>{
  await api("changeClientPassword",{password:p});
  const r=await sb.auth.refreshSession();
  if(r.error)throw Error("Senha alterada. Saia e entre novamente usando a senha nova.");
  passwordChangeRequired=false;view="home";
  await bootstrap();
  toastMessage("Senha atualizada com sucesso.");
 });
}
async function openClientAccess(){
 if(!adminView()||!selected)return;
 accessPanelOpen=true;accessPanelCompany=selected;accessStatus=null;clientCredential=null;clientInvite=null;
 await run(async()=>{accessStatus=await api("clientAccessStatus",{companyId:selected})});
}
async function identifyActivation(e){
 e.preventDefault();
 const id=cn(app.querySelector("#activateCnpj")?.value);
 if(id.length!==14){notice="Informe o CNPJ completo, com 14 números.";render();return}
 await run(async()=>{
  const result=await publicActivation("inspect",{token:activationToken,cnpj:id});
  activationCompany={cnpj:result.cnpj,legalName:result.legalName};
 });
}
async function completeActivation(e){
 e.preventDefault();
 if(!activationToken||!activationCompany)return;
 const password=app.querySelector("#activatePassword")?.value||"";
 const repeat=app.querySelector("#activatePasswordRepeat")?.value||"";
 if(password!==repeat){notice="As senhas informadas não conferem.";render();return}
 if(password.length<12||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)){
  notice="Use uma senha com pelo menos 12 caracteres, incluindo letras e números.";render();return;
 }
 const companyCnpj=activationCompany.cnpj;
 await run(async()=>{
  await publicActivation("activate",{token:activationToken,cnpj:companyCnpj,password});
  activationToken="";activationCompany=null;
  try{sessionStorage.removeItem("gav-activation-token")}catch(_e){}
  const {error}=await sb.auth.signInWithPassword({
   email:"cliente-"+companyCnpj+"@acesso.gavsolucoescontabeis.com.br",password});
  if(error){notice="Senha criada. Faça login com seu CNPJ e a senha que acabou de cadastrar.";return}
  await bootstrap();
 });
}
async function loginClient(e){e.preventDefault();const id=cn(app.querySelector("#cnpj")?.value),password=app.querySelector("#pwd")?.value;if(id.length!==14){notice="Informe um CNPJ com 14 números.";render();return}await run(async()=>{const {error}=await sb.auth.signInWithPassword({email:"cliente-"+id+"@acesso.gavsolucoescontabeis.com.br",password});if(error)throw Error("CNPJ ou senha inválidos.");await bootstrap()})}
async function google(){const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname,scopes:"https://www.googleapis.com/auth/drive.readonly",queryParams:{access_type:"offline",prompt:"consent"}}});if(error)showError(error)}

async function handle(e){
 const a=e.currentTarget.dataset.do,v=e.currentTarget.dataset.val;
 if(a==="view"){
  resetSelection();listPage=0;view=v;cat="";year="ALL";month="ALL";navigationHistory.length=0;
  if(v==="processing"&&adminView())await run(loadProcessing);
  else if(v==="companies"&&adminView()){if(companyFolders.officeId!==officeId||!companyFolders.loaded)await run(loadCompanyFolders);else render()}
  else render();return;
 }
 if(a==="company-new"){beginCompanyEditor();if(!companyFolders.loaded)await run(loadCompanyFolders);return}
 if(a==="company-edit"){beginCompanyEditor(v);if(!companyFolders.loaded)await run(loadCompanyFolders);return}
 if(a==="company-from-folder"){beginCompanyEditor("",v);return}
 if(a==="company-cancel"){companyEditorOpen=false;companyEditId="";render();return}
 if(a==="company-reload-folders"){if(adminView())await run(loadCompanyFolders);return}
 if(a==="back"){resetSelection();listPage=0;view="home";cat="";year="ALL";month="ALL";navigationHistory.length=0;render();return}
 if(a==="cat"){resetSelection();listPage=0;navigationHistory.push({view,cat,year,month});cat=v;view="category";year="ALL";month="ALL";render();return}
 if(a==="google"){await google();return}
 if(a==="logout"){try{sessionStorage.removeItem("gav-selected-office")}catch(_e){}resetSelection();pilotTestCredential=null;previewAsClient=false;clientDocs=[];clearPdfCache();await sb.auth.signOut();session=null;role="";googleToken="";notice="";render();return}
 if(a==="office-select"){await changeOffice(v);return}
 if(a==="catalog-refresh"){if(role==="admin"&&!previewAsClient)await run(loadOfficeFolders);return}
 if(a==="processing-refresh"){if(adminView())await run(loadProcessing);return}
 if(a==="pick"){await changeCompany(v);return}
 if(a==="release-history"){
  if(role!=="admin"||previewAsClient)return;
  const firm=current(),pending=docs.filter(d=>d.review_status==="PENDENTE");
  if(!firm||!pending.length)return;
  const confirmed=window.confirm("ATENÇÃO: liberar TODOS os "+pending.length+" documentos antigos pendentes de "+firm.legal_name+" para os usuários autorizados dessa empresa?\n\nFaça esta operação somente depois de conferir se a pasta não contém arquivos de outras empresas. Os arquivos bloqueados ou removidos não serão liberados.");
  if(!confirmed)return;
  await run(async()=>{
   const result=await api("releaseCompanyHistory",{companyId:selected,confirmName:firm.legal_name});
   await loadDocs();notice=result.released+" documento(s) antigos liberados para "+firm.legal_name+".";
  });
  return;
 }
 if(a==="activation-cancel"){
  activationToken="";activationCompany=null;notice="";
  try{sessionStorage.removeItem("gav-activation-token")}catch(_e){}
  render();return;
 }
 if(a==="activation-help"){notice="Para criar sua senha, abra o convite individual enviado pela GAV ao WhatsApp do responsável da empresa.";render();return}
 if(a==="client-access"){await openClientAccess();return}
 if(a==="issue-client-invite"){
  if(!adminView()||accessPanelCompany!==selected||!accessStatus)return;
  if(!window.confirm("Gerar link individual de ativação para "+(current()?.legal_name||"empresa")+"?\n\nO convite anterior, se existir, será cancelado. Envie o novo link somente ao responsável pelo WhatsApp."))return;
  await run(async()=>{
   const response=await invoke("gav-client-invite","create",{companyId:selected});
   clientInvite={...response,companyId:selected};clientCredential=null;
  });return;
 }
 if(a==="copy-client-invite"){
  if(!clientInvite||clientInvite.companyId!==selected)return;
  const msg="GAV Soluções Contábeis — ative seu acesso aos documentos\n\nAbra o link individual abaixo, informe o CNPJ da empresa e crie sua senha.\n\n"+clientInvite.inviteUrl+"\n\nCNPJ: "+fmt(clientInvite.cnpj)+"\nEste convite é individual e válido por 7 dias. Não encaminhe.";
  try{await navigator.clipboard.writeText(msg);toastMessage("Convite copiado. Envie somente ao responsável pelo WhatsApp.")}
  catch(e){toastMessage("Não foi possível copiar automaticamente. Copie o link exibido acima.")}
  return;
 }
 if(a==="close-client-access"){accessPanelOpen=false;accessStatus=null;clientCredential=null;render();return}
 if(a==="issue-client-access"){
  if(!adminView()||accessPanelCompany!==selected||!accessStatus)return;
  const wasCreated=!!accessStatus.exists;
  const message=(wasCreated?"Renovar a senha e reativar o login":"Criar acesso individual para")+" "+(current()?.legal_name||"empresa")+"?\n\nApenas a GAV receberá a senha provisória. O cliente deverá trocá-la antes de consultar documentos.";
  if(!window.confirm(message))return;
  await run(async()=>{
   const response=await api("issueClientAccess",{companyId:selected,confirmReset:wasCreated});
   clientCredential={...response,companyId:selected};
   accessStatus=await api("clientAccessStatus",{companyId:selected});
  });return;
 }
 if(a==="disable-client-access"){
  if(!adminView()||accessPanelCompany!==selected)return;
  if(!window.confirm("Suspender o login desta empresa? Documentos e cadastros serão preservados."))return;
  await run(async()=>{
   await api("disableClientAccess",{companyId:selected});
   clientCredential=null;clientInvite=null;
   accessStatus=await api("clientAccessStatus",{companyId:selected});
  });return;
 }
 if(a==="copy-client-access"){
  if(!clientCredential||clientCredential.companyId!==selected)return;
  const msg="GAV Soluções Contábeis — acesso aos documentos\nPortal: https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/\nCNPJ: "+fmt(clientCredential.cnpj)+"\nSenha provisória: "+clientCredential.password+"\nNo primeiro acesso, você deverá criar sua senha definitiva.";
  try{await navigator.clipboard.writeText(msg);toastMessage("Mensagem copiada. Envie somente ao responsável, de forma privada.")}
  catch(e){toastMessage("Não foi possível copiar. Selecione os dados exibidos na tela.")}
  return;
 }
 if(a==="client-preview"){resetSelection();
  if(role!=="admin"||previewAsClient)return;
  await run(async()=>{
   const visible=await loadClientPreview();
   clearPdfCache();clientDocs=visible;previewAsClient=true;
   view="home";cat="";year="ALL";month="ALL";
  });
  return;
 }
 if(a==="create-company-test"){
  if(role!=="admin"||previewAsClient||!links.some(l=>l.company_id===selected&&l.is_active))return;
  if(!window.confirm("Criar ou renovar uma conta de TESTE desta empresa? Ela poderá acessar somente os documentos já publicados dessa empresa. Não compartilhe esta senha com o cliente."))return;
  await run(async()=>{pilotTestCredential=await api("createCompanyTestAccess",{companyId:selected})});
  return;
 }
 if(a==="remove-company-test"){
  if(role!=="admin"||previewAsClient||!links.some(l=>l.company_id===selected&&l.is_active))return;
  if(!window.confirm("Desativar e excluir a conta de teste desta empresa?"))return;
  await run(async()=>{await api("removeCompanyTestAccess",{companyId:selected});pilotTestCredential=null;notice="Conta temporária de teste desativada."});
  return;
 }
 if(a==="exit-preview"){resetSelection();
  clearPdfCache();previewAsClient=false;clientDocs=[];
  view="home";cat="";year="ALL";month="ALL";render();return;
 }
 if(a==="next-doc-page"||a==="prev-doc-page"){
  const all=filtered().length,maximum=Math.max(0,Math.ceil(all/PAGE_SIZE)-1);
  resetSelection();
  listPage=Math.min(maximum,Math.max(0,listPage+(a==="next-doc-page"?1:-1)));
  render();return;
 }
 if(a==="bulk-download"){await downloadSelectedZip();return}
 if(a==="pdf"){await openPdf(v);return}
 if(a==="download"||a==="preview-download"){await downloadPdf(v);return}
 if(a==="close-preview"){closePdf();return}
 if(a==="publish-month"||a==="revoke-month"){
  if(role!=="admin")return;
  const [c,y,m]=v.split("|"),files=docs.filter(d=>d.category===c&&String(d.year)===y&&String(d.month)===m);
  const willPublish=a==="publish-month";
  const selectedFiles=files.filter(d=>willPublish?!d.published_at:!!d.published_at);
  if(!selectedFiles.length){toastMessage("Não há arquivos pendentes dessa operação.");return}
  const label=M[Number(m)-1]+"/"+y,company=current()?.legal_name||"empresa";
  if(!window.confirm((willPublish?"PUBLICAR":"REVOGAR")+" "+selectedFiles.length+" arquivo(s) da categoria "+(C.find(x=>x[0]===c)?.[1]||c)+" de "+label+" para "+company+"?\n\nConfira se todos pertencem à empresa. A liberação afetará o acesso dos clientes."))return;
  await run(async()=>{const result=await api(willPublish?"publishMonth":"revokeMonth",{companyId:selected,category:c,year:Number(y),month:Number(m)});await loadDocs();notice=result.updated+" documento(s) "+(willPublish?"publicados":"revogados")+" em "+label+"."});
  return;
 }
 if(a==="publish"){await run(async()=>{const d=docs.find(x=>x.id===v);await api(d.published_at?"unpublish":"publish",{companyId:selected,documentId:v});await loadDocs()});return}
 if(a==="link"){await run(async()=>{await api("linkPilot",{companyId:(companies.find(c=>c.cnpj==="60955798000157")||{}).id,googleToken});await bootstrap();view="drive"});return}

 if(a==="refresh-drive-status"){
  if(role!=="admin"||previewAsClient)return;
  await run(async()=>{await bootstrap();view="drive"});
  return;
 }
 if(a==="ttm-expand"){
  if(role!=="admin"||previewAsClient)return;
  if(!window.confirm("Conferir as pastas da TTM e vincular somente as empresas com nome de pasta exatamente igual ao cadastrado? Nenhum documento antigo será publicado automaticamente."))return;
  await run(async()=>{
   const report=await invoke("gav-folder-expand","linkVerified",{});
   mappingReport=report;
   await bootstrap();view="drive";
   notice=report.linked+" pasta(s) vinculada(s); "+report.already+" já vinculada(s). A importação inicial seguirá pelo servidor.";
  });
  return;
 }
 if(a==="index-company"){
  if(role!=="admin"||previewAsClient||!companies.some(c=>c.id===v)||!links.some(l=>l.company_id===v&&l.is_active))return;
  await run(async()=>{
   const result=await invoke("gav-drive-index","index",{companyId:v});
   await bootstrap();view="drive";
   notice=result.indexed+" documentos verificados, "+result.newFiles+" novos; "+result.autoPublished+" liberados automaticamente.";
  });
  return;
 }
 if(a==="enable-company-auto"||a==="pause-company-auto"){
  if(role!=="admin"||previewAsClient)return;
  const company=companies.find(c=>c.id===v),link=links.find(l=>l.company_id===v&&l.is_active);
  if(!company||!link)return;
  if(!window.confirm((a==="enable-company-auto"?"Ativar":"Pausar")+" a liberação automática de arquivos NOVOS de "+company.legal_name+"? Os documentos antigos não serão alterados."))return;
  await run(async()=>{
   await api(a==="enable-company-auto"?"activateCompanyAutoSync":"pauseCompanyAutoSync",{companyId:v});
   await bootstrap();view="drive";
   notice="Regra automática atualizada para "+company.legal_name+".";
  });
  return;
 }
 if(a==="index"){await syncPilot({interactive:true});render();return}
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void syncPilot()});
setInterval(()=>{if(!document.hidden)void syncPilot()},15*60*1000);
sb.auth.onAuthStateChange((event,s)=>{if(event==="TOKEN_REFRESHED"&&s)session=s;if(event==="SIGNED_OUT"){resetSelection();pilotTestCredential=null;previewAsClient=false;clientDocs=[];clearPdfCache();role="";session=null;render()}});
await bootstrap();
