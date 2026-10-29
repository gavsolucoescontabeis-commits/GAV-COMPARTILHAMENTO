-- GAV COMPARTILHAMENTO: esquema proposto, NÃO APLICADO
-- Implementar apenas em projeto Supabase separado e autorizado, nunca no Ministério Infantil.
-- O script cria tabelas com RLS; clientes nunca podem inserir/alterar documentos ou autorizações.
-- Autorização externa do Google Drive deverá ser feita num backend/Edge Function separado.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gav_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code IN ('TTM','REL GAV','DS CONTÁBIL','AVULSOS')),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gav_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.gav_offices(id) ON DELETE RESTRICT,
  code text CHECK (code IS NULL OR code ~ '^[0-9]{1,4}$'),
  legal_name text NOT NULL CHECK (length(trim(legal_name)) > 1),
  cnpj varchar(14) NOT NULL UNIQUE CHECK (cnpj ~ '^[0-9]{14}$'),
  folder_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (office_id,code)
);
CREATE TABLE IF NOT EXISTS public.gav_admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gav_memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, company_id)
);
CREATE INDEX IF NOT EXISTS gav_memberships_company_idx ON public.gav_memberships(company_id);

CREATE TABLE IF NOT EXISTS public.gav_services (
  company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
  service_key text NOT NULL CHECK(service_key IN (
    'FOLHA','REINF','PIS','COFINS','IRPJ','CSLL','CONTABILIDADE','PGDAS','PARCELAMENTOS'
  )),
  scope_status text NOT NULL DEFAULT 'A_CONFIRMAR'
    CHECK(scope_status IN ('CONFIRMADO','A_CONFIRMAR','INATIVO')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(company_id,service_key)
);
CREATE TABLE IF NOT EXISTS public.gav_drive_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
  drive_folder_id text NOT NULL,
  drive_parent_id text,
  approved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false,
  UNIQUE (company_id,drive_folder_id)
);
CREATE INDEX IF NOT EXISTS gav_drive_folders_company_idx ON public.gav_drive_folders(company_id);

CREATE TABLE IF NOT EXISTS public.gav_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
  drive_folder_link_id uuid NOT NULL REFERENCES public.gav_drive_folders(id) ON DELETE RESTRICT,
  drive_file_id text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  relative_path text,
  category text NOT NULL DEFAULT 'OUTROS'
    CHECK (category IN ('ADMISSOES','RESCISOES','FERIAS','FOLHA','GUIAS_IMPOSTOS','OUTROS')),
  year integer CHECK(year BETWEEN 2000 AND 2100),
  month integer CHECK(month BETWEEN 1 AND 13),
  review_status text NOT NULL DEFAULT 'PENDENTE'
    CHECK(review_status IN ('PENDENTE','APROVADO','REJEITADO')),
  published_at timestamptz DEFAULT NULL,
  drive_modified_at timestamptz,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id,drive_file_id)
);
CREATE INDEX IF NOT EXISTS gav_documents_client_index
  ON public.gav_documents(company_id,published_at,year,month);
CREATE TABLE IF NOT EXISTS public.gav_service_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
  service_key text NOT NULL,
  year integer NOT NULL CHECK(year BETWEEN 2000 AND 2100),
  month integer NOT NULL CHECK(month BETWEEN 1 AND 13),
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK(status IN ('PENDENTE','EM_ANDAMENTO','PRONTA_CONFERIR','CONCLUIDA')),
  note text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id,service_key,year,month),
  FOREIGN KEY(company_id,service_key) REFERENCES public.gav_services(company_id,service_key)
);
CREATE TABLE IF NOT EXISTS public.gav_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gav_companies(id) ON DELETE CASCADE,
  state text NOT NULL CHECK(state IN ('INICIADO','CONCLUIDO','FALHOU','CANCELADO')),
  indexed_count integer NOT NULL DEFAULT 0,
  error_safe text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.gav_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.gav_companies(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.gav_documents(id) ON DELETE SET NULL,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gav_audit_company_idx ON public.gav_audit_events(company_id,occurred_at DESC);

ALTER TABLE public.gav_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_service_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gav_audit_events ENABLE ROW LEVEL SECURITY;

-- Evitar políticas genéricas "authenticated pode tudo". A API pública recebe SOMENTE SELECT.
REVOKE ALL ON TABLE public.gav_offices,public.gav_companies,public.gav_admin_users,
 public.gav_memberships,public.gav_services,public.gav_drive_folders,
 public.gav_documents,public.gav_service_progress,public.gav_sync_runs,public.gav_audit_events
 FROM anon,authenticated;
GRANT SELECT ON TABLE public.gav_offices,public.gav_companies,public.gav_admin_users,
 public.gav_memberships,public.gav_services,public.gav_drive_folders,
 public.gav_documents,public.gav_service_progress,public.gav_sync_runs,public.gav_audit_events
 TO authenticated;

-- Tabela de administradores: cada usuário só vê seu próprio vínculo.
CREATE POLICY gav_admin_self_read ON public.gav_admin_users
 FOR SELECT TO authenticated
 USING (user_id = (SELECT auth.uid()));

-- Escritórios: leitura de registros associados ao usuário, ou admin GAV.
CREATE POLICY gav_office_read ON public.gav_offices
 FOR SELECT TO authenticated
 USING (
  EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
  OR EXISTS (
    SELECT 1 FROM public.gav_companies c
    JOIN public.gav_memberships m ON m.company_id=c.id
    WHERE c.office_id=gav_offices.id AND m.user_id=(SELECT auth.uid()) AND m.active
  )
 );

-- Memberships: somente o próprio cliente e admins autorizados.
CREATE POLICY gav_membership_read ON public.gav_memberships
 FOR SELECT TO authenticated
 USING (
   user_id=(SELECT auth.uid())
   OR EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
 );

CREATE POLICY gav_company_read ON public.gav_companies
 FOR SELECT TO authenticated
 USING (
   EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
   OR EXISTS (SELECT 1 FROM public.gav_memberships m WHERE m.company_id=gav_companies.id AND m.user_id=(SELECT auth.uid()) AND m.active)
 );

-- Apenas administradores consultam vínculos de pastas, escopos e processamento.
CREATE POLICY gav_services_admin_read ON public.gav_services
 FOR SELECT TO authenticated USING (
   EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
 );
CREATE POLICY gav_drive_folders_admin_read ON public.gav_drive_folders
 FOR SELECT TO authenticated USING (
   EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
 );
CREATE POLICY gav_progress_admin_read ON public.gav_service_progress
 FOR SELECT TO authenticated USING (
   EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
 );
CREATE POLICY gav_sync_admin_read ON public.gav_sync_runs
 FOR SELECT TO authenticated USING (
   EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
 );
CREATE POLICY gav_audit_admin_read ON public.gav_audit_events
 FOR SELECT TO authenticated USING (
   EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
 );

-- Documento publicado e aprovado visível só ao cliente da empresa correspondente.
CREATE POLICY gav_docs_read ON public.gav_documents
 FOR SELECT TO authenticated
 USING (
  EXISTS (SELECT 1 FROM public.gav_admin_users a WHERE a.user_id=(SELECT auth.uid()) AND a.active)
  OR (
   published_at IS NOT NULL AND review_status='APROVADO'
   AND EXISTS (SELECT 1 FROM public.gav_memberships m
     WHERE m.company_id=gav_documents.company_id
       AND m.user_id=(SELECT auth.uid()) AND m.active)
  )
 );
COMMIT;
