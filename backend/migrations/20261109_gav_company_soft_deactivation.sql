-- Desativação reversível de empresas no GAV Compartilhar Docs.
-- A Edge Function gav-company-admin valida o administrador antes de chamar a RPC.
CREATE OR REPLACE FUNCTION public.gav_admin_set_company_active(
 p_company_id uuid, p_office_id uuid, p_actor_user_id uuid, p_active boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_company public.gav_companies%ROWTYPE;
 v_links integer;
 v_members integer := 0;
BEGIN
 IF p_actor_user_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.gav_admin_users WHERE user_id=p_actor_user_id AND active=true
 ) THEN RAISE EXCEPTION 'Administrador não autorizado.'; END IF;
 SELECT c.* INTO v_company FROM public.gav_companies c
 WHERE c.id=p_company_id AND c.office_id=p_office_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada neste escritório.'; END IF;
 IF v_company.is_active=p_active THEN
  RETURN jsonb_build_object('ok',true,'changed',false,'active',p_active,'companyId',p_company_id);
 END IF;
 IF p_active THEN
  SELECT count(*) INTO v_links FROM public.gav_drive_folders WHERE company_id=p_company_id;
  IF v_links>1 THEN RAISE EXCEPTION 'Empresa com múltiplas pastas. Faça a conferência antes de reativar.'; END IF;
  IF EXISTS (
   SELECT 1 FROM public.gav_drive_folders own
   JOIN public.gav_drive_folders other
     ON other.drive_folder_id=own.drive_folder_id
    AND other.company_id<>own.company_id AND other.is_active=true
   WHERE own.company_id=p_company_id
  ) THEN RAISE EXCEPTION 'A pasta desta empresa está vinculada a outro cadastro.'; END IF;
  UPDATE public.gav_companies SET is_active=true WHERE id=p_company_id;
  UPDATE public.gav_drive_folders SET is_active=true WHERE company_id=p_company_id;
  -- Clientes não são reativados automaticamente.
 ELSE
  UPDATE public.gav_drive_folders SET is_active=false WHERE company_id=p_company_id;
  UPDATE public.gav_memberships SET active=false WHERE company_id=p_company_id AND active=true;
  GET DIAGNOSTICS v_members = ROW_COUNT;
  UPDATE public.gav_companies SET is_active=false WHERE id=p_company_id;
 END IF;
 INSERT INTO public.gav_audit_events(actor_user_id,company_id,action)
 VALUES(p_actor_user_id,p_company_id,
   CASE WHEN p_active THEN 'COMPANY_REACTIVATED' ELSE 'COMPANY_DEACTIVATED' END);
 RETURN jsonb_build_object('ok',true,'changed',true,'active',p_active,
   'companyId',p_company_id,'clientAccessRevoked',v_members);
END;
$$;
REVOKE ALL ON FUNCTION public.gav_admin_set_company_active(uuid,uuid,uuid,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gav_admin_set_company_active(uuid,uuid,uuid,boolean) TO service_role;
