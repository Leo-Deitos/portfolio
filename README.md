# Portfólio — Leo Deitos

Site estático (HTML + CSS + JavaScript, sem framework e sem build) publicado em
<https://leo-deitos.github.io/portfolio/>, com um painel de edição próprio em `admin.html`.

**Por que essa arquitetura:** portfólio é conteúdo que muda pouco e precisa estar no ar sempre.
Site estático não tem servidor para cair, nem banco para manter, nem custo mensal. A edição
acontece no `admin.html`, que grava direto neste repositório pela API do GitHub — o mesmo efeito
de um CMS, sem backend para administrar.

---

## 1. Estrutura

```
index.html                     home — renderizada a partir de data/conteudo.json
admin.html                     painel de edição (não é linkado na home)
data/conteudo.json             ← TODO o conteúdo da home vive aqui
abrir-local.bat                sobe um servidor local para testar

assets/
├── css/portfolio.css          estilos da home e do site novo
├── css/style.css              estilos das páginas de estudo de caso (legado, em uso)
├── js/site.js                 renderiza a home a partir do JSON
├── js/admin.js                lógica do painel de edição
├── js/conteudo-padrao.js      cópia do JSON (fallback ao abrir via file://)
├── js/main.js                 lightbox das páginas de estudo de caso (legado, em uso)
├── img/                       logo e foto de perfil
├── projetos/                  capas dos painéis da home
├── embeds/                    painéis em HTML/SVG/PDF hospedados aqui
└── screenshots/<projeto>/     capturas usadas pelos estudos de caso

projects/
├── agro1.html  logistica1.html  rh1.html  vendas1.html          estudos de caso
└── *-dashboard.html                                             réplicas interativas
powerbi/                       fontes e geradores dos relatórios
```

Regra da home: **`data/conteudo.json` é a fonte de verdade.** Textos, botões, links, imagens e a
lista de projetos saem de lá. Não há texto “preso” no `index.html`.

> **Dois conjuntos de estilo convivem de propósito.** `assets/css/style.css` e
> `assets/js/main.js` são usados pelas quatro páginas de estudo de caso em `projects/`
> (`agro1.html`, `logistica1.html`, `rh1.html`, `vendas1.html`), que continuam no ar.
> A home nova usa `assets/css/portfolio.css`. Não renomeie nem sobrescreva os arquivos legados
> sem antes ajustar os `<link>` dessas quatro páginas.

---

## 2. Testar no seu computador

Dê dois cliques em **`abrir-local.bat`**. Ele sobe um servidor em `http://localhost:8000` e abre
o navegador. Para encerrar, feche a janela preta.

> Abrir o `index.html` com dois cliques também funciona, mas o navegador bloqueia a leitura do
> JSON em `file://` — nesse caso a home usa a cópia de `conteudo-padrao.js`, que pode estar
> desatualizada. Para editar, use sempre o servidor local ou o site já publicado.

---

## 3. Publicação

Já está no ar pelo GitHub Pages: *Settings → Pages*, branch `master`, pasta `/ (root)`.
Todo `push` na `master` republica em cerca de 1 minuto.

Para trocar depois para um domínio próprio (`leomardeitos.com.br`, ~R$ 40/ano no registro.br):
*Settings → Pages → Custom domain*, e um registro `CNAME` apontando para
`leo-deitos.github.io` no painel do domínio.

---

## 4. Ligar o painel de edição

O painel publica escrevendo neste repositório. Para isso ele precisa de um token.

1. Acesse <https://github.com/settings/personal-access-tokens/new> (*Fine-grained token*).
2. Preencha:
   - **Token name:** `painel-portfolio`
   - **Expiration:** 90 dias (renove quando vencer)
   - **Repository access:** *Only select repositories* → escolha **apenas** `portfolio`
   - **Permissions → Repository permissions → Contents:** `Read and write`
3. Clique em **Generate token** e copie o código `github_pat_...` (ele só aparece uma vez).
4. Abra <https://leo-deitos.github.io/portfolio/admin.html>, aba **Conexão**, preencha:

   | Campo | Valor |
   |---|---|
   | Usuário ou organização | `Leo-Deitos` |
   | Repositório | `portfolio` |
   | Branch | `master` |
   | Token | o código copiado |

   Clique em **Salvar conexão** e depois em **Testar conexão**.

**Segurança.** O token fica salvo apenas no `localStorage` do seu navegador e só é enviado para
`api.github.com`. Mesmo assim:

