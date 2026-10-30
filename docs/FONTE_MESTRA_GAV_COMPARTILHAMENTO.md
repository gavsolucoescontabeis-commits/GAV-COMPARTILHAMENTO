# GAV Compartilhar Docs — Fonte Mestra do Projeto
**Referência de continuidade | 29/10/2026 | versão documental 1.1**

> Este é o documento-base para anexar à aba **Fontes** do projeto GAV Compartilhamento e usar como referência para continuar o desenvolvimento. Preserva decisões aprovadas. Não contém credenciais, senhas, tokens, CNPJs ou dados pessoais de clientes.

## 1. Identidade e objetivos

- Produto: **GAV Compartilhar Docs**, da **GAV Soluções Contábeis**.
- Identidade: preto, branco e dourado. Preservar o layout e os botões aprovados; corrigir a presença da marca **GAV Soluções Contábeis**, do **logotipo oficial** e do **leão dourado secundário** sem redesenhar as marcas.
- Logotipo original está no repositório `GAV-Site`, arquivo `NOME E LOGO.jpeg`; leão original: `IMAGEM LEAO.jpeg`. Preferir cópias controladas dos arquivos aprovados, em vez de dependências externas frágeis. Não utilizar equivalentes inventados.
- Objetivo: GAV administra empresas e documentos; cada cliente recebe um endereço web, entra com CNPJ e senha inicialmente e depois pode permanecer conectado por uma sessão segura. Não exige conta Google nem instalação do Drive pelo cliente.
- **Aprovação / não regressão:** preservar funcionalidades, aparências e fluxos já aprovados; alterações aditivas e correções direcionadas. Não recriar projeto nem substituir a interface aprovada por protótipos diferentes.
- Proibir custos recorrentes externos não autorizados. Avaliar limites, verificação OAuth e eventuais custos antes de integrar.

## 2. Onde o aplicativo existe de verdade

- GitHub: `gavsolucoescontabeis-commits/GAV-COMPARTILHAMENTO`; branch `main`; repositório **público** para hospedar no GitHub Pages.
- Site: https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/
- Arquivo atual: `index.html`, **interface v0.8.1**. Os dois símbolos oficiais enviados pelo usuário foram transformados em imagens com transparência de fundo, sem redesenhar a arte; arquivos `assets/logo-gav-sem-fundo.svg` e `assets/leao-gav-sem-fundo.svg`.
- Existe pré-cadastro protegido de **18 empresas TTM** em arquivo cifrado no repositório. **Não equivale a autenticação real**. Não copiar nem registrar a chave administrativa neste documento.
- O site atual ainda é **demonstração estática**, com dados e status de teste, leitura local de nomes de arquivos e armazenamento temporário por navegador. **Não está conectado ao Google Drive, não disponibiliza PDFs reais e não deve ser entregue a clientes como portal de produção.**
- A leitura do navegador de grandes raízes, como a pasta TTM com cerca de **97 mil arquivos**, apresentou travamento. A v0.7.3 introduziu leitura seletiva (dependente do navegador), progresso e cancelamento. Essa leitura ainda não é sincronização.
- **Supabase:** em 29/10/2026 foi criado o projeto isolado **GAV Compartilhamento** (ID `kiunegfjbfhvvlkxqvos`, região `sa-east-1`), com custo mensal cotado de zero. Foram aplicadas as migrações de 10 tabelas com RLS e importados 18 cadastros TTM para o banco privado. **Ainda não há usuário administrador de produção, nem login real integrado ao frontend e nem sincronização OAuth do Drive.** Não misturar com Ministério Infantil.

## 3. Pastas reais e estrutura do BAT

