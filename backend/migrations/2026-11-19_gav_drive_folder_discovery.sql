-- GAV Compartilhar Docs: descoberta automática e segura de pastas (19/11/2026).
-- Não cria empresas nem libera arquivos. Guardar só metadados de pasta-raiz.
CREATE TABLE IF NOT EXISTS public.gav_drive_discovered_folders (
 office_id uuid NOT NULL REFERENCES public.gav_offices(id) ON DELETE CASCADE,
 drive_folder_id text NOT NULL CHECK(length(drive_folder_id) BETWEEN 8 AND 256),
 folder_name text NOT NULL CHECK(length(folder_name) BETWEEN 1 AND 500),
 is_present boolean NOT NULL DEFAULT true,
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (office_id,drive_folder_id)
);
CREATE TABLE IF NOT EXISTS public.gav_drive_discovery_status (
 office_id uuid PRIMARY KEY REFERENCES public.gav_offices(id) ON DELETE CASCADE,
 last_success_at timestamptz,
 last_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_error text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gav_drive_discovered_folders_office_present
 ON public.gav_drive_discovered_folders(office_id,is_present,folder_name);
ALTER TABLE public.gav_drive_discovered_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_drive_discovery_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gav_drive_discovered_folders FROM public,anon,authenticated;
REVOKE ALL ON public.gav_drive_discovery_status FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gav_drive_discovered_folders TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gav_drive_discovery_status TO service_role;
COMMENT ON TABLE public.gav_drive_discovered_folders IS
 'Cache da descoberta de pastas raiz, por escritório, sem criar empresa nem publicar documentos.';
COMMENT ON TABLE public.gav_drive_discovery_status IS
 'Última tentativa e última descoberta completa por escritório. Erros preservam o cache anterior.';

-- Job já instalado no Supabase (jobid 6). Guardar definição para reconstrução.
-- Execução: a cada 5 minutos, somente por token interno existente no Vault.
DO $do$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='gav-drive-folder-discovery-5m') THEN
  PERFORM cron.schedule('gav-drive-folder-discovery-5m','*/5 * * * *',
    $cron$
    SELECT net.http_post(
      url:='https://kiunegfjbfhvvlkxqvos.supabase.co/functions/v1/gav-folder-watch',
      headers:=jsonb_build_object(
       'Content-Type','application/json',
       'Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gav_drive_autosync_anon_jwt' LIMIT 1),
       'apikey',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gav_drive_autosync_anon_jwt' LIMIT 1),
       'x-gav-internal-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gav_drive_autosync_token' LIMIT 1)
      ),
      body:='{"action":"scan"}'::jsonb,
      timeout_milliseconds:=120000
    );
    $cron$);
 END IF;
END;
$do$;