-- GAV Compartilhar: justificativas administrativas independentes para INSS e FGTS.
CREATE TABLE IF NOT EXISTS public.gav_processing_obligation_exceptions (
 company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
 year integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
 month integer NOT NULL CHECK (month BETWEEN 1 AND 13),
 obligation text NOT NULL CHECK (obligation IN ('INSS','FGTS')),
 reason text NOT NULL CHECK (
  (obligation='INSS' AND reason='DARF_ZERADO') OR
  (obligation='FGTS' AND reason='SEM_GUIA')
 ),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES auth.users(id),
 PRIMARY KEY(company_id,year,month,obligation)
);
CREATE INDEX IF NOT EXISTS gav_processing_obligation_exceptions_competence
 ON public.gav_processing_obligation_exceptions(year,month,company_id) WHERE active=true;
ALTER TABLE public.gav_processing_obligation_exceptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gav_processing_obligation_exceptions FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gav_processing_obligation_exceptions TO service_role;
COMMENT ON TABLE public.gav_processing_obligation_exceptions IS
 'Justificativas manuais por empresa e competencia para DARF INSS zerado ou FGTS sem guia; nao equivalem a pagamento nem transmissao.';
