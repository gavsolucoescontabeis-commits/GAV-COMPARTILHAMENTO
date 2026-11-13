# GAV Compartilhar Docs — Portal seguro

**Versão atual: v0.13.26 · Indicadores de INSS/FGTS clicáveis e verdes**

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


## Mudanças de 29/10/2026 — v0.9.4

- Menu redundante **Documentos** retirado. O acesso é por **Início → categoria → competência**. O botão **Voltar** retorna ao Início.
- Leão institucional da GAV movido da área com o nome da empresa cliente para a **barra lateral**, abaixo da navegação.
- Na tela de categoria, a ação **Publicar pasta inteira** está agora **no lado direito do cabeçalho do mês**. Se todos os arquivos estiverem liberados, o mesmo botão vira **Revogar pasta inteira**, sem botão duplicado em outra linha.
- **Publicação automática de novos arquivos:** o registro `gav_drive_folders.auto_publish_new` está ativado apenas para a pasta-piloto aprovada. Arquivos novos indexados entram como `APROVADO` + `published_at` preenchido. Um arquivo revogado pela GAV recebe `BLOQUEADO`, e a sincronização **não** o republica.
- **Sem publicação retroativa:** o acervo indexado antes da mudança continua com as autorizações anteriores. A GAV poderá liberar um mês de cada vez, se necessário, após conferência.
- **Exclusões:** ao verificar que um arquivo existente foi removido/movido para fora da pasta vinculada, a sincronização o marca como `REMOVIDO` e revoga acesso; a API deixa de exibi-lo.
- **Sincronização quando o administrador estiver usando o portal:** verificação automática ao abrir a sessão GAV e, enquanto a aba estiver aberta, a cada 15 minutos; existe botão de verificação imediata. **Agora existe agendamento servidor a cada 15 minutos**, com credenciais armazenadas no Supabase Vault e chamada autenticada protegida, mesmo que o painel GAV esteja fechado. A primeira chamada teste foi recebida com HTTP 200. Não é sincronização instantânea; depende da cópia dos arquivos no Google Drive e do próximo ciclo de leitura.
- **Não confundir autorização do documento com habilitação do login do cliente:** o piloto continua sem credenciais de clientes externos.

**Nota de implantação:** Supabase Auth, RLS e Edge Functions continuam com verificação de permissão. O `pg_cron` e o `pg_net` chamam `gav-drive-index` com autenticação por JWT anon legado e segredo interno separado armazenados no Supabase Vault; `verify_jwt=true` permanece habilitado, e o token interno é validado em função RPC concedida somente ao `service_role`. O job `gav-drive-pilot-sync-15m` se aplica apenas às empresas com pasta ativa e `auto_publish_new=true`. Nunca colocar tokens do Vault ou chaves de serviço neste repositório público.

## Ajustes da v0.9.5

- Todos os botões de transferência mostram somente **Baixar** (PDF ou imagem), mantendo o texto alinhado.
- Verificação automática do Drive no servidor a cada 15 minutos usando `pg_cron` e `pg_net`; o cron consulta somente empresas habilitadas com `auto_publish_new=true`.
- Teste técnico da chamada programada simulada: **HTTP 200**, 400 arquivos encontrados em 45 subpastas no piloto, nenhum arquivo novo nessa rodada, nenhuma remoção. Há 355 PDFs e 45 JPGs no índice, e os JPGs novos foram publicados automaticamente.
- A cada novo arquivo, a indexação já grava o documento como aprovado e publicado para a empresa autorizada; **Revogar** marca bloqueio persistente. Documento já removido da pasta é ocultado na próxima indexação.
- Para proteger históricos que já existiam antes dessa política, a publicação em massa do acervo antigo ainda não foi realizada; a administração pode liberar uma competência de cada vez.
- A atualização depende da sincronização local do Google Drive com a nuvem e da validade da autorização offline. Uma configuração OAuth em modo `Testando` pode exigir renovação do consentimento.

**Estado importante:** o download pelo navegador e a navegação dos clientes finais ainda necessitam de teste prático. Nenhuma conta cliente foi criada neste piloto.


