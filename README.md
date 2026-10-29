# GAV Compartilhar Docs

Portal de documentos para clientes e gestão administrativa da GAV Soluções Contábeis.

## Versão atual: v0.7.2 (demonstração)

Arquivo principal: `index.html`, já publicado na branch `main`. Github Pages: [abrir protótipo](https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/).

**Atenção:** login e dados de demonstração não oferecem autenticação ou autorização de produção. Não disponibilizar documentos reais a clientes nesta versão.

## Funcionalidades de teste

- Área do cliente com documentos fictícios, organizados por categorias, competência e ano.
- Painel administrativo com empresas, categorias e controle de processamento de folhas.
- Leitor de pastas e empresas por escritório, inclusive em celular. Em TTM, escolha a pasta principal apenas uma vez; somente arquivos dentro de pastas de empresas previamente cadastradas são considerados. Arquivos soltos, pastas estranhas, outros escritórios e raízes desconhecidas são ignorados (apenas contagem dos ignorados). As pastas reconhecidas devem ser filhas diretas da raiz TTM, ou a própria pasta da empresa selecionada.
- Botão **Conferir arquivos** nas empresas localizadas abre nomes, categorias e competências identificados. Não abre conteúdo de PDF e não é sincronização do Google Drive. Diferenças no nome das pastas permanecem pendentes de conferência.
- Seleção individual permanece opcional, para planejar futuras autorizações, sem liberar arquivos nem criar contas reais.
- **Cadastro individual de novas empresas (v0.7):** menu administrativo **Cadastrar nova empresa**, com seleção de escritório (TTM, REL GAV, DS CONTÁBIL ou AVULSOS), código, nome, CNPJ validado e pasta; preenchimento sugerido para o nome da pasta; bloqueio de CNPJ/código/pasta duplicados; inclusão automática no painel administrativo e no controle de processamento. Os novos dados são guardados apenas no navegador atual, sem permitir login de clientes reais.
- **Pré-cadastro TTM já realizado (18 empresas):** os nomes, códigos e CNPJs ficam no arquivo `ttm-registry.enc.json`, criptografado por AES-256-GCM com chave derivada por PBKDF2. A chave não está no repositório. A relação abre automaticamente na área administrativa após o usuário informar sua chave; nenhuma importação manual é necessária. O vínculo com pastas físicas prioriza o código e exige conferência quando o nome diverge.
- Origens: `TTM`, `REL GAV`, `DS CONTÁBIL` e `AVULSOS` (pastas sem numeração).
- Padrão BAT: `ADM`, `RES`, `FER`, `X2026`, meses `0126`, `012026`, `1325` etc.
- Exportação CSV da seleção e da conferência; nenhuma pasta selecionada por padrão.

A relação da DS CONTÁBIL ainda não foi inserida em lote; não registrar CNPJs nem nomes de uma imagem sem leitura confiável. A leitura de pastas é **manual e local no navegador**: usa nomes, caminhos, datas e tamanhos de arquivos. O conteúdo não é enviado. A seleção é temporária e não constitui autorização real para clientes nem sincronização contínua com Google Drive. O cadastro TTM cifrado está no repositório e pode ser aberto com a chave administrativa de teste em outro navegador, mas o aplicativo **não** oferece autenticação de produção, controle centralizado de permissões ou banco de dados compartilhado. Não usar para documentos reais.

## Próxima etapa de produção

1. Configurar backend isolado, autenticação segura e controle de acesso por CNPJ.
2. Integrar Google Drive com autorização apropriada para pastas selecionadas.
3. Vincular CNPJ à pasta do Drive de forma inequívoca, distinguindo o escritório de origem.
4. Importar apenas metadados autorizados, colocar dúvidas de classificação em conferência e disponibilizar somente documentos explicitamente publicados.
5. Testar a leitura e o acesso com uma empresa piloto antes de liberar as demais.

Identidade visual: GAV Soluções Contábeis (preto, branco, dourado e logomarca oficial).
