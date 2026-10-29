import {createClient} from "https://esm.sh/@supabase/supabase-js@2.76.1";
const ROOT="https://kiunegfjbfhvvlkxqvos.supabase.co";
const PUB="sb_publishable_QpDD6nZEdRPtvOeJCSOZ9A_FMaA2Za7";
const sb=createClient(ROOT,PUB,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
const logo="assets/logo-gav-sem-fundo.svg",lion="assets/leao-gav-sem-fundo.svg";
const app=document.getElementById("app");
const M=["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO","DÉCIMO TERCEIRO"];
const C=[["ADMISSOES","Admissões"],["RESCISOES","Rescisões"],["FERIAS","Férias"],["FOLHA","Folha de Pagamento"],["GUIAS_IMPOSTOS","Guias e Impostos"],["OUTROS","Outros Documentos"]];
let role="",companies=[],docs=[],links=[],candidates=[],selected="",view="home",cat="",year=2026,month="ALL",session=null,googleToken="",hasDriveSecret=false,notice="",busy=false;
const esc=v=>String(v??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));
const cn=v=>String(v||"").replace(/\D/g,"");
const showError=e=>{notice=e?.message||String(e);busy=false;render()};
const current=()=>companies.find(c=>c.id===selected);
const fmt=v=>v&&v.length===14?v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):v;
async function invoke(fn,action,body={}){
 const token=session?.access_token;if(!token)throw Error("Faça login novamente.");
 const r=await fetch(ROOT+"/functions/v1/"+fn,{method:"POST",headers:{"Content-Type":"application/json",apikey:PUB,Authorization:"Bearer "+token},body:JSON.stringify({action,...body})});
 const ct=r.headers.get("Content-Type")||"";
 if(fn==="gav-drive-pdf"&&r.ok)return await r.blob();
 const j=ct.includes("json")?await r.json():{error:"Serviço indisponível."};
 if(!r.ok)throw Error(j.error||"Falha no servidor.");return j;
}
const api=(action,body={})=>invoke("gav-portal-api",action,body);
const run=async task=>{busy=true;notice="";render();try{await task()}catch(e){notice=e.message||"Não foi possível concluir."}busy=false;render()};
async function loadDocs(){docs=selected?(await api("documents",{companyId:selected})).documents:[]}
async function bootstrap(){
 const s=await sb.auth.getSession();session=s.data.session;
 if(!session){role="";render();return}
 if(session.provider_token)googleToken=session.provider_token;
 try{
  const me=await api("me");role=me.role;companies=me.companies||[];links=me.linked||[];candidates=me.candidate||[];hasDriveSecret=me.driveSecretsConfigured;
  if(!selected||!companies.some(c=>c.id===selected))selected=(companies.find(c=>c.cnpj==="60955798000157")||companies[0])?.id||"";
  if(role==="admin"&&session.provider_refresh_token){
   try{await api("connectDrive",{refreshToken:session.provider_refresh_token})}catch(e){notice="Autenticação concluída, mas não foi possível guardar o acesso offline do Drive: "+e.message}
  }
  await loadDocs();render();
 }catch(e){role="";notice=e.message||"Erro de autenticação.";render()}
}
const brand=()=>`<div class="logo-official"><img src="${logo}" alt="GAV Soluções Contábeis" onerror="this.style.display='none'"><span class="logo-text">GAV <small>SOLUÇÕES CONTÁBEIS</small></span></div>`;
function login(){
 return `<div class="login-wrap"><section class="login-brand"><div>${brand()}</div><div><div class="gold-line"></div><div class="gav-lion-login"><img src="${lion}" alt="Símbolo GAV"></div><h1>Seus documentos.<br>Em um só lugar.</h1><p>Documentos originais organizados por empresa, competência e categoria, com acesso individual e protegido.</p></div><span class="login-foot">Compromisso, organização e responsabilidade.</span></section><section class="login-panel"><div class="eyebrow">GAV COMPARTILHAR DOCS · PORTAL SEGURO</div><h2>Bem-vindo!</h2><p class="subtle">Entre com o CNPJ e a senha fornecida pela GAV.</p><form id="clientLogin"><div class="form-field"><label for="cnpj">CNPJ da empresa</label><input id="cnpj" class="input" placeholder="00.000.000/0000-00" autocomplete="username" required></div><div class="form-field"><label for="pwd">Senha</label><input id="pwd" class="input" type="password" autocomplete="current-password" required></div><button class="btn btn-dark login-action" type="submit">Acessar documentos</button></form><div style="margin-top:24px;border-top:1px solid #e3e3e3;padding-top:20px"><div class="subtle" style="font-size:12px;margin-bottom:10px">Acesso da administração GAV</div><button class="btn btn-line" data-do="google" ${busy?"disabled":""}>Entrar com Google · Administrador</button></div><p class="subtle" style="font-size:11px;margin-top:22px">Sua conta precisa estar previamente autorizada pela GAV. Não existe cadastro público.</p></section></div>`;
}
const nav=()=>role==="admin"?[["home","Início"],["recent","Documentos"],["companies","Empresas"],["drive","Google Drive"]]:[["home","Início"],["recent","Documentos"]];
function shell(){
 const firm=current(),navLinks=nav();
 return `<div class="shell"><aside class="side"><div class="side-top"><div class="side-logo">${brand()}</div></div><div class="side-caption">NAVEGAÇÃO</div>${navLinks.map(([id,name])=>`<button class="nav ${view===id?"active":""}" data-do="view" data-val="${id}">${esc(name)}</button>`).join("")}<div class="side-bottom"><div style="font-weight:800;margin-bottom:9px">${role==="admin"?"Administrador GAV":"Portal do cliente"}</div><div class="subtle" style="margin-bottom:14px">Conexão segura · v0.9.0</div><button class="nav" data-do="logout">Sair da conta</button></div></aside><main class="app-main"><header class="topbar"><div><span class="mobile-brand">GAV <small>SOLUÇÕES CONTÁBEIS</small></span><div class="header-title">${role==="admin"?"Painel administrativo":"Portal de documentos"}</div><div class="header-desc">${esc(firm?.legal_name||"GAV Soluções Contábeis")}</div></div><div class="top-actions"><div class="avatar">${role==="admin"?"AD":"CL"}</div><button class="btn btn-line btn-small" data-do="logout">Sair</button></div></header><div class="content">${notice?`<div class="error" style="display:block;margin-bottom:18px">${esc(notice)}</div>`:""}${busy?`<div class="card card-pad" style="margin-bottom:18px">Processando sua solicitação…</div>`:""}${content()}</div></main><nav class="bottom-bar" aria-label="Navegação">${navLinks.map(([id,name])=>`<button class="bottom-nav ${view===id?"active":""}" data-do="view" data-val="${id}">${esc(name)}</button>`).join("")}</nav></div>`;
}
const title=(name,sub)=>`<div class="page-head"><div><div class="eyebrow">CENTRAL DE DOCUMENTOS</div><h1>${esc(name)}</h1><p>${esc(sub)}</p></div></div>`;
const picker=()=>role==="admin"?`<div class="form-field" style="max-width:460px"><label>Empresa selecionada</label><select id="companySelect" class="input">${companies.map(c=>`<option value="${c.id}" ${c.id===selected?"selected":""}>${esc((c.code||"")+" · "+c.legal_name)}</option>`).join("")}</select></div>`:"";
const filtered=()=>docs.filter(d=>(year==="ALL"||d.year===Number(year))&&(month==="ALL"||d.month===Number(month))&&(view!=="category"||d.category===cat));
function files(items){
 if(!items.length)return '<div class="empty">Nenhum documento disponível nesta seleção.</div>';
 return `<div class="file-list">${items.map(d=>`<div class="file-row" style="gap:12px"><span class="file-ico">PDF</span><span class="file-expand"><b class="file-title">${esc(d.file_name)}</b><small class="file-meta">${esc(d.relative_path||"Raiz")} · ${d.month?M[d.month-1]+"/":""}${d.year||"SEM COMPETÊNCIA"} · ${esc(C.find(c=>c[0]===d.category)?.[1]||"Outros")}</small></span>${role==="admin"?`<button class="btn btn-line btn-small" data-do="publish" data-val="${d.id}">${d.published_at?"Revogar":"Publicar"}</button>`:""}<button class="btn btn-dark btn-small" data-do="pdf" data-val="${d.id}">Abrir PDF</button></div>`).join("")}</div>`;
}
function home(){
 const firm=current();
 return `${title("Meus documentos",role==="admin"?"Conferência dos arquivos da empresa selecionada":"Documentos liberados pela GAV para sua empresa.")}${picker()}${firm?`<div class="hero"><div><small>ÁREA EXCLUSIVA DA EMPRESA</small><h2>${esc(firm.legal_name)}</h2><p>CNPJ ${esc(fmt(firm.cnpj))} · Documentos por competência e categoria.</p></div><div class="hero-official"><img src="${lion}" alt="Símbolo GAV"></div></div>`:""}<div class="stats"><div class="card stat"><span class="caption">Documentos cadastrados</span><strong>${docs.length}</strong></div><div class="card stat"><span class="caption">Documentos liberados</span><strong>${docs.filter(x=>x.published_at).length}</strong></div><div class="card stat"><span class="caption">Categorias com arquivos</span><strong>${new Set(docs.map(x=>x.category)).size}</strong></div></div><div class="section-title">Categorias</div><div class="cat-grid">${C.map(([id,n])=>`<button class="category" data-do="cat" data-val="${id}"><span class="cat-name">${esc(n)}</span><span class="cat-count">${docs.filter(d=>d.category===id).length} documento(s)</span></button>`).join("")}</div><div class="section-title">Documentos recentes</div><div class="card card-pad">${files(docs.slice(0,5))}</div>`;
}
function recent(){
 const arr=filtered(),years=[...new Set(docs.map(d=>d.year).filter(Boolean))].sort((a,b)=>b-a);
 return `${title(view==="category"?(C.find(c=>c[0]===cat)?.[1]||"Documentos"):"Documentos","Filtre por ano e mês. Os nomes dos arquivos são os nomes reais do Drive.")}${picker()}<div class="row" style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0"><select id="yearSelect" class="input" style="width:auto"><option value="ALL">TODOS OS ANOS</option>${years.map(y=>`<option value="${y}" ${String(year)===String(y)?"selected":""}>${y}</option>`).join("")}</select><select id="monthSelect" class="input" style="width:auto"><option value="ALL">TODOS OS MESES</option>${M.map((m,i)=>`<option value="${i+1}" ${String(month)===String(i+1)?"selected":""}>${m}</option>`).join("")}</select></div><div class="card card-pad">${files(arr)}</div>`;
}
function companiesPage(){
 return `${title("Empresas e permissões","Relação real de empresas cadastradas. O acesso de cada cliente será individual.")}<div class="card card-pad"><div class="file-list">${companies.map(c=>`<div class="file-row"><div class="file-expand"><b>${esc((c.code||"")+" · "+c.legal_name)}</b><small class="file-meta">CNPJ ${esc(fmt(c.cnpj))} · ${links.some(l=>l.company_id===c.id)?"Pasta vinculada":"Pasta ainda não vinculada"}</small></div><button class="btn btn-line btn-small" data-do="pick" data-val="${c.id}">Documentos</button></div>`).join("")}</div></div><p class="footnote">Os clientes não visualizam a lista de empresas. O acesso depende de autorização individual registrada no servidor.</p>`;
}
function drivePage(){
 const pilot=companies.find(c=>c.cnpj==="60955798000157");
 const candidate=pilot&&candidates.find(c=>c.company_id===pilot.id),linked=pilot&&links.some(l=>l.company_id===pilot.id);
 return `${title("Google Drive","Sincronização controlada com a pasta real da empresa-piloto, sem publicar documentos automaticamente.")}<div class="card card-pad"><div class="section-title">1. Conta Google da administração</div><p>Use a conta GAV para autorizar somente a leitura dos documentos. O token é protegido no servidor.</p><button class="btn btn-dark" data-do="google">Autorizar / renovar Google Drive</button><div class="subtle" style="margin-top:10px">Credenciais do servidor: ${hasDriveSecret?"configuradas":"pendentes para acesso permanente dos clientes"}.</div></div><div class="card card-pad" style="margin-top:16px"><div class="section-title">2. Empresa piloto</div><p><b>${esc(pilot?.legal_name||"JM ROCHA")}</b> · Pasta identificada: ${esc(candidate?.label||"Não localizada")}.</p><p class="subtle">Vínculo: ${linked?"verificado e ativo":"aguardando verificação no Google Drive"}.</p><button class="btn btn-line" data-do="link" ${!pilot||linked?"disabled":""}>Verificar e vincular pasta</button> <button class="btn btn-dark" data-do="index" ${!linked?"disabled":""}>Sincronizar PDFs da pasta</button></div><div class="card card-pad" style="margin-top:16px"><div class="section-title">3. Conferência antes de liberar</div><p>Após a indexação, abra a empresa em <b>Documentos</b> e publique somente os PDFs conferidos. Nenhuma publicação é automática.</p><button class="btn btn-line" data-do="pick" data-val="${pilot?.id||""}">Conferir documentos da JM Rocha</button></div>`;
}
function content(){if(!companies.length)return title("Sem empresas autorizadas","O acesso está ativo, mas não há vínculo de empresa. Solicite liberação à GAV.");if(view==="companies"&&role==="admin")return companiesPage();if(view==="drive"&&role==="admin")return drivePage();if(view==="recent"||view==="category")return recent();return home()}
function render(){app.innerHTML=role?shell():login();app.querySelectorAll("[data-do]").forEach(b=>b.addEventListener("click",handle));app.querySelector("#clientLogin")?.addEventListener("submit",loginClient);app.querySelector("#companySelect")?.addEventListener("change",e=>changeCompany(e.target.value));app.querySelector("#yearSelect")?.addEventListener("change",e=>{year=e.target.value;render()});app.querySelector("#monthSelect")?.addEventListener("change",e=>{month=e.target.value;render()})}
async function changeCompany(id){selected=id;view="home";await run(async()=>{await loadDocs()})}
async function loginClient(e){e.preventDefault();const id=cn(app.querySelector("#cnpj")?.value),password=app.querySelector("#pwd")?.value;if(id.length!==14){notice="Informe um CNPJ com 14 números.";render();return}await run(async()=>{const {error}=await sb.auth.signInWithPassword({email:"cliente-"+id+"@acesso.gavsolucoescontabeis.com.br",password});if(error)throw Error("CNPJ ou senha inválidos.");await bootstrap()})}
async function google(){const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname,scopes:"https://www.googleapis.com/auth/drive.readonly",queryParams:{access_type:"offline",prompt:"consent"}}});if(error)showError(error)}
async function openPdf(id){
 const tab=window.open("about:blank","_blank");if(!tab){notice="Permita a abertura de PDF no navegador.";render();return}
 try{const blob=await invoke("gav-drive-pdf","download",{companyId:selected,documentId:id,...(role==="admin"&&googleToken?{googleToken}:{})});const url=URL.createObjectURL(blob);tab.location=url;setTimeout(()=>URL.revokeObjectURL(url),120000)}catch(e){tab.close();showError(e)}
}
async function handle(e){
 const a=e.currentTarget.dataset.do,v=e.currentTarget.dataset.val;
 if(a==="view"){view=v;render();return}
 if(a==="cat"){cat=v;view="category";year="ALL";month="ALL";render();return}
 if(a==="google"){await google();return}
 if(a==="logout"){await sb.auth.signOut();session=null;role="";googleToken="";notice="";render();return}
 if(a==="pick"){await changeCompany(v);view="recent";render();return}
 if(a==="pdf"){await openPdf(v);return}
 if(a==="publish"){await run(async()=>{const d=docs.find(x=>x.id===v);await api(d.published_at?"unpublish":"publish",{companyId:selected,documentId:v});await loadDocs()});return}
 if(a==="link"){await run(async()=>{await api("linkPilot",{companyId:(companies.find(c=>c.cnpj==="60955798000157")||{}).id,googleToken});await bootstrap();view="drive"});return}
 if(a==="index"){await run(async()=>{const firm=companies.find(c=>c.cnpj==="60955798000157");const r=await invoke("gav-drive-index","index",{companyId:firm.id,googleToken});await bootstrap();notice=r.indexed+" PDF(s) indexados; "+r.newFiles+" novos. Nenhum foi publicado."});return}
}
sb.auth.onAuthStateChange((event,s)=>{if(event==="SIGNED_OUT"){role="";session=null;render()}});
await bootstrap();
