-- Cópia da migração aplicada no Supabase em 03/11/2026; não contém dados de clientes.
CREATE TABLE IF NOT EXISTS public.gav_processing_inactivity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL,
 service_key text NOT NULL,
 start_year integer NOT NULL CHECK (start_year BETWEEN 2020 AND 2100),
 start_month integer NOT NULL CHECK (start_month BETWEEN 1 AND 13),
 end_year integer CHECK (end_year BETWEEN 2020 AND 2100),
 end_month integer CHECK (end_month BETWEEN 1 AND 13),
 note text NOT NULL DEFAULT 'Sem movimento informado pela administração GAV',
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 ended_by uuid REFERENCES auth.users(id),
 ended_at timestamptz,
 CONSTRAINT gav_processing_inactivity_service_fk FOREIGN KEY(company_id,service_key) REFERENCES public.gav_services(company_id,service_key),
 CONSTRAINT gav_processing_inactivity_end_check CHECK ((end_year IS NULL AND end_month IS NULL AND ended_by IS NULL AND ended_at IS NULL) OR (end_year IS NOT NULL AND end_month IS NOT NULL AND ended_by IS NOT NULL AND ended_at IS NOT NULL AND (end_year*13+end_month)>=(start_year*13+start_month)))
);
CREATE UNIQUE INDEX IF NOT EXISTS gav_processing_inactivity_active_one ON public.gav_processing_inactivity(company_id,service_key) WHERE end_year IS NULL;
CREATE INDEX IF NOT EXISTS gav_processing_inactivity_lookup ON public.gav_processing_inactivity(company_id,service_key,start_year,start_month);
ALTER TABLE public.gav_processing_inactivity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gav_processing_inactivity FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.gav_processing_inactivity TO service_role;
