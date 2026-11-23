-- Portal GAV: datas de admissão e marcos de contrato de experiência por empresa.
CREATE TABLE IF NOT EXISTS public.gav_employee_experience (
 company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
 employee_code text NOT NULL CHECK(length(employee_code) BETWEEN 3 AND 24),
 employee_name text NOT NULL CHECK(length(trim(employee_name)) BETWEEN 2 AND 180),
 job_title text,
 admission_date date NOT NULL,
 termination_date date,
 source_document_id uuid REFERENCES public.gav_documents(id) ON DELETE SET NULL,
 source_year integer NOT NULL CHECK(source_year BETWEEN 2020 AND 2100),
 source_month integer NOT NULL CHECK(source_month BETWEEN 1 AND 13),
 first_days smallint NOT NULL DEFAULT 45 CHECK(first_days BETWEEN 1 AND 90),
 second_days smallint NOT NULL DEFAULT 45 CHECK(second_days BETWEEN 0 AND 89),
 contract_status text NOT NULL DEFAULT 'NAO_CONFIRMADO' CHECK(contract_status IN ('NAO_CONFIRMADO','CONFIRMADO','NAO_APLICAVEL')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,employee_code),
 CONSTRAINT gav_experience_limit CHECK(first_days+second_days<=90),
 CONSTRAINT gav_experience_termination CHECK(termination_date IS NULL OR termination_date>=admission_date)
);
CREATE INDEX IF NOT EXISTS gav_experience_company_admission_idx ON public.gav_employee_experience(company_id,admission_date DESC);
ALTER TABLE public.gav_employee_experience ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gav_employee_experience FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gav_employee_experience TO service_role;
COMMENT ON TABLE public.gav_employee_experience IS
 'Admissões extraídas de folha, por empresa; 45+45 referenciais até contrato individual confirmado, cliente somente via Edge Function.';