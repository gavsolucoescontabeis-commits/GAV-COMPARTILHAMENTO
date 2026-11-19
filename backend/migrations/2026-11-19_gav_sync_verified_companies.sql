-- GAV Compartilhar: a sincronização de documentos é separada da publicação para clientes.
-- Pastas vinculadas e verificadas são indexadas automaticamente mesmo que
-- auto_publish_new=false; somente auto_publish_new=true publica novos arquivos.
DO $body$
DECLARE current_command text;
DECLARE old_part text :=
 'from (select distinct company_id from public.gav_drive_folders where is_active=true and auto_publish_new=true) as folders;';
DECLARE new_part text :=
 'from (select distinct f.company_id from public.gav_drive_folders f join public.gav_companies c on c.id=f.company_id where f.is_active=true and c.is_active=true and (f.auto_publish_new=true or exists(select 1 from public.gav_drive_candidates v where v.company_id=f.company_id and v.verified_at is not null))) as folders;';
BEGIN
 SELECT command INTO current_command FROM cron.job
 WHERE jobid=1 AND jobname='gav-drive-pilot-sync-15m';
 IF current_command IS NULL THEN RAISE EXCEPTION 'Agendamento não localizado.'; END IF;
 IF position(new_part IN current_command)>0 THEN RETURN; END IF;
 IF position(old_part IN current_command)=0 THEN
  RAISE EXCEPTION 'A definição do agendamento mudou: revisar antes de aplicar.';
 END IF;
 PERFORM cron.alter_job(1,command=>replace(current_command,old_part,new_part));
END $body$;
