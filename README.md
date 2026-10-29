# GAV Compartilhamento · Portal de documentos

**Versão atual: v0.9.0 (piloto de autenticação e Google Drive)**

Portal: https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/

A demonstração visual anterior (v0.8.1, sem autenticação real) foi **preservada**, acessível acrescentando `?demo=1` à URL do portal. As configurações novas foram implementadas de forma aditiva, sem reutilizar o banco do Ministério Infantil.

## Estado real em 29/10/2026

- Banco Supabase isolado `kiunegfjbfhvvlkxqvos`, com 18 empresas TTM e RLS habilitada.
- Login Google de administrador e login CNPJ/senha de clientes programados no `portal.js`. O login só deve ser considerado validado após o primeiro teste de autorização, pois não existiam usuários em `auth.users` quando o código foi enviado.
- Administrador GAV validado por conta Google verificada e vinculada no servidor, não por senha/chave fictícia.
- Funções Supabase implantadas e ativas, com verificação JWT: `gav-portal-api`, `gav-drive-index`, `gav-drive-pdf`.
- Pasta piloto de JM Rocha previamente identificada no banco privado. A vinculação exige confirmar o nome e parentesco com a pasta TTM usando a API real do Google Drive.
- Indexação lê os metadados reais dos PDFs e não publica nenhum automaticamente. A administração pode publicar ou revogar cada documento.
- A função que entrega o PDF confere vínculo da empresa, aprovação, pasta ativa e pertença atual do arquivo à hierarquia autorizada antes de transferir o arquivo original.
- **Nenhum documento real foi sincronizado ou publicado** até o momento; o acesso de clientes ainda não foi liberado.
- Segredos OAuth de leitura permanente precisam ser cadastrados no painel Supabase em *Edge Functions > Secrets*: `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET`, retirados do JSON **privado** gerado no Google Cloud. Nunca enviar o JSON ou os segredos ao GitHub.
- O status *Testando* no Google Cloud geralmente limita refresh tokens com escopo do Drive a 7 dias. Não usar como integração permanente de clientes sem uma estratégia de publicação/verificação e tratamento de expiração.

## Arquivos e serviços

- `index.html` — identidade visual anterior mantida; entrada para módulo autenticado.
- `portal.js` — interface em produção, autenticação e painel de revisão.
- `backend/SCHEMA_PILOTO_PREPARACAO.sql` — esquema original aplicado no Supabase.
- `backend/functions/gav-portal-api/index.ts` e `backend/functions/gav-drive-pdf/index.ts` — cópias versionadas das funções implantadas.
- `gav-drive-index` — rotina implantada no Supabase, versão ainda não espelhada no repositório.
- `docs/FONTE_MESTRA_GAV_COMPARTILHAMENTO.md` — continuidade do projeto sem detalhes privados.

## Segurança e limitações

Não publicar CNPJs, arquivos de clientes, tokens OAuth, chaves Google, `service_role` ou URLs privadas no repositório público. Não tratar arquivos do Drive como públicos por possuir link. Os clientes devem ter vínculos de empresa explícitos e os PDFs precisam de aprovação individual.

O portal está em **piloto técnico**. Falta testar o primeiro login real, confirmar autorização Drive e credenciais secretas, indexar os PDFs da empresa piloto, testar a abertura do PDF e habilitar uma conta de cliente real antes de ampliar o uso.