- Os arquivos estão no **Google Drive**, visíveis no Windows através do drive mapeado `G:\Meu Drive`. O servidor na internet **não tem acesso direto ao disco G:**; a integração deve ocorrer com Google Drive API autorizada.
- Origens de escritório / raízes aprovadas: **TTM**, **REL GAV** (carteira própria da GAV), **DS CONTÁBIL**, **AVULSOS**.
- TTM e DS CONTÁBIL: empresas organizadas por **código + nome da empresa**; o usuário é responsável pelas respectivas folhas de pagamento.
- REL GAV: empresas próprias da GAV, com escopos de serviço variados, inclusive empresas **sem folha de pagamento**.
- AVULSOS: clientes ocasionais, ex-clientes ou pastas sem código antes do nome. Nunca supor a empresa pelo nome aproximado sem confirmação.
- Estrutura usual por empresa: competência mensal, pastas opcionais `ADM` (admissões), `RES` (rescisões), `FER` (férias); arquivos de folha podem ficar na pasta mensal. Existem anos anteriores arquivados em `X2026`, `X2025`, etc., incluindo décimo terceiro (por exemplo, `1325`). O BAT do usuário realiza arquivamentos anuais; **não modificar, renomear ou mover essas pastas**.
- Nomes dos meses devem aparecer SEMPRE **EM MAIÚSCULAS** (`JANEIRO/2027`, `OUTUBRO/2026`).
- O aplicativo deve exibir **categorias virtuais** em vez de simplesmente espelhar a árvore de pastas: **Admissões**, **Rescisões**, **Férias**, **Folha de Pagamento**, **Guias e Impostos**, **Outros Documentos**. Priorizar ano atual; disponibilizar históricos em consulta própria.
- Classificação automática baseada em caminho, tipo de documento e nome; dúvidas geram **Conferir**, sem liberação automática de arquivo ambíguo.

## 4. Regra fundamental de inclusão

- **Somente empresas explicitamente cadastradas e autorizadas** podem ser indexadas, mesmo que haja muitas outras pastas na raiz de um escritório.
- Para a TTM, as **18 empresas fornecidas pelo usuário** formam a lista inicialmente permitida. Não incluir pastas, arquivos soltos, backups ou outras empresas desconhecidas só por estarem sob `TTM`.
- Uma empresa poderá ser cadastrada com **origem, código (quando existir), nome, CNPJ validado e pasta exata**; impedir duplicidades e exigir conferência de divergências entre código/nome da pasta.
- O usuário **não deve cadastrar de novo** informações que já forneceu. Sempre incorporar dados já recebidos e revisados ao cadastro persistente.
- A importação pelo Drive deve começar por **uma empresa piloto** da lista autorizada (por exemplo, uma empresa da TTM especificamente autorizada), sem expor outros documentos da TTM.
- Distinguir três situações: **empresa cadastrada**, **pasta identificada**, **arquivo publicado**. Uma pasta identificada NÃO significa sincronização ou permissão para o cliente.
- Requisitos de privacidade para arquivos de outro escritório: não habilitar compartilhamento sem as autorizações pertinentes. Por padrão, tudo fica **não publicado**.

## 5. Modelo de serviços por empresa (sem nomes ou dados de clientes)

- TTM e DS CONTÁBIL: carteira principalmente de processamento de folhas de pagamento, com exceções configuráveis.
- REL GAV: **cada empresa tem um conjunto de serviços próprio**, como REINF isolada; folha de condomínio; folha com apuração do Lucro Presumido (PIS, COFINS, IRPJ, CSLL); apuração tributária e parcelamentos sem folha; ou folha e contabilidade com PGDAS a confirmar.
- A relação detalhada entre **nomes de clientes e serviços contratados é informação administrativa interna**. Não deve constar em arquivos de repositório público; ficar somente na fonte privada do projeto / banco com acesso restrito.
- Os módulos de acompanhamento devem variar segundo o serviço confirmado por empresa. Não impor folha, DARF, FGTS, PGDAS ou REINF a todos.
- Pendências desconhecidas devem permanecer **a confirmar**, jamais concluídas ou exigíveis por suposição.