## Ajustes de 30/10/2026
A barra lateral GAV permanece fixa durante a rolagem no computador. O administrador dispõe de **Ver como o cliente**, mostrando somente documentos aprovados e publicados, sem criar uma conta. Para teste real, o painel também permite gerar e desativar credenciais temporárias para a JM Rocha, após confirmação explícita; nenhum usuário é gerado automaticamente. O teste verdadeiro de login ainda depende da execução no navegador. Novos arquivos continuam sendo liberados automaticamente na próxima sincronização, enquanto o histórico pendente precisa de conferência.

## Implementação de 30/10/2026 — v0.10.1

**Download múltiplo:** quadradinho ao lado de cada documento; **Marcar todos** seleciona os arquivos **da página atual** (60 por página), com filtros de competência e botões Anterior/Próximos. **Baixar selecionados** gera um único ZIP com pastas por categoria e competência, mantendo os documentos originais PDF/JPG/PNG/WebP. Limites por lote: até 60 arquivos e 180 MB, para evitar travamentos. A biblioteca `fflate@0.8.3` é carregada somente durante a operação, e cada arquivo continua sujeito à autorização individual no backend. Validação sintática feita; teste prático completo no navegador ainda necessário.

**Expansão TTM:** as 18 empresas estavam cadastradas no Supabase. A consulta ao Drive confirmou a existência de 18 pastas com nomes **exatamente iguais** aos `folder_label` existentes, sob a raiz aprovada. Foi criada a Edge Function protegida `gav-folder-expand`, com conferência e botão administrativo **Conferir e vincular pastas da TTM**. O botão vincula apenas correspondências exatas, com pasta diretamente contida na raiz autorizada. A nova associação **não publica os documentos antigos**. No momento da implantação do código, apenas a JM Rocha já tinha o vínculo no banco; as demais empresas **aguardavam o acionamento do botão administrativo**. Nunca afirmar que todas já foram importadas sem conferir o estado atual.

**Indexação inicial:** job `gav-drive-initial-import-5m` foi ativado no Supabase; a cada cinco minutos procura uma pasta vinculada e verificada sem importação concluída e solicita uma indexação autenticada. O job não fica varrendo a raiz inteira de 97 mil arquivos: processa cada pasta de empresa individualmente. Cada pasta mantém `last_synced_at` e `last_indexed_count` no banco. A função `gav-drive-index` passou a inserir metadados em lotes para reduzir custos de consultas. O limite técnico atual é até 6 mil documentos e 700 subpastas por empresa em uma única execução; erros e empresas acima desse limite precisam de uma solução incremental própria antes de declarar importação completa. Não mover ou renomear arquivos no Google Drive.

**Publicação:** importações iniciais das demais empresas entram como **pendentes**, até a GAV conferir o acervo. Existe a opção administrativa **Liberar histórico após conferência**; a confirmação exige a empresa correta. O botão **Ativar novos automáticos**, disponível após a primeira sincronização concluída, habilita a publicação automática de documentos **futuros**. Documentos bloqueados ou excluídos continuam bloqueados. O cron normal `gav-drive-pilot-sync-15m` faz sincronizações de empresas autorizadas com `auto_publish_new=true`.

**Teste de clientes:** todas as empresas vinculadas podem ter um **login temporário de teste** criado pelo administrador por ação confirmada no painel. A credencial é específica para cada CNPJ, gera senha forte no servidor, não dá acesso às outras empresas e pode ser desativada. A opção **Ver como o cliente** permite prévia filtrada sem criar usuário. Os clientes externos não receberam credenciais automaticamente.

**Escopo:** expansão desta fase é a carteira TTM já cadastrada. As carteiras DS CONTÁBIL, REL GAV e AVULSOS não podem ser liberadas por nomes aproximados: exigem cadastro e revisão de CNPJ e pasta, conservando o isolamento por escritório.

**Segurança:** este repositório é público. Não inserir IDs de pastas privadas, CNPJs de clientes, tokens Vault, refresh tokens ou arquivos reais neste README. O backend guarda apenas metadados necessários e valida autorização a cada download.

## Ajustes de 30/10/2026 — v0.10.2

