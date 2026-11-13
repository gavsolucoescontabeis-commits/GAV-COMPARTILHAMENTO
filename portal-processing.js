/* GAV Compartilhar v0.13.25 — INSS zerado e FGTS sem guia por competência. */
export function buildProcessingPage({data,officeLabel,officePicker,processingYear,processingMonth,filter,M,esc,fmt,title}){
 const info=data||{loaded:false,companies:[],total:0,concluded:0,pending:0,withoutMovement:0};
 const entries=info.companies||[];
 const payroll=entries.filter(c=>c.serviceKey==="FOLHA");
 const parcels=entries.filter(c=>c.serviceKey==="PARCELAMENTOS");
 const active=payroll.filter(c=>c.status!=="SEM_MOVIMENTO");
 const prepared=active.filter(c=>c.evidence?.payrollReceipt&&c.evidence?.payrollReport).length;
 const missingReceipt=active.filter(c=>!c.evidence?.payrollReceipt).length;
 const missingReport=active.filter(c=>!c.evidence?.payrollReport).length;
 const obligationsPending=active.filter(c=>c.status==="PENDENTE").length;
 const filters=[
  {id:"all",name:"Todas as folhas",count:payroll.length},
  {id:"ready",name:"Recibos / Relatório Folha",count:prepared},
  {id:"receipt",name:"Falta recibo",count:missingReceipt},
  {id:"report",name:"Falta relatório",count:missingReport},
  {id:"pending",name:"Obrigações pendentes",count:obligationsPending}
 ];
 const selected=filters.some(f=>f.id===filter)?filter:"all";
 const visible=payroll.filter(c=>{
  if(selected==="all")return true;
  if(c.status==="SEM_MOVIMENTO")return false;
  if(selected==="ready")return !!(c.evidence?.payrollReceipt&&c.evidence?.payrollReport);
  if(selected==="receipt")return !c.evidence?.payrollReceipt;
  if(selected==="report")return !c.evidence?.payrollReport;
  return c.status==="PENDENTE";
 });
 // O mesmo componente visual para todos os indicadores desta tela.
 const indicator=(state,message,detail="",hint="")=>
  '<div class="gav-process-indicator is-'+state+'"'+(hint?' title="'+esc(hint)+'"':"")+'>'+
   '<strong class="gav-process-indicator-state">'+esc(message)+'</strong>'+
   '<small class="gav-process-indicator-detail">'+esc(detail)+'</small></div>';
 const mark=(doc,caption="")=>doc?
  indicator("found","✓ Encontrado",caption?caption+": "+doc.name:doc.name,doc.name):
  indicator("pending","— Pendente","Não localizado");
 const companyCell=c=>{
  const digits=String(c.cnpj||"").replace(/[^0-9]/g,"");
  const cnpj=digits.length===14?
   '<div class="gav-process-cnpj">CNPJ '+esc(fmt(digits))+
   ' <button class="gav-copy-cnpj" type="button" data-do="copy-process-cnpj" data-val="'+esc(digits)+'" title="Copiar CNPJ">Copiar</button></div>':
   '<div class="gav-process-cnpj">CNPJ não cadastrado</div>';
  return '<div class="gav-process-company"><strong>'+esc((c.code?c.code+" · ":"")+c.legalName)+'</strong>'+
   cnpj+'<small>'+esc(c.serviceLabel||"Folha")+' · '+esc(c.reason)+'</small></div>';
 };
 const statusCell=c=>{
  const done=c.status==="CONCLUIDA",inactive=c.status==="SEM_MOVIMENTO";
  const name=inactive?"Sem movimento":done?"Concluída":"Pendente";
  const action=c.serviceKey==="PARCELAMENTOS"?"":inactive?
   (c.inactivityActive?'<button type="button" class="gav-process-toggle" data-do="processing-resume" data-val="'+esc(c.id)+'">Reativar</button>':""):
   !done?'<button type="button" class="gav-process-toggle" data-do="processing-inactive" data-val="'+esc(c.id)+'">Sem movimento</button>':"";
  const state=inactive?"neutral":done?"found":"pending";
  const description=inactive?"Controle interno":done?"Documentação localizada":"Falta concluir obrigações";
  return '<div class="gav-process-result">'+indicator(state,(inactive?'○ ':done?'✓ ':'• ')+name,description)+
   action+'</div>';
 };
 const payrollCell=c=>{
  const ev=c.evidence||{},receipt=ev.payrollReceipt,report=ev.payrollReport;
  const detailHint=[
   "Recibos: "+(receipt?.name||"Não localizado"),
   "Relatório Folha: "+(report?.name||"Não localizado")
  ].join(" | ");
  if(receipt&&report)return indicator("found","✓ Encontrados","Recibos + Relatório Folha",detailHint);
  if(receipt)return indicator("pending","◐ Incompleto","Falta relatório",detailHint);
  if(report)return indicator("pending","◐ Incompleto","Faltam recibos",detailHint);
  return indicator("pending","— Pendente","Faltam recibos e relatório",detailHint);
 };
 const obligationCell=(c,kind)=>{
  const isInss=kind==="INSS",doc=c.evidence?.[isInss?"darf":"fgts"];
  const flag=!!c.obligationExceptions?.[kind]?.active;
  const inactive=c.status==="SEM_MOVIMENTO";
  const justified=isInss?"INSS zerado":"FGTS sem guia";
  const hint=isInss?"DARF de INSS zerado registrado pela GAV":"Ausência de guia FGTS registrada pela GAV";
  const status=doc?mark(doc):flag?
   indicator("justified","✓ "+justified,"Justificado · sem guia",hint):
   mark(null);
  const base=' data-do="processing-obligation" data-val="'+esc(c.id)+'" data-kind="'+kind+'"';
  const remove=flag?'<button type="button" class="gav-process-obligation-btn is-undo"'+base+
    ' data-enable="false" title="Retirar justificativa">Desfazer</button>':"";
  const add=!flag&&!doc&&!inactive?'<button type="button" class="gav-process-obligation-btn"'+base+
    ' data-enable="true">'+(isInss?"Marcar INSS zerado":"Marcar FGTS sem guia")+'</button>':"";
  return '<div class="gav-process-obligation">'+status+(remove||add)+'</div>';
 };
 const receiptGps=c=>{
  const ev=c.evidence||{};
  if(!ev.dctf&&!ev.gps)return mark(null);
  if(ev.dctf&&ev.gps)return indicator("found","✓ Encontrados","DCTFWeb + GPS",
    "DCTFWeb: "+ev.dctf.name+" | GPS: "+ev.gps.name);
  return mark(ev.dctf||ev.gps,ev.dctf?"DCTFWeb":"GPS");
 };
 const open=c=>'<div><button type="button" class="btn btn-line btn-small" data-do="pick" data-val="'+esc(c.id)+'">Abrir</button></div>';
 const folharow=c=>{
  const ev=c.evidence||{};
  return '<div class="gav-process-row gav-process-payroll-row">'+companyCell(c)+
   '<div>'+payrollCell(c)+'</div><div>'+obligationCell(c,"INSS")+'</div><div>'+obligationCell(c,"FGTS")+'</div>'+
   '<div>'+receiptGps(c)+'</div>'+statusCell(c)+open(c)+'</div>';
 };
 const parcelrow=c=>'<div class="gav-process-row gav-process-installment-row">'+companyCell(c)+
  '<div>'+mark(c.evidence?.parcelamento)+'</div>'+statusCell(c)+open(c)+'</div>';
 const years=Array.from({length:8},(_,i)=>new Date().getFullYear()+1-i);
 let html='<div class="gav-processing-workspace"><div class="gav-processing-return">'+
  '<button type="button" class="btn btn-line" data-do="processing-back">← Voltar ao painel</button>'+
  '<span>Conferência administrativa · '+esc(officeLabel())+'</span></div>';
 html+=title("Processamento — "+officeLabel(),"Folha de Pagamento e Parcelamentos, com controle independente de recibos e obrigações.");
 html+='<div class="gav-process-head">'+officePicker()+
  '<div class="gav-process-filters"><label>Ano<select class="input" id="processingYearSelect">'+
  years.map(y=>'<option value="'+y+'" '+(processingYear===y?'selected':'')+'>'+y+'</option>').join("")+
  '</select></label><label>Competência<select class="input" id="processingMonthSelect">'+
  M.map((name,i)=>'<option value="'+(i+1)+'" '+(processingMonth===i+1?'selected':'')+'>'+esc(name)+'</option>').join("")+
  '</select></label><button type="button" class="btn btn-dark btn-small" data-do="processing-refresh">Atualizar conferência</button></div></div>';
 html+='<div class="gav-process-cards gav-process-metrics">'+
  '<div class="card gav-process-card"><span class="subtle">Serviços acompanhados</span><strong>'+Number(info.total||0)+'</strong></div>'+
  '<div class="card gav-process-card is-ready"><span class="subtle">Recibos / Relatório Folha</span><strong>'+prepared+
  '<small> de '+active.length+' folhas</small></strong></div>'+
  '<div class="card gav-process-card"><span class="subtle">Obrigações concluídas</span><strong>'+Number(info.concluded||0)+'</strong></div>'+
  '<div class="card gav-process-card"><span class="subtle">Obrigações pendentes</span><strong>'+Number(info.pending||0)+'</strong></div>'+
  '<div class="card gav-process-card"><span class="subtle">Sem movimento</span><strong>'+Number(info.withoutMovement||0)+'</strong></div></div>';
 if(!info.loaded)return html+'<div class="card card-pad">Conferindo documentos indexados de '+esc(M[processingMonth-1])+'/'+processingYear+'…</div></div>';
 html+='<section class="gav-process-section"><div class="gav-process-section-head"><div>'+
  '<span class="gav-process-kicker">CONTROLE DA FOLHA</span><h2>Folha de Pagamento</h2>'+
  '<p>Recibos e relatório podem estar encontrados mesmo com obrigações ainda pendentes.</p>'+
  '</div><span class="gav-process-section-count">'+payroll.length+' empresas</span></div>';
 html+='<div class="gav-process-quickfilters" role="group" aria-label="Filtrar folhas de pagamento">'+
  filters.map(f=>'<button type="button" data-do="processing-filter" data-val="'+f.id+'" class="gav-process-filter'+
   (selected===f.id?' is-active':'')+'" aria-pressed="'+(selected===f.id)+'">'+
   esc(f.name)+' <strong>'+f.count+'</strong></button>').join("")+'</div>';
 html+='<div class="card gav-process-table gav-process-table-scroll"><div class="gav-process-row gav-process-header gav-process-payroll-row">'+
  '<span>Empresa</span><span>Recibos / Relatório Folha<small>Ambos necessários</small></span>'+
  '<span>DARF de INSS</span><span>FGTS mensal</span><span>Recibo DCTFWeb<small>ou GPS</small></span>'+
  '<span>Situação das obrigações</span><span>Abrir</span></div>'+
  (visible.length?visible.map(folharow).join(""):'<div class="gav-process-empty">Nenhuma folha nesta seleção. Escolha outro filtro ou competência.</div>')+'</div></section>';
 html+='<section class="gav-process-section gav-process-parcel-section"><div class="gav-process-section-head"><div>'+
  '<span class="gav-process-kicker">CONTROLE SEPARADO</span><h2>Parcelamentos</h2>'+
  '<p>Conferência do DARF do período, sem misturar com a Folha de Pagamento.</p>'+
  '</div><span class="gav-process-section-count">'+parcels.length+' empresas</span></div>';
 html+='<div class="card gav-process-table gav-process-table-scroll"><div class="gav-process-row gav-process-header gav-process-installment-row">'+
  '<span>Empresa</span><span>DARF de parcelamento</span><span>Situação</span><span>Abrir</span></div>'+
  (parcels.length?parcels.map(parcelrow).join(""):'<div class="gav-process-empty">Nenhum parcelamento configurado neste escritório.</div>')+'</div></section>';
 html+='<p class="gav-process-note"><strong>Conferência documental:</strong> Verde em recibos/relatório indica arquivos localizados na competência, não envio ao eSocial nem pagamento. O fechamento mantém os critérios existentes: DARF de INSS + FGTS mensal, ou recibo DCTFWeb, ou GPS; quando autorizadas pela GAV, as justificativas de INSS zerado ou FGTS sem guia substituem exclusivamente a guia correspondente na competência. Parcelamentos dependem do DARF mensal; FGTS rescisório, relatório FGTS e declaração DCTFWeb sem recibo não concluem a folha. Justificativas são controles internos, não comprovam pagamento nem envio; sem movimento é controle distinto. Dados baseados nos documentos já indexados no Drive.</p>';
 return html+'</div>';
}