## 6. Painel interno de processamento / fechamento

- Somente na área administrativa GAV, com todas as empresas e filtros por escritório, competência e serviço.
- A competência não é o mês de execução: **folha OUTUBRO/2026 é processada em NOVEMBRO/2026**, normalmente com fechamentos até os dias 12–13 ou depois.
- Status: **Pendente**, **Em andamento**, **Pronta para conferir**, **Concluída**.
- O DARF de INSS pode indicar forte evidência de fechamento, mas **não existe para empresas sem valor a recolher**. Da mesma forma, **FGTS não se aplica a todas**, por exemplo, somente pró-labore. Não presumir a emissão de DARF/FGTS.
- Concluir somente por evidência suficiente e/ou aprovação administrativa configurada para aquela empresa; salvar documentos no Drive não deve confirmar automaticamente uma obrigação equivocada.
- Além da folha, permitir fluxos futuros para **REINF, apuração de tributos, contabilidade, PGDAS e parcelamentos** quando contratados.
- Manter histórico e trilha de alterações de status e responsável.

## 7. Acesso e segurança de produção — obrigatórios

1. **GitHub Pages público pode continuar sendo o frontend**, mas não deve conter segredos, arquivos reais, tokens do Google ou regras de autorização confiadas só ao JavaScript.
2. Backend e banco isolados para GAV Compartilhamento. Planejado: **Supabase Auth + Postgres com RLS**, ou alternativa equivalente comprovadamente segura. Cada usuário autorizado deve acessar apenas seu CNPJ/pastas/documentos; GAV administra todos.
3. O login por CNPJ é **identificador de interface**; a senha deve ser verificada pelo provedor de autenticação seguro, não armazenada em texto simples. Sessão persistente sujeita à expiração e revogação, com recuperação e opção **Sair**.
4. Integração Drive por **OAuth autorizada pelo titular**, no backend. Credenciais e tokens apenas no servidor. Antes de escolher escopos Google, avaliar exigências de verificação e eventuais restrições; selecionar o mínimo possível. Nunca publicar pastas do Drive por links abertos.
5. Indexar **somente IDs das pastas vinculadas a CNPJs explicitamente aprovados**. Usar paginação e sincronização incremental; evitar enumerar todos os 97 mil arquivos pelo navegador.
6. Guardar no banco apenas metadados necessários: origem, identificador da pasta/arquivo Drive, empresa/CNPJ vinculado, competência, categoria, situação de revisão e autorização, datas, hashes/controle de versão quando necessário.
7. Entregar PDFs reais somente após **verificação de usuário, empresa, permissão e situação publicada no servidor**. Prévia e download devem passar por controle de acesso real.
8. Registro de auditoria; proteção contra IDOR/BOLA; revisão de RLS; não reutilizar infraestrutura do Ministério Infantil sem isolamento formal.

## 8. Primeiro teste real — critérios de aceitação

**Empresa piloto:** uma empresa específica da TTM previamente aprovada, a definir no cadastro seguro, sem liberar acessos a clientes externos.

- [ ] Projeto de backend separado criado; falta autenticação administrativa segura e conexão da interface
- [ ] Usuário autoriza acesso técnico à conta Google Drive por OAuth; servidor recebe acesso somente aos dados necessários.
- [ ] CNPJ da empresa piloto vinculado ao **ID real da pasta** no Drive.
- [ ] Indexação dos metadados de **uma única empresa**, incluindo histórico arquivado, sem varrer a TTM inteira.
- [ ] Interface existente preservada e com **GAV Soluções Contábeis + logo oficial + leão secundário** corretamente apresentados.
- [ ] Botões do portal exibem os **documentos reais** por categoria, competência e ano.
- [ ] Teste de visualização e download **de documento autorizado**, com validação de permissão no servidor.
- [ ] Nova pasta/arquivo sincronizado do Drive aparece sem upload manual repetido (com intervalo/atualização claramente informado).
- [ ] Empresa distinta não consegue consultar os arquivos da empresa piloto; logs registram o acesso.
- [ ] Persistência: após fechar/reabrir o navegador, cadastros e índices continuam no banco; nada some porque se fechou uma aba.
- [ ] Nenhum pagamento externo/serviço recorrente ativado sem aprovação.