- **ZIP sem subpastas:** a exportação múltipla contém PDFs e imagens diretamente na raiz do ZIP, sem repetir categorias, ano e mês que o usuário já selecionou no portal. Em caso de nomes iguais, adicionar ` (2)`, ` (3)`, etc. antes da extensão para preservar todos os arquivos originais. Limites anteriores de 60 arquivos/180 MB permanecem; download individual, filtro por competência e permissões do servidor preservados.
- **Separação por escritório (admin):** a API `gav-portal-api` entrega `offices` ao administrador autenticado, da tabela `gav_offices`, sem enviar essa listagem aos clientes. A interface inclui item lateral **Escritórios**, cards para escolher o escritório, seleção de **Escritório** antes de **Empresa**, listagem de empresas restrita ao escritório selecionado e seção Google Drive igualmente filtrada.
- Os escritórios registrados são TTM (18 empresas), DS CONTÁBIL, REL GAV e AVULSOS (estes três atualmente sem empresas vinculadas). A seleção vazia exibe orientação, sem herdar empresa de outro escritório. O escritório selecionado fica na sessão do navegador e é limpo ao sair.
- **Atenção:** esta implementação organiza as empresas já cadastradas; não importa pastas dos três escritórios vazios nem cria CNPJs desconhecidos. A carteira TTM conserva seu fluxo de sincronização no servidor e o botão de vincular pastas TTM aparece somente no contexto TTM.
- **Não regressão:** o cliente continua enxergando somente sua empresa, sem lista de escritórios; barra lateral preta/dourada, leão GAV, publicação automática das pastas aprovadas, prévia e botão de baixar permanecem iguais.

Validação técnica: sintaxe JS verificada, quatro cartões de escritório renderizados em teste isolado, ZIP plano testado logicamente com nomes repetidos. Navegação e download reais ainda requerem teste em navegador.


## Estado de continuidade — 03/11/2026 · v0.13.8

A v0.13.6 implementou preferência de filtros pelo ano atual e mês anterior conforme os documentos presentes, com seleção manual de outras competências, e impediu redesenho da tela durante sincronização. O 13º permanece na pasta `132026`, sem alterar sincronização. A v0.13.7 já havia incluído o agrupamento de GPS com recibos DCTFWeb no processamento.

Nesta v0.13.8, as referências a ícones PNG inexistentes no manifesto foram corrigidas: ícones SVG quadrados 192/512 baseados diretamente na arte original do leão (sem redesenho) mais PNG original de 160 px como alternativa. O registro do service worker ocorre cedo, antes da importação assíncrona do frontend. Links de favicon e Apple icon passaram a apontar para imagens existentes. **O Chrome ainda requer teste prático de instalação real.** Não houve alteração de documentos, permissões, sincronização Drive, dados, interface aprovada ou processamento.


## v0.13.9 — Atualização do aplicativo instalado sem reinstalar

O GAV Compartilhamento é um PWA e mantém o mesmo endereço HTTPS e identidade de instalação. Ao abrir novamente ele deve carregar a versão atual pela rede, sem precisar baixar arquivos ou reinstalar. O service worker agora usa navegação com `cache: no-store`, sem armazenar PDFs, tokens ou dados do usuário. Os módulos e estilos receberam identificadores de versão para evitar respostas antigas de cache.

O módulo exibe sua **versão real** na barra lateral e no cabeçalho. O arquivo estático `version.json` é consultado ao iniciar, quando o usuário retorna ao aplicativo e a cada 4 minutos. Se uma versão nova estiver disponível enquanto o portal estiver aberto, surge um aviso discreto **Atualização disponível → Atualizar agora**; o portal não recarrega sozinho durante consulta, edição ou download. Essa opção atualiza a página com parâmetro de versão para evitar HTML antigo. Nenhum acesso, documento, banco ou regra de sincronização foi alterado. **Ainda é necessário testar o comportamento no PWA do Windows**, inclusive após a distribuição do GitHub Pages. Se o usuário estiver abrindo um arquivo HTML local e não o site HTTPS, ele não recebe atualizações.


## v0.13.10 — Ajustes de Processamento