- use sempre *fine-grained* com acesso a um único repositório e permissão só de `Contents`;
- não abra o painel em computador compartilhado;
- ao trocar de máquina, use **Apagar token deste navegador**;
- se vazar, revogue em *Settings → Developer settings → Tokens*. O estrago possível é limitado
  a este repositório.

> O `admin.html` fica acessível por URL para quem souber o endereço, mas **sem token ninguém
> consegue publicar nada** — a API do GitHub recusa. Visitantes nunca veem botão de edição: a
> home não tem nenhum link para o painel.

---

## 5. Usar o painel

| Ação | Onde |
|---|---|
| Trocar textos, títulos, botões | abas Geral, Abertura, Sobre, Rodapé |
| Trocar a foto de perfil | aba **Abertura** → Foto de perfil → *Escolher arquivo* |
| Adicionar / remover / reordenar painéis | aba **Projetos** (botões ↑ ↓ e Remover) |
| Esconder um painel sem apagar | desmarque *Visível no site* |
| Ver como ficou antes de publicar | botão **Pré-visualizar** |
| Colocar no ar | botão **Publicar no site** |
| Backup do conteúdo | botão **Baixar JSON** |

As imagens são redimensionadas e convertidas para WebP no próprio navegador antes de subir
(capa de projeto: 1600px; foto de perfil: 600px). Screenshot de 2 MB costuma virar ~150 KB, o
que mantém o site rápido no celular.

Sem token configurado o painel continua útil: você edita, pré-visualiza e usa **Baixar JSON**
para substituir o arquivo `data/conteudo.json` pelo site do GitHub.

---

## 6. Importar novos painéis

Na aba **Projetos → Adicionar projeto**, escolha o tipo e cole o link:

| Tipo | Como obter o link | Abre dentro do site |
|---|---|---|
| **Power BI** | Power BI Service → *Arquivo → Inserir relatório → Publicar na web* → copiar link | sim |
| **Google Sheets** | *Arquivo → Compartilhar → Publicar na web* → copiar link | sim |
| **Excel** | OneDrive/SharePoint → *Inserir* → copiar o `src` do iframe | sim |
| **HTML** | arquivo em `assets/embeds/` ou `projects/`, ex. `projects/rh1-dashboard.html` | sim |
| **SVG** | arquivo em `assets/embeds/`, ex. `assets/embeds/fluxo.svg` | sim |
| **Looker Studio / Tableau** | link de compartilhamento público do relatório | sim |
| **PDF** | caminho do arquivo, ex. `assets/embeds/estudo.pdf` | sim |
| **Python / SQL** | link do repositório, do notebook ou do Colab | não, abre em nova aba |
| **Outro / link** | qualquer URL (Streamlit, Kaggle, Medium…) | não, abre em nova aba |

Para adicionar um tipo novo (Metabase, Superset, Observable…), inclua uma linha em `TIPOS`
no `assets/js/site.js` e a mesma chave em `TIPOS_PAINEL` no `assets/js/admin.js`.

> **Atenção com “Publicar na web” do Power BI:** esse modo deixa o relatório **público na
> internet** para qualquer um com o link. Use somente com dados fictícios, de estudo ou
> anonimizados — nunca com dado real de cliente ou empregador.

---

## 7. Capas dos painéis da home

Ficam em `assets/projetos/`. O nome do arquivo segue o título do painel, sem acento e com
hífen no lugar do espaço — é exatamente o que o painel gera ao subir a imagem. Proporção ideal
da captura: **16:9** (ex.: 1600×900).

Enquanto a imagem não existir, o card mostra um placeholder gerado em SVG. O site não quebra.
As capturas antigas em `assets/screenshots/` continuam servindo às páginas de estudo de caso.

---

## 8. Manutenção

- **Trocar a paleta:** as cores estão nas variáveis do topo de `assets/css/portfolio.css`
  (`--bg`, `--verde`, `--txt`…). Mudar ali muda a home inteira.
- **Contraste medido** sobre o fundo `#1C1B19`: texto principal 15,1:1 · texto de apoio 9,0:1 ·
  legendas 4,8:1 · verde claro 7,5:1 · texto do botão verde 4,5:1. Se clarear o fundo, revalide
  em <https://webaim.org/resources/contrastchecker/>.
- **Backup:** o histórico do Git já é o backup. `Baixar JSON` serve para cópia rápida.