## 9. Pendências e regras de continuidade

- **Visual**: os originais GAV foram aplicados com fundo transparente na v0.8.1; confirmar aparência no navegador do usuário. **Não redesenhar layout geral**, aprovado provisoriamente.
- **Dados**: TTM tem 18 empresas pré-cadastradas; relações DS CONTÁBIL e REL GAV recebidas em imagens precisam ser revisadas e incorporadas ao banco seguro, sem adivinhar CNPJs e sem publicar carteira em claro no repositório.
- **Cadastro**: tela **Cadastrar nova empresa** já existe na demonstração; na produção precisará gravar no banco.
- **Drive**: conexão OAuth e sincronização verdadeira ainda não foram implementadas; a seleção de pasta atual é somente conferência local.
- **Aprovações**: não importar todo o conteúdo da TTM, não permitir compartilhamento automático de todas as empresas e não confundir arquivo encontrado com arquivo publicado.
- **Qualidade**: testar fluxo real de ponta a ponta antes de convidar clientes; não fazer várias interfaces de demonstração com dados que desaparecem.
- **Fonte de verdade**: combinar este documento com a versão atual do GitHub e com novas instruções explícitas do usuário; em divergências, vale a instrução posterior aprovada.

## 10. Links de referência

- Código atual: https://github.com/gavsolucoescontabeis-commits/GAV-COMPARTILHAMENTO
- Site de teste: https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/
- Identidade visual original: https://github.com/gavsolucoescontabeis-commits/GAV-Site
- Referência de escopos OAuth Google Drive: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Referência de autenticação e autorização: https://supabase.com/docs/guides/auth

---
**Regra final:** priorizar solução funcional real para uma empresa com segurança, persistência e Drive; preservar a interface aprovada e não pedir novamente os dados já fornecidos.

---

## Aditivo 29/10/2026 — Folha unificada e acesso intuitivo (instrução posterior, prevalece sobre descrições antigas)

**Confirmação técnica:** a conta GAV entrou de verdade pelo OAuth Google; a pasta piloto foi vinculada ao Drive e seus PDFs foram indexados com persistência no Supabase. A organização de arquivo e o acesso continuam em **piloto**, sem liberação indiscriminada.

**Regra aprovada de organização:** os PDFs soltos dentro da pasta mensal de folha pertencem à única categoria **Folha de Pagamento**, incluindo relatório de folha, recibos, guias previdenciárias/DARF INSS, FGTS/guia/relatórios, eventos e relatórios do eSocial, DCTFWeb, seus recibos e resumos. Não criar novas subcategorias nem fazer o cliente buscar o INSS e o FGTS entre Guias e Impostos.

As subpastas **ADM**, **RES** e **FER** continuam em categorias separadas. Reservar **Guias e Impostos** para obrigações não relacionadas à folha, como PIS/COFINS, IRPJ/CSLL e parcelamentos. Respeitar a pasta existente do Google Drive, sem mover documentos fisicamente. Arquivos de natureza estranha à empresa exigem conferência administrativa antes de serem publicados.

**Competência:** exibir arquivos agrupados por **mês/ano** (meses sempre em MAIÚSCULAS), inclusive histórico com pasta anual `X2025` e nomes de mês abreviados como `1025` e `1325`. Reclassificar metadados já indexados e aplicar a mesma regra em cada sincronização futura. Não afetar permissões, aprovação, autorização ou publicações anteriores.

