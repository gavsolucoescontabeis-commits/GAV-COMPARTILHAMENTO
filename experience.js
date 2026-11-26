/* GAV Compartilhar v0.13.32 — consulta de experiência por empresa. */
export function createExperience({invoke,esc,refresh,notify,context}){
 let data=null,loadedFor="",loading=false,error="",filter="current",search="";
 const calc=(iso,days)=>{
  const m=String(iso||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])+(days-1)*86400000);
 };
 const fmt=d=>d?String(d.getUTCDate()).padStart(2,"0")+"/"+String(d.getUTCMonth()+1).padStart(2,"0")+"/"+d.getUTCFullYear():"—";
 const now=()=>{
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const n=key=>Number(parts.find(x=>x.type===key).value);
  return Date.UTC(n("year"),n("month")-1,n("day"));
 };
 const difference=(date,today)=>date?Math.round((date.getTime()-today)/86400000):null;
 const company=()=>context().selected;
 async function load(){
  const id=company();if(!id)return;
  loading=true;error="";refresh();
  try{
   const result=await invoke("gav-experience","list",{companyId:id});
   if(id===company()){data=result;loadedFor=id;}
  }catch(e){if(id===company())error=e?.message||"Consulta indisponível."}
  finally{loading=false;refresh()}
 }
 function records(){
  if(loadedFor!==company())return [];
  const today=now();
  return (data?.employees||[]).map(w=>{
   const first=calc(w.admission_date,w.first_days||45);
   const final=calc(w.admission_date,(w.first_days||45)+(w.second_days??45));
   const firstDays=difference(first,today),finalDays=difference(final,today);
   const dismissed=!!w.termination_date;
   const ended=dismissed||finalDays===null||finalDays<0||w.contract_status==="NAO_APLICAVEL";
   const due=firstDays!==null&&firstDays>=0?firstDays:finalDays;
   return {...w,first,final,firstDays,finalDays,dismissed,ended,due};
  });
 }
 function page(){
  const id=company();
  const head='<button type="button" class="btn btn-line btn-small gav-exp-back" data-do="back">← Voltar aos meus documentos</button>'+
   '<div class="gav-exp-head"><div><h1>Experiência dos empregados</h1><p>Consulte facilmente os vencimentos de 45 e 90 dias.</p></div>'+
   '<button type="button" class="btn btn-line btn-small" data-exp-action="reload" '+(loading?'disabled':'')+'>Atualizar consulta</button></div>';
  if(!id)return head+'<div class="card card-pad">Escolha uma empresa para consultar.</div>';
  if(loadedFor!==id)return head+'<div class="card card-pad">'+(loading?'Carregando empregados…':'Selecione Atualizar consulta para carregar os empregados.')+'</div>';
  const all=records(),active=all.filter(w=>!w.ended);
  const soon=active.filter(w=>w.due>=0&&w.due<=7).length;
  const month=active.filter(w=>w.due>=0&&w.due<=30).length;
  const totals='<div class="gav-exp-stats"><div class="gav-exp-stat"><strong>'+active.length+'</strong><small>Em acompanhamento</small></div>'+
   '<div class="gav-exp-stat"><strong>'+soon+'</strong><small>Vencem em 7 dias</small></div>'+
   '<div class="gav-exp-stat"><strong>'+month+'</strong><small>Vencem em 30 dias</small></div></div>';
  const filters=[["current","Em andamento"],["soon","Próximos 30 dias"],["all","Todos"],["history","Histórico"]];
  const tools='<div class="gav-exp-tools"><div class="gav-exp-filters">'+filters.map(pair=>
   '<button type="button" data-exp-action="filter" data-val="'+pair[0]+'" class="'+(filter===pair[0]?'is-active':'')+'">'+pair[1]+'</button>').join('')+
   '</div><label class="gav-exp-search"><span>Pesquisar empregado</span><input class="input" type="search" id="gavExpSearch" value="'+esc(search)+'" placeholder="Nome ou código"></label></div>';
  let list=all;
  const needle=search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  if(needle)list=list.filter(w=>(w.employee_name+' '+w.employee_code).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(needle));
  if(filter==='current')list=list.filter(w=>!w.ended);
  if(filter==='soon')list=list.filter(w=>!w.ended&&w.due>=0&&w.due<=30);
  if(filter==='history')list=list.filter(w=>w.ended);
  list.sort((a,b)=>Number(a.ended)-Number(b.ended)||((a.due??9999)-(b.due??9999))||a.employee_name.localeCompare(b.employee_name,'pt-BR'));
  const daysLabel=n=>n===null?'—':n<0?'Prazo transcorrido':n===0?'Vence hoje':n===1?'Vence amanhã':'Faltam '+n+' dias';
  const cards=list.map(w=>{
   let cls='normal',status='Em acompanhamento';
   if(w.dismissed){cls='archive';status='Rescisão registrada'}
   else if(w.contract_status==='NAO_APLICAVEL'){cls='archive';status='Não aplicável'}
   else if(w.ended){cls='archive';status='Prazo de experiência encerrado'}
   else if(w.due<=7){cls='urgent';status='Prazo próximo'}
   else if(w.due<=30){cls='attention';status='Acompanhar'}
   const cell=(label,value,sub)=>'<div class="gav-exp-date"><small>'+label+'</small><strong>'+esc(value)+'</strong>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</div>';
   return '<article class="gav-exp-person"><div class="gav-exp-person-top"><div><strong>'+esc(w.employee_name)+'</strong>'+
    '<small>'+esc(w.job_title||'Empregado')+' · Código '+esc(w.employee_code)+'</small></div>'+
    '<span class="gav-exp-badge '+cls+'">'+esc(status)+'</span></div><div class="gav-exp-dates">'+
    cell('Admissão',fmt(calc(w.admission_date,1)),'')+
    cell('1º prazo · 45 dias',fmt(w.first),daysLabel(w.firstDays))+
    cell('2º prazo · 90 dias',fmt(w.final),daysLabel(w.finalDays))+'</div>'+
    (w.dismissed?'<small class="gav-exp-dismissed">Rescisão registrada na folha: '+esc(fmt(calc(w.termination_date,1)))+'</small>':'')+'</article>';
  }).join('');
  const empty=search?'Nenhum empregado corresponde à pesquisa.':
   filter==='current'?'Sem vencimentos em andamento nos relatórios disponíveis. Use Todos ou Histórico para consultar empregados.':
   filter==='soon'?'Nenhum vencimento previsto nos próximos 30 dias.':'Nenhum empregado nesta lista.';
  return head+totals+tools+(error?'<div class="gav-exp-error">'+esc(error)+'</div>':'')+
   '<div class="gav-exp-list">'+(cards||'<div class="gav-exp-empty">'+esc(empty)+'</div>')+'</div>';
 }
 function attach(root){
  root.querySelectorAll('[data-exp-action]').forEach(btn=>btn.addEventListener('click',()=>{
   if(btn.dataset.expAction==='reload')return void load();
   if(btn.dataset.expAction==='filter'){filter=btn.dataset.val;refresh()}
  }));
  root.querySelector('#gavExpSearch')?.addEventListener('input',event=>{
   search=event.target.value;
   const original=root.querySelector('.gav-exp-list');if(!original)return;
   const detached=document.createElement('div');detached.innerHTML=page();
   const next=detached.querySelector('.gav-exp-list');if(next)original.replaceWith(next);
  });
 }
 return {load,page,attach};
}