- CNPJ verdadeiro abaixo do nome da empresa no Processamento, com botão **Copiar**, sem coluna adicional. Copia os 14 dígitos.
- Cabeçalhos **FGTS Mensal** e **DARF / Parcelamento** em duas linhas. Recibo DCTFWeb continua agrupado com GPS na mesma coluna.
- Status **Sem movimento** disponível manualmente para folha pendente, desde competência escolhida até reativação. Não conta como concluída nem pendente; os períodos permanecem salvos no Supabase privado e a situação volta a ser acompanhada ao clicar Reativar na competência desejada.
- **Nenhuma empresa foi marcada sem movimento automaticamente**. Para Jair Camargo, a administração pode selecionar SETEMBRO/2026 e marcar, se desejar; a situação prossegue até reativação. Isto é controle administrativo e não comprova envio de declarações.
- Atualização disponibilizada via PWA v0.13.10: fechar e abrir o aplicativo instalado, sem reinstalar.


### Refinamento v0.13.11
O histórico de competências sem movimento permanece visível após uma reativação. O botão Reativar somente é exibido para a faixa ainda ativa, evitando reativar novamente períodos já encerrados. O serviço do Supabase `gav-processing-summary` foi atualizado para a versão 5, sem mexer nos documentos ou permissões.


## v0.13.22 — Alocações TTM (10/11/2026)

- Aba **Alocações** para as empresas TTM, por empresa e competência. Admin GAV visualiza todas as empresas da TTM; cliente autenticado acessa apenas as empresas a que está vinculado.
- Importação inicial dos relatórios de **outubro/2026**: 75 empregados em 12 empresas, preservando código e nome. Dez CNOs identificados na Folha cadastrados no catálogo, que pode ser ampliado manualmente.
- Dias trabalhados, faltas, CNO e obra: o usuário preenche e salva, sem deduzir números a partir da folha. É possível dividir um empregado entre várias obras no mês, sem duplicar faltas.
- Buscar CNO por parte do número ou selecionar na lista; nome da obra preenchido automaticamente para CNO cadastrado. CNO novo de 12 dígitos e nome são registrados ao salvar.
- Empresa/competência sem relatório importado fica sem empregados; não preencher com outras folhas. Importações futuras devem ser revisadas ao disponibilizar novos relatórios.
- Banco Supabase isolado com tabelas `gav_allocation_employees`, `gav_allocation_worksites`, `gav_allocation_lines`, RLS e acesso exclusivo pela função protegida `gav-allocations`.
- Nenhum CPF, salário, valor ou base da Folha foi importado. PDFs originais continuam intactos no Drive. Preservar identidade visual GAV (azul-marinho, vinho e dourado) e todos os módulos aprovados.


## v0.13.23 — Alocações opcionais e relatório mensal por obra (10/11/2026)

- Campo **Disponibilizar Alocações — Sim/Não** no cadastro da empresa TTM, com padrão Não. O administrador ativa somente as empresas que precisam. A desativação preserva o histórico e bloqueia acesso no servidor.
- O cliente salva dias, faltas, CNO e obra no mesmo banco que o administrador consulta. O administrador atualiza a aba para trazer os dados mais recentes; não há atualização em tempo real sem reconsulta.
- Relatório **por obra, empresa e competência**, com código e nome do empregado, dias trabalhados e faltas, subtotais por obra, total geral e empregados sem lançamentos.
- **Relatório / PDF** permite impressão ou salvar como PDF pelo navegador; **Exportar para Excel (CSV)** baixa as informações salvas em formato com separador ponto e vírgula, UTF-8 e proteção contra fórmulas.
- Somente registros salvos entram no relatório, sem somar faltas duas vezes quando o mesmo empregado está em obras diferentes. Documentos originais, permissões de outros módulos e identidade GAV são preservados.


## v0.13.24 — Diagnóstico e correção da sincronização Google Drive (11/11/2026)