**Usabilidade obrigatória:** trabalhadores e administradores de construtoras precisam localizar e anexar PDFs em outros sistemas, sem conhecimento técnico. Cada arquivo tem botões claramente identificados **Visualizar** e **Baixar PDF**. O download deve ocorrer diretamente, sem exigir visualização prévia, mantendo o nome do PDF original. O visualizador deve indicar carregamento, permitir baixar de dentro da prévia e oferecer abertura em nova guia para navegadores que não exibem PDF incorporado. Minimizar cliques, garantir controles acessíveis no celular e mensagens de erro compreensíveis.

**Performance:** em v0.9.1 foi introduzido cache temporário e limitado no navegador e token Google temporário no backend para acessos repetidos, sem links públicos. Auditoria de visualização/download ocorre sem bloquear a transferência. A velocidade do primeiro acesso requer teste real, pois depende do Google Drive, da rede e da verificação segura da hierarquia das pastas.

**Segurança:** todos os PDFs permanecem privados e sua prévia/download exige autorização do usuário e da empresa no servidor. Indexar não é publicar. A publicação ainda depende da GAV e da conferência por arquivo. A demonstração anterior permanece preservada em `?demo=1`.

**Status técnico (v0.9.1):** fonte frontend `portal.js`, CSS `portal-ui.css`, backend `gav-drive-index` e `gav-drive-pdf` atualizados no repositório e funções ativas no Supabase. O uso externo por clientes e o desempenho da versão atual **não foram validados**; não anunciar disponibilidade definitiva.

---

## Aditivo 29/10/2026 — Navegação, marca GAV e publicação automática (v0.9.4)

Decisão do usuário: o portal deve ser **o mais simples possível** para empresários e prestadores da construção civil. O menu **Documentos** foi considerado redundante porque **Início** já apresenta as categorias; removê-lo da navegação. Para cada tarefa o cliente entra em **Início → categoria (Folha, Admissões, Rescisões etc.) → ano/mês** e retorna pelo botão **Voltar** ou por **Início**, sem menus circulares.

**Identidade da GAV:** o leão institucional não pode estar ao lado do nome da empresa selecionada, pois gera a impressão de ser a marca da cliente. Manter o leão exclusivamente na barra lateral de navegação, abaixo das rotinas, com a GAV no cabeçalho.

**Botão da pasta mensal:** posicionar na mesma linha do cabeçalho do mês, **à direita**, como os comandos individuais. Usar **um único botão inteligente**: **Publicar pasta inteira** se houver documentos não publicados; após todos estarem publicados, ele passa a **Revogar pasta inteira**. Não colocar duplicados em segunda linha nem exigir múltiplos cliques de publicação individual.

**Fluxo real desejado:** a GAV salva seus documentos na pasta local já sincronizada com o Google Drive e comunica a empresa cliente para acessar o portal. Não pretende revisar e clicar Publicar para cada arquivo. A autorização não deve ser uma etapa repetitiva: **novos arquivos** na pasta de empresa aprovada são publicados na indexação. Para arquivos que a administração deseja ocultar, **Revogar** mantém o status `BLOQUEADO` mesmo depois de novas sincronizações. A liberação continua restrita ao CNPJ autorizado e não cria links públicos de Drive.

**Segurança na transição:** a nova regra não publica retroativamente os 355 documentos do piloto que já estavam na base, pois existem arquivos cujos nomes sugerem outras empresas. A administração pode publicar competências antigas em lote depois de conferir. O login de clientes ainda exige implantação e teste, independentemente de o documento ter o campo `published_at` preenchido.

**Automação disponível neste momento:** a interface faz nova verificação ao abrir o painel do administrador e a cada 15 minutos **enquanto o portal administrativo estiver aberto**. A consulta manual continua disponível. Não foi implantado monitoramento garantido 24 horas com navegador fechado; a integração de execução agendada sem token exposto requer configuração segura de serviço. Não prometer que o sistema inteiro é automático sem esse último passo.

