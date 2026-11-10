-- Migração aplicada em 10/11/2026 ao Supabase exclusivo do GAV Compartilhar.
ALTER TABLE public.gav_companies ADD COLUMN IF NOT EXISTS allocations_enabled boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.gav_companies.allocations_enabled IS 'Habilita Alocações somente por escolha administrativa na carteira TTM, preservando dados existentes ao desativar.';
