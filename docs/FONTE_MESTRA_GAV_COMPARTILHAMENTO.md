# GAV Compartilhar Docs — Fonte Mestra do Projeto
**Referência de continuidade | 29/10/2026 | versão documental 1.0**

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
- Arquivo atual: `index.html`, **protótipo v0.7.3** no momento desta fonte.
- Existe pré-cadastro protegido de **18 empresas TTM** em arquivo cifrado no repositório. **Não equivale a autenticação real**. Não copiar nem registrar a chave administrativa neste documento.
- O site atual é **demonstração estática**, com dados e status de teste, leitura local de nomes de arquivos e armazenamento temporário por navegador. **Não está conectado ao Google Drive, não disponibiliza PDFs reais e não deve ser entregue a clientes como portal de produção.**
- A leitura do navegador de grandes raízes, como a pasta TTM com cerca de **97 mil arquivos**, apresentou travamento. A v0.7.3 introduziu leitura seletiva (dependente do navegador), progresso e cancelamento. Essa leitura ainda não é sincronização.
- **Supabase:** a conta vinculada atualmente mostra projeto do **Ministério Infantil**, não há um projeto próprio de GAV Compartilhamento identificado. **Não misturar dados contábeis/de clientes com o projeto Ministério Infantil.** Um projeto isolado precisará ser criado e configurado antes de produzir login e banco reais.

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
- A importação pelo Drive deve começar por **uma empresa piloto** da lista autorizada (por exemplo, a JM Rocha), sem expor outros documentos da TTM.
- Distinguir três situações: **empresa cadastrada**, **pasta identificada**, **arquivo publicado**. Uma pasta identificada NÃO significa sincronização ou permissão para o cliente.
- Requisitos de privacidade para arquivos de outro escritório: não habilitar compartilhamento sem as autorizações pertinentes. Por padrão, tudo fica **não publicado**.

## 5. Escopos de serviços por empresa

**TTM e DS CONTÁBIL:** controle principal de processamento de **folhas de pagamento** para empresas desses escritórios, com exceções individualizadas quando informadas.

**REL GAV — escopos já informados:**

| Empresa | Serviços da GAV | Não presumir |
|---|---|---|
| AS | **REINF**; enquadramento Simples Nacional, cuja guia é feita por outra pessoa | Não tem folha; não marcar folha ou PGDAS como responsabilidade GAV |
| Ouro Negro | **Folha de pagamento** de condomínio | Não presumir apuração de PGDAS |
| Skuner | **Folha**, apuração **PIS, COFINS, IRPJ e CSLL** (Lucro Presumido) | Não presumir outras obrigações |
| Irapuera | **PIS, COFINS, IRPJ, CSLL** e **parcelamentos** | Não tem folha |
| Vértice | **Folha**, **contabilidade**; empresa do Simples Nacional, **PGDAS ainda a confirmar** | Não marcar PGDAS como obrigação confirmada |

- Os módulos de acompanhamento devem variar segundo o **contrato/escopo de cada empresa**, e não impor a todas as empresas a mesma lista fixa de obrigações.
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

**Empresa piloto:** uma empresa específica da TTM previamente aprovada, inicialmente JM Rocha, sem liberar acessos a clientes externos.

- [ ] Projeto de backend separado e autenticação administrativa segura configurados.
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

- **Visual**: corrigir marca oficial e leão — pendentes; **não redesenhar layout geral**, que foi aprovado provisoriamente.
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
