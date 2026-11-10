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
  const allowed=c.companies.filter(x=>x.is_active&&x.office_id===c.ttmOfficeId&&x.allocations_enabled===true);
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
  const ctx=context(),cid=company(),allowed=ctx.companies.filter(x=>x.is_active&&x.office_id===ctx.ttmOfficeId&&x.allocations_enabled===true);
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
  html+='<div class="gav-alloc-report-actions"><span>Relatório por obra · somente lançamentos salvos</span>'+
   '<button class="btn btn-dark btn-small" type="button" data-alloc-action="report-print" '+(!lines.length?"disabled":"")+'>Relatório / PDF</button>'+
   '<button class="btn btn-line btn-small" type="button" data-alloc-action="report-csv" '+(!lines.length?"disabled":"")+'>Exportar para Excel (CSV)</button></div>';
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

 function reportData(){
  const ctx=context(),cid=company(),firm=ctx.companies.find(c=>c.id===cid);
  if(!state||state.companyId!==cid||state.year!==year||state.month!==month)return null;
  const workers=new Map((state.workers||[]).map(w=>[w.employee_code,w]));
  const siteNames=namesMap();
  const groups=new Map(),employeesWithSaved=new Set();
  for(const item of state.lines||[]){
   const worker=workers.get(item.employee_code);
   if(!worker)continue;
   employeesWithSaved.add(item.employee_code);
   const cno=codeDigits(item.cno);
   const name=(cno?siteNames.get(cno):"")||String(item.manual_work_name||"").trim()||
    (cno?"Obra sem nome cadastrado":"Sem obra informada");
   const key=cno||"MANUAL:"+name.toLocaleLowerCase("pt-BR");
   if(!groups.has(key))groups.set(key,{cno,name,employees:new Map(),days:0,absences:0});
   const group=groups.get(key);
   if(!group.employees.has(item.employee_code))group.employees.set(item.employee_code,{
    code:item.employee_code,name:worker.employee_name,days:0,absences:0
   });
   const row=group.employees.get(item.employee_code);
   const days=Number(item.days_worked||0),abs=Number(item.absences||0);
   row.days+=days;row.absences+=abs;
   group.days+=days;group.absences+=abs;
  }
  const sorted=[...groups.values()].map(g=>({...g,employees:[...g.employees.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"))}))
   .sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")||(a.cno||"").localeCompare(b.cno||""));
  return {
   company:firm,competence:months[month-1]+"/"+year,year,month,groups:sorted,
   totalDays:sorted.reduce((n,g)=>n+g.days,0),
   totalAbsences:sorted.reduce((n,g)=>n+g.absences,0),
   savedEmployees:employeesWithSaved.size,
   unfilled:(state.workers||[]).length-employeesWithSaved.size,
   updatedAt:(state.lines||[]).reduce((v,line)=>line.updated_at&&line.updated_at>v?line.updated_at:v,"")
  };
 }
 function reportHtml(report){
  const companyName=esc(report.company?.legal_name||"Empresa"),when=new Date().toLocaleString("pt-BR");
  const latest=report.updatedAt?new Date(report.updatedAt).toLocaleString("pt-BR"):"—";
  const groups=report.groups.map(g=>'<section class="group"><h2>'+esc(g.name)+'</h2><div class="cno">CNO: '+esc(g.cno||"Não informado")+'</div>'+
   '<table><thead><tr><th>Código</th><th>Empregado</th><th>Dias trabalhados</th><th>Faltas</th></tr></thead><tbody>'+
   g.employees.map(w=>'<tr><td>'+esc(w.code)+'</td><td>'+esc(w.name)+'</td><td class="num">'+w.days+'</td><td class="num">'+w.absences+'</td></tr>').join("")+
   '</tbody><tfoot><tr><td colspan="2">Total da obra · '+g.employees.length+' empregado(s)</td><td class="num">'+g.days+'</td><td class="num">'+g.absences+'</td></tr></tfoot></table></section>').join("");
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>GAV · Alocações '+esc(report.competence)+' · '+companyName+'</title><style>'+
   '@page{size:A4 portrait;margin:13mm}body{font:12px Arial,sans-serif;color:#253542;margin:20px auto;max-width:890px}header{border-bottom:3px solid #B68A3C;padding-bottom:12px;margin-bottom:18px}header h1{margin:0 0 5px;font-size:21px;color:#203B56}header p{margin:4px 0}h2{margin:0;font-size:16px;color:#203B56}.group{margin:18px 0;break-inside:avoid}.cno{font-size:11px;color:#546775;margin:4px 0 8px}table{border-collapse:collapse;width:100%}th,td{text-align:left;border-bottom:1px solid #D4DEE1;padding:7px 8px}thead th{background:#F1F4F3;font-size:10px}tfoot td{font-weight:bold;background:#F1F4F3;border-top:2px solid #203B56}.num{text-align:right;width:75px}small{color:#546775}.totals{display:flex;gap:14px;padding:12px;background:#F1F4F3;border:1px solid #D4DEE1}.totals strong{color:#203B56}.print-button{border:0;background:#244B66;color:white;padding:10px 18px;border-radius:7px;cursor:pointer;margin-bottom:18px}@media print{.print-button{display:none}body{margin:0;max-width:none}header{margin-bottom:12px}}'+
   '</style></head><body><button class="print-button" onclick="window.print()">Imprimir / Salvar em PDF</button>'+
   '<header><h1>GAV Soluções Contábeis · TTM</h1><p><strong>Relatório de Alocações por Obra</strong></p><p>Empresa: '+companyName+' · Código '+esc(report.company?.code||"—")+'</p>'+
   '<p>Competência: <strong>'+esc(report.competence)+'</strong> · Emitido em '+esc(when)+'</p><small>Base: lançamentos salvos no GAV Compartilhar · Última atualização: '+esc(latest)+'</small></header>'+
   '<div class="totals"><span>Empregados informados: <strong>'+report.savedEmployees+'</strong></span><span>Sem lançamento: <strong>'+report.unfilled+'</strong></span><span>Dias: <strong>'+report.totalDays+'</strong></span><span>Faltas: <strong>'+report.totalAbsences+'</strong></span></div>'+
   groups+'<p><small>Faltas apresentadas uma única vez por empregado, na primeira alocação salva. Os dias de um empregado podem ser distribuídos entre obras. Não incluir lançamentos ainda não salvos.</small></p>'+
   '</body></html>';
 }
 function exportCsv(report){
  const q=s=>{
   let v=String(s??"");
   if(/^[\s]*[=+\-@\t\r]/.test(v))v="'"+v;
   return '"'+v.replace(/"/g,'""')+'"';
  };
  const rows=[["Empresa","Competência","CNO","Obra","Código empregado","Empregado","Dias trabalhados","Faltas"]];
  for(const g of report.groups){
   for(const w of g.employees)rows.push([report.company?.legal_name||"",report.competence,g.cno||"",g.name,w.code,w.name,w.days,w.absences]);
   rows.push(["TOTAL OBRA",report.competence,g.cno||"",g.name,"","",g.days,g.absences]);
  }
  rows.push(["TOTAL GERAL",report.competence,"","","","",report.totalDays,report.totalAbsences]);
  const csv="\ufeff"+rows.map(r=>r.map(q).join(";")).join("\r\n")+"\r\n";
  const file=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(file);
  const a=document.createElement("a");a.href=url;
  a.download="GAV-ALOCACOES-"+(report.company?.code||"TTM").replace(/[^A-Za-z0-9_-]/g,"_")+"-"+String(report.month).padStart(2,"0")+"-"+report.year+".csv";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
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
  if(action==="report-print"||action==="report-csv"){
   saveVisibleDrafts(root);
   const popup=action==="report-print"?window.open("","_blank"):null;
   if(action==="report-print"&&!popup){notify("Permita a abertura da nova janela para imprimir o relatório.");return}
   try{
    if(popup){popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório GAV</title></head><body>Atualizando lançamentos salvos...</body></html>');popup.document.close()}
    await load();
    if(error)throw new Error(error);
    const report=reportData();
    if(!report||!report.groups.length){popup?.close();notify("Ainda não existem alocações salvas para gerar este relatório.");return}
    if(popup){popup.document.open();popup.document.write(reportHtml(report));popup.document.close();popup.focus()}
    else{exportCsv(report);notify("Relatório de alocações exportado para Excel (CSV).")}
   }catch(e){if(popup&&!popup.closed){popup.document.open();popup.document.write('<!doctype html><html lang="pt-BR"><body><p>Não foi possível gerar o relatório. Volte ao GAV Compartilhar e tente novamente.</p></body></html>');popup.document.close()}
    notify(e.message||"Não foi possível gerar o relatório.")}
   return;
  }
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