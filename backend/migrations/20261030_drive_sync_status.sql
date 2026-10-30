-- GAV Compartilhamento: estado persistente de indexação por pasta vinculada.
-- Já aplicado no Supabase isolado em 30/10/2026.
-- Documento de referência; não executar novamente sem conferir o ambiente.
alter table public.gav_drive_folders
 add column if not exists last_synced_at timestamptz null,
 add column if not exists last_indexed_count integer not null default 0;

-- A importação inicial só começa após o vínculo verificado com a pasta correta.
-- Novas pastas iniciam com auto_publish_new=false. Os arquivos indexados
-- permanecem pendentes até a conferência do administrador.
-- Após a primeira importação e revisão, a administração pode habilitar
-- auto_publish_new=true para os arquivos criados em sincronizações futuras.
-- Bloqueios manuais e removidos devem continuar ocultos.