**Arquivos removidos:** ao sincronizar, arquivos que sumiram da pasta autorizada passam para status `REMOVIDO` e deixam de aparecer. Arquivos que voltam à pasta podem ser reconsiderados sem desrespeitar bloqueios manuais `BLOQUEADO`.

**Não regressão:** preservar layout preto/dourado e logos oficiais, separação Folha × Admissões × Rescisões × Férias × Guias e Impostos, download direto/visualização das imagens e PDFs e controle de permissões backend. Todas as alterações novas são aditivas aos componentes aprovados e não devem transformar a interface em nova demonstração.

---

## Aditivo 29/10/2026 — Publicação automática com painel fechado e botão Baixar (v0.9.5)

O administrador definiu o fluxo cotidiano: gera documento, salva na pasta local do Google Drive sincronizada, e **não precisa abrir o portal nem clicar Publicar** para novos arquivos de pastas autorizadas. O documento se torna disponível ao cliente após a sincronização local → Google Drive → indexação no Supabase, restrito à empresa vinculada.

**Agendamento técnico efetivado:** `pg_cron` + `pg_net` no Supabase a cada **15 minutos**, execução servidor mesmo com navegador fechado. O job ativo `gav-drive-pilot-sync-15m` percorre apenas empresas com `gav_drive_folders.is_active=true` e `auto_publish_new=true`, evitando novos clientes sem vínculo conferido. Headers são montados a partir do Supabase Vault (JWT anon legado apenas como autenticação gateway + segredo interno distinto). A Edge Function `gav-drive-index` mantém `verify_jwt=true`, valida o segredo agendado via RPC acessível apenas ao `service_role`; requisições normais seguem exigindo administrador Google autorizado. **Teste efetivo:** chamada autenticada respondeu HTTP 200 e indexou 400 arquivos de 45 pastas; tentativa com token incorreto respondeu HTTP 403. O cron está ativo no banco, mas a pontualidade dos próximos ciclos e o acesso offline ao Google ainda dependem da infraestrutura e autorização OAuth válidas.

**Visual:** todos os controles de download exibem exclusivamente **Baixar** (independentemente de PDF ou imagem), inclusive dentro do visualizador. Não mostrar `Baixar PDF` e `Baixar imagem` em botões de largura diferente.

**Exceções:** Revogar mantém status `BLOQUEADO`; o sistema não republica por sincronizar. Arquivos removidos da pasta recebem `REMOVIDO` e não aparecem. Documentos históricos anteriores à aprovação automática não foram liberados retroativamente sem conferência, dada a possibilidade de materiais de outras empresas na pasta piloto. A liberação desses arquivos por competência ainda é um ato administrativo excepcional, não uma etapa recorrente para documentos novos.

**Limites conhecidos:** o ciclo não é instantâneo (até o próximo agendamento após o Google Drive concluir o upload), a autorização OAuth pode expirar se projeto Google Cloud estiver no modo Testando e ainda faltam provisionar/testar os primeiros acessos reais dos clientes. Não declarar que o acesso de clientes já está liberado nem expor segredos no GitHub.


## Aditivo 30/10/2026 — Navegação fixa e conferência com visão do cliente
A barra lateral com nome e leão da GAV deve acompanhar toda a rolagem no desktop, mantendo os botões acessíveis. No celular, manter a navegação inferior. A aba administrativa **Início** ganhou **Ver como o cliente**: mostra somente documentos aprovados e publicados segundo a filtragem do backend, sem criar credenciais externas. O administrador pode, por decisão explícita no painel, gerar uma senha temporária de teste somente para a JM Rocha e experimentar o login verdadeiro com CNPJ numa janela anônima; há opção de desativar/excluir esse acesso. Nunca criar usuário de teste sem o clique e confirmação do administrador. Os documentos novos são liberados automaticamente pela sincronização do Drive em cron de 15 minutos; os documentos antigos pendentes não foram liberados em massa. Status do login real de teste não verificado até que o administrador realize o ensaio.
