-- GAV Compartilhar: cadastro transacional e código exclusivo entre empresas ATIVAS.

ALTER TABLE public.gav_companies DROP CONSTRAINT IF EXISTS gav_companies_office_id_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS gav_companies_active_office_code_unique ON public.gav_companies(office_id,code) WHERE is_active=true AND code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.gav_save_company_with_folder(p_actor_id uuid, p_office_id uuid, p_company_id uuid, p_cnpj text, p_legal_name text, p_code text, p_folder_id text, p_folder_label text, p_folder_parent_id text, p_allocations_enabled boolean, p_payroll_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_office public.gav_offices%ROWTYPE;
 v_company public.gav_companies%ROWTYPE;
 v_id uuid;
 v_created boolean := false;
 v_linked boolean := false;
 v_link public.gav_drive_folders%ROWTYPE;
 v_another uuid;
BEGIN
 IF p_actor_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.gav_admin_users WHERE user_id=p_actor_id AND active=true
 ) THEN RAISE EXCEPTION 'Administrador GAV não autorizado.'; END IF;

 SELECT * INTO v_office FROM public.gav_offices WHERE id=p_office_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escritório não localizado.'; END IF;
 IF length(trim(coalesce(p_legal_name,'')))<2 OR length(p_legal_name)>180 THEN
  RAISE EXCEPTION 'Razão social/nome inválido.'; END IF;
 IF coalesce(p_cnpj,'')!~'^[0-9]{14}$' THEN RAISE EXCEPTION 'CNPJ inválido.'; END IF;
 IF p_code IS NOT NULL AND p_code!~'^[0-9]{1,4}$' THEN
  RAISE EXCEPTION 'Código da empresa inválido.'; END IF;
 IF coalesce(p_allocations_enabled,false) AND v_office.code<>'TTM' THEN
  RAISE EXCEPTION 'Alocações disponíveis somente na carteira TTM.'; END IF;
 IF p_folder_id IS NOT NULL AND (p_folder_label IS NULL OR p_folder_parent_id IS NULL) THEN
  RAISE EXCEPTION 'A pasta precisa ser validada no Google Drive antes de salvar.'; END IF;

 IF p_company_id IS NOT NULL THEN
  SELECT * INTO v_company FROM public.gav_companies
   WHERE id=p_company_id AND office_id=p_office_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada neste escritório.'; END IF;
  IF v_company.is_active=false THEN RAISE EXCEPTION 'Cadastro desativado. Reative pela tela específica.'; END IF;
 ELSE
  -- Repetição do Salvar após timeout não deve criar empresa duplicada.
  SELECT * INTO v_company FROM public.gav_companies WHERE cnpj=p_cnpj FOR UPDATE;
  IF FOUND THEN
   IF v_company.office_id<>p_office_id OR NOT v_company.is_active THEN
    RAISE EXCEPTION 'CNPJ já pertence a outro cadastro. Confira antes de prosseguir.'; END IF;
   IF p_folder_id IS NOT NULL AND v_company.folder_label IS NOT NULL
      AND v_company.folder_label<>p_folder_label THEN
    RAISE EXCEPTION 'Este CNPJ já está cadastrado com outra pasta. Abra o cadastro existente.'; END IF;
  ELSE
   INSERT INTO public.gav_companies(office_id,cnpj,legal_name,code,folder_label,is_active,allocations_enabled)
   VALUES(p_office_id,p_cnpj,p_legal_name,p_code,p_folder_label,true,coalesce(p_allocations_enabled,false))
   RETURNING * INTO v_company;
   v_created:=true;
  END IF;
 END IF;
 v_id:=v_company.id;

 IF p_code IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.gav_companies
   WHERE office_id=p_office_id AND code=p_code AND is_active=true AND id<>v_id
 ) THEN
  RAISE EXCEPTION 'Este código já está em uso por outra empresa ATIVA do escritório.'; END IF;
 IF EXISTS(SELECT 1 FROM public.gav_companies WHERE cnpj=p_cnpj AND id<>v_id) THEN
  RAISE EXCEPTION 'Este CNPJ já está cadastrado em outra empresa.'; END IF;

 SELECT * INTO v_link FROM public.gav_drive_folders
 WHERE company_id=v_id AND is_active=true FOR UPDATE;
 IF FOUND AND p_folder_id IS NOT NULL AND v_link.drive_folder_id<>p_folder_id THEN
  RAISE EXCEPTION 'Empresa já vinculada a outra pasta. Confira o vínculo existente.'; END IF;
 IF p_folder_id IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.gav_drive_folders
  WHERE drive_folder_id=p_folder_id AND is_active=true AND company_id<>v_id
 ) THEN RAISE EXCEPTION 'Pasta do Drive já vinculada a outra empresa.'; END IF;

 UPDATE public.gav_companies SET cnpj=p_cnpj,legal_name=p_legal_name,code=p_code,
  folder_label=coalesce(p_folder_label,folder_label),
  allocations_enabled=coalesce(p_allocations_enabled,false)
 WHERE id=v_id;

 IF p_folder_id IS NOT NULL THEN
  INSERT INTO public.gav_drive_candidates(company_id,folder_id,expected_parent_id,label,verified_at)
  VALUES(v_id,p_folder_id,p_folder_parent_id,p_folder_label,now())
  ON CONFLICT(company_id) DO UPDATE SET folder_id=EXCLUDED.folder_id,
   expected_parent_id=EXCLUDED.expected_parent_id,label=EXCLUDED.label,verified_at=EXCLUDED.verified_at;
  IF NOT EXISTS(SELECT 1 FROM public.gav_drive_folders
    WHERE company_id=v_id AND drive_folder_id=p_folder_id AND is_active=true) THEN
   INSERT INTO public.gav_drive_folders(company_id,drive_folder_id,drive_parent_id,
    approved_by,is_active,auto_publish_new)
   VALUES(v_id,p_folder_id,p_folder_parent_id,p_actor_id,true,false);
   v_linked:=true;
  END IF;
 END IF;

 -- Folha confirmada: o cadastro participa imediatamente do Controle de Processamento.
 INSERT INTO public.gav_services(company_id,service_key,scope_status)
 VALUES(v_id,'FOLHA',CASE WHEN coalesce(p_payroll_enabled,false) THEN 'CONFIRMADO' ELSE 'A_CONFIRMAR' END)
 ON CONFLICT(company_id,service_key) DO UPDATE
  SET scope_status=EXCLUDED.scope_status,updated_at=now();

 INSERT INTO public.gav_audit_events(actor_user_id,company_id,action)
 VALUES(p_actor_id,v_id,
  CASE WHEN v_created THEN 'COMPANY_CREATED'
       WHEN v_linked THEN 'COMPANY_FOLDER_LINKED'
       ELSE 'COMPANY_UPDATED' END);

 RETURN jsonb_build_object('ok',true,'companyId',v_id,'created',v_created,
  'linked',v_linked,'payrollEnabled',coalesce(p_payroll_enabled,false));
END
$function$
;

REVOKE ALL ON FUNCTION public.gav_save_company_with_folder(uuid,uuid,uuid,text,text,text,text,text,text,boolean,boolean) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.gav_save_company_with_folder(uuid,uuid,uuid,text,text,text,text,text,text,boolean,boolean) TO service_role;

NOTIFY pgrst, 'reload schema';
