/* GAV Compartilhar — Alocações TTM. Somente UI; dados e autorização ficam no Supabase. */
(function(){
"use strict";
window.GavAllocations=function createAllocations({invoke,esc,notify,context,refresh}){
 const months=["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
 const now=new Date(),prior=new Date(now.getFullYear(),now.getMonth()-1,1);
 let year=prior.getFullYear(),month=prior.getMonth()+1,companyId="",state=null,loading=false,error="",search="";
 const drafts=new Map(),newLines=new Map();
 const codeDigits=s=>String(s||"").replace(/\D/g,"");
 const key=(c,n)=>c+"|"+n;
 const company=()=>{
  const c=context();
  const allowed=c.companies.filter(x=>x.is_active&&x.office_id===c.ttmOfficeId);
  if(!allowed.length)return "";
  if(c.admin)return allowed.some(x=>x.id===companyId)?companyId:allowed[0].id;
  return allowed.some(x=>x.id===c.selected)?c.selected:"";
 };
 const allow=()=>!!company()&&context().allowed;
 async function load(){
  if(!allow()){state=null;return}
  const cid=company(),y=year,m=month;
  loading=true;error="";refresh();
  try{
   const result=await invoke("gav-allocations","list",{companyId:cid,year:y,month:m});
   if(cid===company()&&year===y&&month===m)state={...result,companyId:cid,year:y,month:m};
  }catch(e){state=null;error=e.message||"Não foi possível carregar os empregados."}
  finally{loading=false;refresh()}
 }
 const fmtCno=n=>/^\d{12}$/.test(n)?n:n;
 const catalog=()=>state?.sites||[];
 const namesMap=()=>new Map(catalog().map(s=>[s.cno,s.work_name]));
 function lineHtml(w,lineNo,record,sites,names){
  const id=key(w.employee_code,lineNo),draft=drafts.get(id)||{},saved=!!record;
  const cno=String(draft.cno??(record?.cno??(lineNo===1?w.suggested_cno||"":""))),exact=names.get(codeDigits(cno));
  const workName=String(draft.name??(exact||record?.manual_work_name||""));
  const days=String(draft.days??(saved?record.days_worked:""));
  const absence=String(draft.absences??(saved?record.absences:""));
  const second=lineNo>1;
  return '<div class="gav-allocation-row" data-alloc-employee="'+esc(w.employee_code)+'" data-alloc-line="'+lineNo+'" data-alloc-search="'+esc((w.employee_name+" "+w.employee_code).toLowerCase())+'">'+
   '<div class="gav-alloc-worker">'+(second?'<small class="gav-alloc-another">Outra obra do mesmo empregado</small>':
   '<strong>'+esc(w.employee_name)+'</strong><small>Código '+esc(w.employee_code)+'</small>')+
   (lineNo===1&&w.suggested_cno?'<small class="gav-alloc-suggestion">CNO sugerido pelo relatório Folha</small>':"")+'</div>'+
   '<div><label class="gav-alloc-label">Dias trabalhados</label><input class="input gav-alloc-number" type="number" min="0" max="31" step="1" data-alloc-days value="'+esc(days)+'" placeholder="Dias"></div>'+
   '<div><label class="gav-alloc-label">Faltas</label>'+(second?'<span class="gav-alloc-no-abs">—</span>':
    '<input class="input gav-alloc-number" type="number" min="0" max="31" step="1" data-alloc-absences value="'+esc(absence)+'" placeholder="0">')+'</div>'+
   '<div><label class="gav-alloc-label">CNO da obra</label><div class="gav-alloc-cno-wrap">'+
    '<input class="input gav-alloc-cno" inputmode="numeric" autocomplete="off" list="gav-alloc-cno-list" data-alloc-cno value="'+esc(cno)+'" placeholder="Pesquise pelo CNO">'+
    '<select class="input gav-alloc-cno-select" data-alloc-select aria-label="Escolher obra cadastrada"><option value="">▾ Obras</option>'+
    sites.map(s=>'<option value="'+esc(s.cno)+'">'+esc(fmtCno(s.cno)+' · '+s.work_name)+'</option>').join("")+'</select></div></div>'+
   '<div><label class="gav-alloc-label">Nome da obra</label><input class="input gav-alloc-workname" data-alloc-name value="'+esc(workName)+'" maxlength="180" placeholder="Nome da obra" '+(exact?"readonly":"")+'></div>'+
   '<div class="gav-alloc-row-actions"><button class="btn btn-dark btn-small" type="button" data-alloc-action="save" data-val="'+esc(id)+'">Salvar</button>'+
    (saved?'<button class="btn btn-line btn-small" type="button" data-alloc-action="delete" data-val="'+esc(id)+'">Excluir</button>':"")+'</div>'+
   '</div>';
 }
 function page(){
  const ctx=context(),cid=company(),allowed=ctx.companies.filter(x=>x.is_active&&x.office_id===ctx.ttmOfficeId);
  if(!ctx.allowed||!cid)return '<div class="card card-pad">Alocações disponíveis somente para as empresas da TTM.</div>';
  const current=allowed.find(x=>x.id===cid);
  const picker=ctx.admin?'<label class="gav-alloc-top-label">Empresa<select class="input" data-alloc-company>'+
   allowed.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===cid?"selected":"")+'>'+esc((c.code||"")+" · "+c.legal_name)+'</option>').join("")+'</select></label>':
   '<div class="gav-alloc-client-name"><strong>'+esc(current?.legal_name||"Empresa")+'</strong></div>';
  const years=Array.from({length:6},(_,i)=>new Date().getFullYear()+1-i);
  let html='<div class="page-head"><div><div class="eyebrow">TTM · CONTROLE MENSAL</div><h1>Alocações</h1><p>Empregados da Folha, dias trabalhados, faltas e distribuição por obra/CNO.</p></div></div>'+
   '<div class="card card-pad gav-alloc-toolbar">'+picker+
   '<label class="gav-alloc-top-label">Competência<select class="input" data-alloc-month>'+months.map((x,i)=>'<option value="'+(i+1)+'" '+(month===i+1?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'+
   '<label class="gav-alloc-top-label">Ano<select class="input" data-alloc-year>'+years.map(y=>'<option value="'+y+'" '+(y===year?"selected":"")+'>'+y+'</option>').join("")+'</select></label>'+
   '<button class="btn btn-line btn-small" type="button" data-alloc-action="refresh">Atualizar</button></div>';
  if(error)html+='<div class="error" style="display:block">'+esc(error)+'</div>';
  if(loading)return html+'<div class="card card-pad">Carregando empregados e obras...</div>';
  const ready=state&&state.companyId===cid&&state.year===year&&state.month===month;
  if(!ready)return html+'<div class="card card-pad">Abra esta aba para consultar o mês selecionado.</div>';
  const workers=state.workers||[],sites=state.sites||[],lines=state.lines||[],names=namesMap();
  html+='<div class="gav-alloc-metrics"><div class="card"><span>Empregados na Folha</span><strong>'+workers.length+'</strong></div><div class="card"><span>CNOs cadastrados (TTM)</span><strong>'+sites.length+'</strong></div><div class="card"><span>Alocações salvas</span><strong>'+lines.length+'</strong></div></div>';
  html+='<p class="gav-alloc-note">Os códigos e nomes vêm dos relatórios Folha da competência. CNOs dos departamentos são sugestões; dias e faltas só são registrados por quem preencher e salvar. Uma pessoa pode ter várias obras.</p>';
  if(!workers.length)return html+'<div class="card card-pad"><strong>Folha ainda não importada para esta empresa e competência.</strong><p class="subtle">Quando o relatório estiver disponível e for conferido, a lista de empregados poderá ser importada. Não serão usados nomes de outro mês.</p></div>';
  html+='<div class="gav-alloc-find"><label for="gav-allocation-search">Pesquisar empregado</label><input id="gav-allocation-search" class="input" data-alloc-search-input value="'+esc(search)+'" placeholder="Nome ou código do empregado"></div>';
  html+='<datalist id="gav-alloc-cno-list">'+sites.map(s=>'<option value="'+esc(s.cno)+'">'+esc(s.work_name)+'</option>').join("")+'</datalist>';
  html+='<div class="card gav-allocation-table"><div class="gav-allocation-row gav-allocation-header"><span>Empregado</span><span>Dias trabalhados</span><span>Faltas</span><span>CNO / Buscar</span><span>Nome da obra</span><span>Ações</span></div>';
  for(const w of workers){
   const saved=lines.filter(x=>x.employee_code===w.employee_code),extras=newLines.get(w.employee_code)||[];
   const numbers=[...new Set([1,...saved.map(x=>x.line_no),...extras])].sort((a,b)=>a-b);
   for(const n of numbers)html+=lineHtml(w,n,saved.find(x=>x.line_no===n),sites,names);
   html+='<div class="gav-alloc-employee-footer"><button class="gav-alloc-add" type="button" data-alloc-action="add" data-val="'+esc(w.employee_code)+'">+ Outra obra para este empregado</button></div>';
  }
  html+='</div><p class="gav-alloc-note">Se o CNO já existe, selecione-o pela lista “Obras” ou digite parte do número. O nome será preenchido automaticamente. Para CNO novo, digite os 12 números e o nome da obra na mesma linha; o cadastro será criado ao salvar. As faltas são informadas somente na primeira linha de cada empregado.</p>';
  return html;
 }
 function saveVisibleDrafts(root){
  root.querySelectorAll(".gav-allocation-row[data-alloc-employee]").forEach(row=>{
   const c=row.dataset.allocEmployee,n=Number(row.dataset.allocLine);
   drafts.set(key(c,n),{days:row.querySelector("[data-alloc-days]")?.value??"",
     absences:row.querySelector("[data-alloc-absences]")?.value??"",
     cno:row.querySelector("[data-alloc-cno]")?.value??"",
     name:row.querySelector("[data-alloc-name]")?.value??""});
  });
 }
 function updateName(row){
  const inp=row.querySelector("[data-alloc-cno]"),out=row.querySelector("[data-alloc-name]");
  if(!inp||!out)return;
  const digits=codeDigits(inp.value),site=catalog().find(x=>x.cno===digits);
  if(site){out.value=site.work_name;out.readOnly=true}
  else{if(out.readOnly)out.value="";out.readOnly=false}
 }
 async function onAction(action,val,row,root){
  if(action==="refresh"){saveVisibleDrafts(root);await load();return}
  if(action==="add"){
   saveVisibleDrafts(root);
   const existing=(state?.lines||[]).filter(x=>x.employee_code===val).map(x=>x.line_no);
   const extra=newLines.get(val)||[];
   const next=Math.max(0,...existing,...extra,1)+1;
   if(next>30){notify("Máximo de 30 obras por empregado.");return}
   newLines.set(val,[...extra,next]);refresh();return;
  }
  if(!row)return;
  const [code,nText]=val.split("|"),n=Number(nText);
  if(!/^\d{4,6}-\d{1,2}$/.test(code)||!Number.isInteger(n))return;
  const base={companyId:company(),year,month,employeeCode:code,lineNo:n};
  if(action==="delete"){
   if(!window.confirm("Excluir esta alocação salva? Os dados do empregado e as outras obras serão preservados."))return;
   try{await invoke("gav-allocations","deleteLine",base);drafts.delete(val);await load();notify("Alocação excluída.")}
   catch(e){notify(e.message||"Não foi possível excluir.")}
   return;
  }
  if(action!=="save")return;
  const day=row.querySelector("[data-alloc-days]")?.value??"",abs=row.querySelector("[data-alloc-absences]")?.value??"";
  if(day===""||!Number.isInteger(Number(day))){notify("Informe a quantidade de dias trabalhados.");return}
  const cno=row.querySelector("[data-alloc-cno]")?.value??"";
  const name=row.querySelector("[data-alloc-name]")?.value??"";
  try{
   await invoke("gav-allocations","saveLine",{...base,daysWorked:Number(day),
     absences:abs===""?0:Number(abs),cno,workName:name});
   drafts.delete(val);
   newLines.set(code,(newLines.get(code)||[]).filter(x=>x!==n));
   await load();notify("Alocação salva: "+code+" — "+months[month-1]+"/"+year+".");
  }catch(e){notify(e.message||"Não foi possível salvar a alocação.")}
 }
 function attach(root){
  const host=root.querySelector(".gav-alloc-toolbar");if(!host)return;
  root.querySelectorAll("[data-alloc-company],[data-alloc-month],[data-alloc-year]").forEach(el=>{
   el.addEventListener("change",async()=>{
    saveVisibleDrafts(root);
    if(el.hasAttribute("data-alloc-company"))companyId=el.value;
    if(el.hasAttribute("data-alloc-month"))month=Number(el.value);
    if(el.hasAttribute("data-alloc-year"))year=Number(el.value);
    drafts.clear();newLines.clear();search="";
    await load();
   });
  });
  root.querySelector("[data-alloc-search-input]")?.addEventListener("input",e=>{
   search=e.target.value;
   const v=search.toLowerCase().trim();
   root.querySelectorAll(".gav-allocation-row[data-alloc-search]").forEach(row=>{
    row.style.display=!v||row.dataset.allocSearch.includes(v)?"":"none";
   });
   root.querySelectorAll(".gav-alloc-employee-footer").forEach(f=>{f.style.display="";});
  });
  root.querySelectorAll("[data-alloc-select]").forEach(select=>{
   select.addEventListener("change",()=>{
    const row=select.closest(".gav-allocation-row");
    if(!row||!select.value)return;
    const field=row.querySelector("[data-alloc-cno]");
    field.value=select.value;updateName(row);select.value="";
   });
  });
  root.querySelectorAll("[data-alloc-cno]").forEach(input=>{
   input.addEventListener("input",()=>updateName(input.closest(".gav-allocation-row")));
  });
  root.querySelectorAll("[data-alloc-action]").forEach(btn=>btn.addEventListener("click",()=>{
   const row=btn.closest(".gav-allocation-row");
   void onAction(btn.dataset.allocAction,btn.dataset.val||"",row,root);
  }));
 }
 return {page,load,attach,clear:()=>{state=null;companyId="";drafts.clear();newLines.clear();search=""},isReady:()=>!!state};
};
})();