# GAV Compartilhar Docs

Portal de documentos para clientes e gestão administrativa da GAV Soluções Contábeis.

## Versão atual: v0.6 (demonstração)

Arquivo principal: `index.html`, já publicado na branch `main`. Github Pages: [abrir protótipo](https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/).

**Atenção:** login e dados de demonstração não oferecem autenticação ou autorização de produção. Não disponibilizar documentos reais a clientes nesta versão.

## Funcionalidades de teste

- Área do cliente com documentos fictícios, organizados por categorias, competência e ano.
- Painel administrativo com empresas, categorias e controle de processamento de folhas.
- Leitor de pastas com seleção individual das empresas a considerar para compartilhamento. Os quatro escritórios/origens aparecem em botões destacados no painel administrativo e na leitura de pastas, inclusive em celular.
- Pré-cadastro TTM: importação em lote por colunas CÓDIGO, EMPRESA, CNPJ (texto TSV ou CSV separado por ponto e vírgula). Salva somente no navegador; não inclui empresas ou CNPJs reais no GitHub. O vínculo com pastas físicas prioriza o código e exige conferência quando o nome diverge.
- Origens: `TTM`, `REL GAV`, `DS CONTÁBIL` e `AVULSOS` (pastas sem numeração).
- Padrão BAT: `ADM`, `RES`, `FER`, `X2026`, meses `0126`, `012026`, `1325` etc.
- Exportação CSV da seleção e da conferência; nenhuma pasta selecionada por padrão.

A leitura de pastas é **manual e local no navegador**: usa nomes, caminhos, datas e tamanhos de arquivos. O conteúdo não é enviado. A seleção é temporária e não constitui autorização real para clientes nem sincronização contínua com Google Drive. O pré-cadastro importado fica somente no armazenamento local do navegador atual, sem sincronização com outros computadores ou celulares.

## Próxima etapa de produção

1. Configurar backend isolado, autenticação segura e controle de acesso por CNPJ.
2. Integrar Google Drive com autorização apropriada para pastas selecionadas.
3. Vincular CNPJ à pasta do Drive de forma inequívoca, distinguindo o escritório de origem.
4. Importar apenas metadados autorizados, colocar dúvidas de classificação em conferência e disponibilizar somente documentos explicitamente publicados.
5. Testar a leitura e o acesso com uma empresa piloto antes de liberar as demais.

Identidade visual: GAV Soluções Contábeis (preto, branco, dourado e logomarca oficial).
