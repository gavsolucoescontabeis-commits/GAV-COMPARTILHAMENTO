# GAV Compartilhar Docs — Portal seguro

**Versão atual: v0.9.1 · Organização mensal da folha e download facilitado**

**Acesso permanente:** https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/

O projeto continua na branch `main`. Não é necessário instalar ZIP. A demonstração visual anterior (`v0.8.1`) está preservada em `?demo=1`. O ambiente real usa Supabase isolado, não o sistema Ministério Infantil.

## O que já está implementado e comprovado

- Login administrativo pelo Google **realmente utilizado e registrado** no Supabase. Um administrador foi autenticado com sucesso.
- Google Drive API/OAuth autorizados; a pasta-piloto JM Rocha foi verificada, vinculada e indexada; PDFs reais foram localizados e um arquivo original chegou a ser aberto no navegador.
- Login por CNPJ e senha desenhado para clientes; **ainda não há cliente externo habilitado**. Não é sistema de acesso público.
- RLS/isolamento por empresa e por usuário, funções protegidas `gav-portal-api`, `gav-drive-index` e `gav-drive-pdf`; leitura de PDF exige autorização no servidor e permanência dentro da pasta vinculada.
- Indexação **não publica automaticamente** arquivos descobertos. A administração pode conferir, publicar e revogar documentos individualmente.
- O banco possui as empresas TTM e os metadados da empresa piloto; os documentos continuam com status de publicação pendente.

## Nova regra definitiva — Folha de Pagamento (29/10/2026)

A aba **Folha de Pagamento** reúne todos os arquivos da pasta mensal, sem fragmentar os mesmos documentos entre Guias e Impostos e Outros: folha, recibos, eSocial, DCTFWeb, relatórios, INSS/DARF previdenciário, FGTS/guia e relatórios. A pasta mensal continua organizada por **mês/ano**, com o nome do mês em MAIÚSCULAS.

As subpastas explícitas **ADM/RES/FER** ficam separadas como Admissões, Rescisões e Férias. A categoria **Guias e Impostos** recebe tributos que não são da folha, por exemplo PIS/COFINS, IRPJ/CSLL e parcelamentos. Documentos efetivamente não classificados e materiais de outras naturezas continuam em Outros Documentos para conferência. Atenção a arquivos que possam mencionar outras empresas: conferir antes de publicar.

Essa classificação foi aplicada aos metadados já indexados e implementada na função de próximas sincronizações. Não altera ou move os PDFs no Google Drive.

## Visualização e download (v0.9.1)

Cada PDF tem dois botões visíveis: **Visualizar** e **Baixar PDF**. A prévia mostra uma mensagem de carregamento, abre o PDF original no portal e contém botões para download e abertura em outra guia. A ação de download salva o PDF com seu nome original, sem exigir visualização anterior; é adequada a anexação posterior em sistemas das construtoras.

O frontend reutiliza por curto prazo os PDFs abertos na sessão (cache limitado e esvaziado na troca de empresa/logout). A função de PDF evita renovações desnecessárias de token Google quando ainda válido e registra auditoria sem bloquear a resposta. **A velocidade real ainda precisa ser retestada pelo usuário.** O backend não usa links públicos do Google Drive.

## Arquivos

- `index.html` — entrada e identidade visual oficial, sem substituir a versão demonstrativa anterior.
- `portal.js` — autenticação e interface segura, filtros mensais, prévia e download.
- `portal-ui.css` — estilos de botões fáceis e prévia responsiva (desktop/celular).
- `backend/functions/gav-portal-api/index.ts` — identificação de usuário, permissões, pastas e aprovação de documentos.
- `backend/functions/gav-drive-index/index.ts` — classificação/sincronização real e segura.
- `backend/functions/gav-drive-pdf/index.ts` — entrega de PDF original com validação de permissão.
- `backend/SCHEMA_PILOTO_PREPARACAO.sql` — esquema inicial; alterações posteriores foram aplicadas no Supabase isolado.
- `docs/FONTE_MESTRA_GAV_COMPARTILHAMENTO.md` — referência de continuidade; instruções aditivas posteriores prevalecem sobre descrições antigas.

## Pendências de validação

1. Testar a interface v0.9.1 no navegador, especialmente download/visualização em computador e celular.
2. Conferir antes de qualquer publicação se o documento da pasta realmente pertence à empresa correspondente.
3. Concluir emissão segura de contas/senhas de clientes e testar o isolamento entre CNPJs.
4. Resolver o ciclo de renovação OAuth quando o Google Cloud estiver em estado **Testando** (credenciais offline podem expirar em sete dias) antes de abrir o uso contínuo.
5. Incorporar os demais escritórios sem liberar pastas por aproximação de nomes ou CNPJ.

**Segurança:** não incluir arquivo JSON do Google, client secret, refresh token, service role, dados de clientes ou documentos reais neste repositório público. Não cobrar serviços externos sem aprovação.