- Foi verificado que o agendador executava a cada 15 minutos, porém o Google rejeitava o refresh token; respostas HTTP 409: `Reconecte a conta Google.` e tentativas manuais de leitura geravam Drive 403. A última sincronização geral concluída era 09/11/2026, 16h30 BRT. Nenhum documento original foi excluído.
- A autorização offline do Google Drive **não é mais sobrescrita por logins Google comuns**. O navegador só envia novo refresh token após o administrador clicar expressamente em **Autorizar / renovar Google Drive**, com `drive.readonly`, `access_type=offline` e `prompt=consent`.
- No servidor, a ação administrativa `connectDrive` valida a troca do refresh token e uma consulta à API do Google Drive antes de salvar o segredo. Erros de permissão são apresentados sem persistir credenciais inválidas.
- No Processamento, indicador baseado no estado real de pastas automáticas (sincronização atrasada após 40 minutos), com última data de sucesso e botão **Autorizar / renovar Google Drive**.
- A reconexão demanda autorização interativa do administrador na conta Google; não pode ser concluída apenas pelo código. Após autorização, o agendamento existente retoma na próxima rodada de 15 minutos.
- Caso a configuração de consentimento OAuth do Google Cloud esteja no estado `Testing` (a confirmar no Cloud Console), os refresh tokens com escopo Drive podem expirar em sete dias; avaliar publicação `In production`/verificação da aplicação conforme requisitos do Google.


## v0.13.25 — Justificativas da Folha: INSS zerado / FGTS sem guia (13/11/2026)

- Controle de Processamento da Folha: em **DARF de INSS**, botão **Marcar INSS zerado** quando a guia não for localizada (por exemplo, compensação de retenções). Em **FGTS mensal**, botão **Marcar FGTS sem guia** quando não houver recolhimento, como em folha somente de pró-labore.
- Marcação **manual, explícita e reversível**; exige confirmação do administrador, registra a empresa, competência, tipo, responsável e data de atualização no banco. Um botão **Desfazer** restaura pendência se nenhum documento for localizado. A marcação não é automática nem permanente entre competências.
- Situações diferenciadas visualmente: **Encontrado** = documento existente no Drive; **Justificado** = informação administrativa sem guia; **Pendente** = documento não localizado nem justificativa. Uma justificativa nunca é apresentada como PDF encontrado, documento pago ou obrigação transmitida.
- O fechamento documental permanece com os critérios aprovados: DCTFWeb, GPS ou par INSS+FGTS, admitindo exclusivamente nesta última combinação que INSS zerado substitua o DARF e FGTS sem guia substitua a guia mensal. Quando realmente não existe documento nem justificativa, a obrigação permanece pendente.
- **Sem movimento** é independente. Parcelamentos, recibos da Folha e regras de detecção de arquivos do Google Drive não foram alterados.
- Backend: \`gav-processing-summary\` ação protegida \`setObligationException\`; somente administrador GAV autenticado e ativo, verificando escritório, empresa, competência e serviço FOLHA confirmado.
- Tabela \`gav_processing_obligation_exceptions\` com RLS, sem permissões anônimas nem para clientes; permite reversão sem apagar o histórico de data e responsável. Nenhuma empresa foi marcada automaticamente.


## v0.13.26 — Indicadores interativos e verdes no Controle de Processamento (13/11/2026)

- Refinamento **somente visual/interativo** do Controle da Folha. Os próprios retângulos de **DARF de INSS** e **FGTS mensal** agora são botões acessíveis: clicar no retângulo pendente oferece confirmar `INSS zerado` ou `FGTS sem guia`; depois de salvar, **o retângulo inteiro fica verde**, com o nome da justificativa e a indicação de que foi registrada pela GAV.
- Clicar novamente no retângulo verde permite **desfazer** a justificativa, mediante confirmação, restaurando a indicação Pendente caso nenhum documento tenha sido localizado.
- **Sem segundo botão abaixo do retângulo**. Uma guia efetivamente encontrada continua verde como `✓ Encontrado` e não oferece uma marcação manual desnecessária.
- Uma justificativa ativa com documento posteriormente localizado continua podendo ser desfeita, sem ocultar o arquivo de origem.
- Mantém totalmente a segurança por empresa/competência, o backend `setObligationException`, os critérios de conclusão das obrigações, o fluxo de sincronização e o restante da interface aprovados. **Nenhuma alteração de banco de dados ou de arquivos do Google Drive**.
