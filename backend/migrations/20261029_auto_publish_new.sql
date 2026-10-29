-- GAV Compartilhamento — liberação automática de arquivos NOVOS
-- Aplicado no Supabase isolado em 29/10/2026.
alter table public.gav_drive_folders
  add column if not exists auto_publish_new boolean not null default false;
comment on column public.gav_drive_folders.auto_publish_new is
  'Novos arquivos indexados podem ser publicados automaticamente após autorização administrativa da pasta.';
-- Ative auto_publish_new=true somente em empresas cuja pasta foi
-- conferida e vinculada. Não incluir CNPJ/IDs de clientes no GitHub público.
-- Status review_status = BLOQUEADO impede republicação automática
-- de arquivos que a administração decidiu ocultar.
-- Publicação automática nunca retroage aos arquivos antigos pendentes.
