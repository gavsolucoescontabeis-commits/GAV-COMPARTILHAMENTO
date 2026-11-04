
-- GAV Compartilhar: opt-in para notificações Web Push. Sem permissões diretas a usuários.
CREATE TABLE IF NOT EXISTS public.gav_push_subscriptions (
 endpoint text PRIMARY KEY CHECK (char_length(endpoint) BETWEEN 40 AND 2048),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 80 AND 160),
 auth_secret text NOT NULL CHECK (char_length(auth_secret) BETWEEN 16 AND 100),
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gav_push_subscriptions_user_idx ON public.gav_push_subscriptions(user_id) WHERE enabled;
ALTER TABLE public.gav_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gav_push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gav_push_subscriptions TO service_role;

CREATE TABLE IF NOT EXISTS public.gav_push_outbox (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
 document_id uuid NOT NULL REFERENCES public.gav_documents(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS gav_push_outbox_pending_idx ON public.gav_push_outbox(created_at,id) WHERE processed_at IS NULL;
ALTER TABLE public.gav_push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gav_push_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gav_push_outbox TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.gav_push_outbox_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.gav_push_enqueue_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.review_status = 'APROVADO' AND NEW.published_at IS NOT NULL
   AND (TG_OP = 'INSERT' OR OLD.review_status IS DISTINCT FROM 'APROVADO'
      OR OLD.published_at IS NULL)
 THEN
   INSERT INTO public.gav_push_outbox(company_id,document_id) VALUES(NEW.company_id,NEW.id);
 END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.gav_push_enqueue_published() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS gav_push_document_published ON public.gav_documents;
CREATE TRIGGER gav_push_document_published AFTER INSERT OR UPDATE ON public.gav_documents
 FOR EACH ROW EXECUTE FUNCTION public.gav_push_enqueue_published();

CREATE TABLE IF NOT EXISTS public.gav_push_vapid (
 id smallint PRIMARY KEY CHECK(id=1),
 public_key text NOT NULL,
 private_secret_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gav_push_vapid ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gav_push_vapid FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gav_push_vapid TO service_role;

-- Chave privada VAPID gerada pela Edge Function e armazenada criptografada no Vault.
CREATE OR REPLACE FUNCTION public.gav_push_init_vapid(p_public text,p_private text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE existing text; secret_id uuid;
BEGIN
 IF length(p_public) NOT BETWEEN 80 AND 120 OR length(p_private) NOT BETWEEN 40 AND 50 THEN
   RAISE EXCEPTION 'Formato de chave inválido';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(839004121);
 SELECT public_key INTO existing FROM public.gav_push_vapid WHERE id=1;
 IF existing IS NOT NULL THEN RETURN existing; END IF;
 secret_id := vault.create_secret(p_private, 'gav_push_vapid_private','Web Push VAPID GAV Compartilhar');
 INSERT INTO public.gav_push_vapid(id,public_key,private_secret_id) VALUES(1,p_public,secret_id);
 RETURN p_public;
END;$$;
REVOKE ALL ON FUNCTION public.gav_push_init_vapid(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gav_push_init_vapid(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.gav_push_read_vapid()
RETURNS TABLE(public_key text,private_key text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
 SELECT k.public_key,v.decrypted_secret
 FROM public.gav_push_vapid k
 JOIN vault.decrypted_secrets v ON v.id=k.private_secret_id WHERE k.id=1;
$$;
REVOKE ALL ON FUNCTION public.gav_push_read_vapid() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gav_push_read_vapid() TO service_role;

DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='gav_push_scheduler_token') THEN
  PERFORM vault.create_secret(encode(gen_random_bytes(32),'hex'),'gav_push_scheduler_token','Agendador Web Push GAV');
 END IF;
END$$;

CREATE OR REPLACE FUNCTION public.gav_push_valid_scheduler(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT length(p_token)=64 AND EXISTS(
 SELECT 1 FROM vault.decrypted_secrets
 WHERE name='gav_push_scheduler_token' AND decrypted_secret=p_token);
$$;
REVOKE ALL ON FUNCTION public.gav_push_valid_scheduler(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gav_push_valid_scheduler(text) TO service_role;

-- Consulta automática posterior à sincronização, sem interferir nos ciclos já aprovados.
SELECT cron.schedule('gav-push-notify-5m','2-59/5 * * * *',$cron$
 SELECT net.http_post(
  url:='https://kiunegfjbfhvvlkxqvos.supabase.co/functions/v1/gav-push',
  headers:=jsonb_build_object(
   'Content-Type','application/json',
   'x-gav-internal-token',
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='gav_push_scheduler_token')
  ),
  body:='{"action":"dispatch"}'::jsonb,
  timeout_milliseconds:=20000
 );
$cron$);
