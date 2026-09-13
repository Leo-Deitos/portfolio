/* =========================================================
   Painel de edição do portfólio (admin.html)
   - Edita todo o conteúdo de data/conteudo.json
   - Sobe imagens do computador direto para o repositório
   - Publica via GitHub Contents API (sem servidor, sem custo)
   Nada disso aparece no site público: admin.html não é linkado no index.
   ========================================================= */
(function () {
  "use strict";

  var CAMINHO_JSON = "data/conteudo.json";
  var CAMINHO_JS   = "assets/js/conteudo-padrao.js";
  var CABECALHO_JS =
    "/* Gerado a partir de data/conteudo.json — nao editar a mao.\n" +
    "   Serve de fallback quando o index.html e aberto direto do disco (file://),\n" +
    "   onde o fetch do JSON e bloqueado pelo navegador.\n" +
    "   O admin republica este arquivo junto com o JSON. */\n" +
    "window.CONTEUDO_PADRAO = ";

  var CHAVE_CONEXAO = "portfolio.conexao";
  var CHAVE_RASCUNHO = "portfolio.rascunho";

  var estado = {
    dados: null,
    // pre-preenchido para este repositorio; so falta o token do dono
    conexao: { owner: "Leo-Deitos", repo: "portfolio", branch: "master", token: "" },
    aba: "conexao",
    sujo: false
  };

  /* =======================================================
     Utilidades
     ======================================================= */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function pegar(obj, caminho) {
    return caminho.split(".").reduce(function (a, k) { return a == null ? undefined : a[k]; }, obj);
  }

  function definir(obj, caminho, valor) {
    var partes = caminho.split(".");
    var ultimo = partes.pop();
    var alvo = partes.reduce(function (a, k) {
      if (a[k] == null) a[k] = /^\d+$/.test(k) ? [] : {};
      return a[k];
    }, obj);
    alvo[ultimo] = valor;
  }

  function slugArquivo(s) {
    return String(s || "arquivo")
      .normalize("NFD").replace(new RegExp("[\u0300-\u036f]","g"), "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "arquivo";
  }

  function utf8ParaBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "", chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function base64ParaUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
    return new TextDecoder().decode(bytes);
  }

  function log(msg, tipo) {
    var el = $("#log");
    el.textContent = msg;
    el.className = "log" + (tipo ? " " + tipo : "");
    if (tipo === "ok") setTimeout(function () { if (el.textContent === msg) el.textContent = ""; }, 6000);
  }

  function marcarSujo() {
    estado.sujo = true;
    salvarRascunho();
  }

  function salvarRascunho() {
    try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado.dados)); } catch (e) { /* cota cheia */ }
  }

  /* =======================================================
     GitHub Contents API
     ======================================================= */
  function conexaoOk() {
    var c = estado.conexao;
    return !!(c.owner && c.repo && c.token);
  }

  function ghUrl(caminho) {
    var c = estado.conexao;
    return "https://api.github.com/repos/" + encodeURIComponent(c.owner) + "/" +
           encodeURIComponent(c.repo) + "/contents/" + caminho;
  }

  function ghCabecalhos() {
    return {
      "Authorization": "Bearer " + estado.conexao.token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function mensagemErro(resposta) {
    if (resposta.status === 401) return "Token inválido ou expirado (401).";
    if (resposta.status === 403) return "Sem permissão para gravar (403). No token, confira: Repository access inclui este repositório, e Permissions > Contents esta em 'Read and write' (nao 'Read-only'). Use o botao Testar conexao para diagnosticar.";
    if (resposta.status === 404) return "Não encontrado (404). Confira usuário, repositório e branch.";
    if (resposta.status === 409) return "Conflito (409). O arquivo mudou no repositório — clique em Recarregar e refaça a edição.";
    if (resposta.status === 422) return "Requisição recusada (422). Normalmente é branch inexistente.";
    return "Erro HTTP " + resposta.status + ".";
  }

  function ghObter(caminho) {
    return fetch(ghUrl(caminho) + "?ref=" + encodeURIComponent(estado.conexao.branch) + "&t=" + Date.now(),
                 { headers: ghCabecalhos(), cache: "no-store" })
      .then(function (r) {
        if (r.status === 404) return null;                 // arquivo ainda não existe
        if (!r.ok) throw new Error(mensagemErro(r));
        return r.json();
      });
  }

  function ghGravar(caminho, conteudoBase64, mensagem) {
    return ghObter(caminho).then(function (atual) {
      var corpo = {
        message: mensagem,
        content: conteudoBase64,
        branch: estado.conexao.branch
      };
      if (atual && atual.sha) corpo.sha = atual.sha;
      return fetch(ghUrl(caminho), {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, ghCabecalhos()),
        body: JSON.stringify(corpo)
      }).then(function (r) {
        if (!r.ok) throw new Error(mensagemErro(r));
        return r.json();
      });
    });
  }

  function ghGravarTexto(caminho, texto, mensagem) {
    return ghGravar(caminho, utf8ParaBase64(texto), mensagem);
  }

  /* =======================================================
     Imagens: otimiza no navegador antes de subir
     ======================================================= */
  function lerArquivo(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  function otimizarImagem(file, larguraMax) {
    // SVG e GIF passam direto (canvas destruiria animação/vetor)
    if (/svg|gif/i.test(file.type)) {
      return lerArquivo(file).then(function (dataUrl) {
        return { dataUrl: dataUrl, ext: /svg/i.test(file.type) ? "svg" : "gif" };
      });
    }
    return lerArquivo(file).then(function (dataUrl) {
      return new Promise(function (res) {
        var img = new Image();
        img.onload = function () {
          var escala = Math.min(1, larguraMax / img.naturalWidth);
          var w = Math.round(img.naturalWidth * escala);
          var h = Math.round(img.naturalHeight * escala);
          var cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          var ctx = cv.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          var webp = cv.toDataURL("image/webp", 0.88);
          if (webp.indexOf("data:image/webp") === 0) res({ dataUrl: webp, ext: "webp" });
          else res({ dataUrl: cv.toDataURL("image/jpeg", 0.9), ext: "jpg" });
        };
        img.onerror = function () { res({ dataUrl: dataUrl, ext: (file.name.split(".").pop() || "png").toLowerCase() }); };
        img.src = dataUrl;
      });
    });
  }

  function enviarImagem(file, pasta, nomeBase, larguraMax) {
    return otimizarImagem(file, larguraMax || 1600).then(function (r) {
      var base64 = r.dataUrl.split(",")[1];
      var nome = slugArquivo(nomeBase) + "." + r.ext;
      var caminho = pasta.replace(/\/+$/, "") + "/" + nome;

      if (!conexaoOk()) {
        // Sem GitHub configurado: embute no próprio JSON (funciona, mas pesa)
        var kb = Math.round(base64.length * 0.75 / 1024);
        if (kb > 1200) throw new Error("Imagem grande demais (" + kb + " KB) para o modo sem conexão. Configure a aba Conexão.");
        return { caminho: r.dataUrl, embutida: true, kb: kb };
      }
      return ghGravar(caminho, base64, "chore(portfolio): envia " + nome)
        .then(function () { return { caminho: caminho, embutida: false, kb: Math.round(base64.length * 0.75 / 1024) }; });
    });
  }

  /* =======================================================
     Esquema do formulário
     ======================================================= */
  var ICONES_DISPONIVEIS = ["analise","design","projetos","logistica","planilha","dashboard","engrenagem",
                            "banco","site","email","linkedin","github","whatsapp","telefone","powerbi",
                            "codigo","html","svg","excel","sheets","link"];

  var TIPOS_PAINEL = {
    powerbi: "Power BI", html: "HTML", svg: "SVG", excel: "Excel", sheets: "Google Sheets",
    looker: "Looker Studio", tableau: "Tableau", python: "Python", sql: "SQL", pdf: "PDF", link: "Outro / link"
  };

  var ABAS = [
    { id: "conexao",  rotulo: "Conexão" },
    { id: "geral",    rotulo: "Geral / SEO" },
    { id: "hero",     rotulo: "Abertura" },
    { id: "sobre",    rotulo: "Sobre mim" },
    { id: "habilidades", rotulo: "Habilidades" },
    { id: "projetos", rotulo: "Projetos" },
    { id: "ajuda",    rotulo: "Serviços" },
    { id: "contato",  rotulo: "Contato" },
    { id: "rodape",   rotulo: "Rodapé" }
  ];

  /* =======================================================
     Componentes de campo
     ======================================================= */
  function campoTexto(caminho, rotulo, dica, tipo) {
    var v = pegar(estado.dados, caminho);
    var atributos = 'data-caminho="' + esc(caminho) + '"';
    var corpo = tipo === "textarea"
      ? "<textarea " + atributos + ">" + esc(v) + "</textarea>"
      : '<input type="' + (tipo === "url" ? "url" : "text") + '" ' + atributos + ' value="' + esc(v) + '">';
    return '<div class="campo"><label>' + esc(rotulo) +
           (dica ? ' <span class="dica">— ' + esc(dica) + "</span>" : "") + "</label>" + corpo + "</div>";
  }

  function campoLista(caminho, rotulo, dica) {
    var v = pegar(estado.dados, caminho) || [];
    return '<div class="campo"><label>' + esc(rotulo) +
           (dica ? ' <span class="dica">— ' + esc(dica) + "</span>" : "") + "</label>" +
           '<input type="text" data-caminho="' + esc(caminho) + '" data-lista-texto="1" value="' +
           esc(v.join(", ")) + '"></div>';
  }

  function campoSelect(caminho, rotulo, opcoes) {
    var v = pegar(estado.dados, caminho);
    var ops = Object.keys(opcoes).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === v ? " selected" : "") + ">" + esc(opcoes[k]) + "</option>";
    }).join("");
    return '<div class="campo"><label>' + esc(rotulo) + "</label>" +
           '<select data-caminho="' + esc(caminho) + '">' + ops + "</select></div>";
  }

  function campoCheck(caminho, rotulo) {
    var v = pegar(estado.dados, caminho);
    return '<label class="check"><input type="checkbox" data-caminho="' + esc(caminho) + '"' +
           (v !== false ? " checked" : "") + "> " + esc(rotulo) + "</label>";
  }

  function campoImagem(caminho, rotulo, pasta, nomeBase, redonda, largura) {
    var v = pegar(estado.dados, caminho) || "";
    return '<div class="campo"><label>' + esc(rotulo) +
             ' <span class="dica">— JPG, PNG, WebP ou SVG. Redimensionada e otimizada automaticamente.</span></label>' +
           '<div class="img-campo">' +
             '<img class="img-previa' + (redonda ? " redonda" : "") + '" src="' + esc(v) +
               '" alt="" onerror="this.style.opacity=.25">' +
             '<div class="img-acoes">' +
               '<input type="file" accept="image/*" data-upload="' + esc(caminho) + '" data-pasta="' + esc(pasta) +
                 '" data-nome="' + esc(nomeBase) + '" data-largura="' + (largura || 1600) + '">' +
               '<input type="text" data-caminho="' + esc(caminho) + '" value="' + esc(v) +
                 '" placeholder="assets/projetos/NOME.png">' +
             "</div>" +
           "</div></div>";
  }

  function cabecalhoItem(lista, indice, nome, total) {
    return '<div class="item__topo">' +
             '<span class="item__nome">' + esc(nome || ("Item " + (indice + 1))) + "</span>" +
             '<span class="item__ordem">' +
               '<button class="btn btn-sec btn-mini" data-acao="subir" data-lista="' + esc(lista) + '" data-i="' + indice +
                 '"' + (indice === 0 ? " disabled" : "") + ' title="Mover para cima">↑</button>' +
               '<button class="btn btn-sec btn-mini" data-acao="descer" data-lista="' + esc(lista) + '" data-i="' + indice +
                 '"' + (indice === total - 1 ? " disabled" : "") + ' title="Mover para baixo">↓</button>' +
               '<button class="btn btn-perigo btn-mini" data-acao="remover" data-lista="' + esc(lista) + '" data-i="' + indice +
                 '">Remover</button>' +
             "</span></div>";
  }

  function botaoAdicionar(lista, rotulo) {
    return '<button class="btn btn-primario" data-acao="adicionar" data-lista="' + esc(lista) + '">+ ' + esc(rotulo) + "</button>";
  }

  /* =======================================================
     Renderização das abas
     ======================================================= */
  var RENDER = {};

  RENDER.conexao = function () {
    var c = estado.conexao;
    return '<h2 class="secao-titulo">Conexão com o GitHub</h2>' +
      '<p class="secao-ajuda">É o que permite publicar direto daqui: o painel grava o conteúdo e as imagens no ' +
      'repositório, e o GitHub Pages atualiza o site em cerca de 1 minuto. Sem preencher isto, o painel ainda funciona ' +
      'em modo offline (editar, pré-visualizar e baixar o JSON para subir na mão).</p>' +

      '<div class="aviso"><strong>Sobre o token.</strong> Use um <em>fine-grained token</em> com acesso ' +
      '<strong>apenas a este repositório</strong>, permissão <code>Contents: Read and write</code> e data de expiração. ' +
      'Ele fica salvo só neste navegador (localStorage) e nunca é enviado a outro lugar além da API do GitHub. ' +
      'Não abra este painel em computador compartilhado.</div>' +

      '<div class="linha">' +
        '<div class="campo"><label>Usuário ou organização</label><input type="text" id="cx-owner" value="' + esc(c.owner) + '" placeholder="Leo-Deitos"></div>' +
        '<div class="campo"><label>Repositório</label><input type="text" id="cx-repo" value="' + esc(c.repo) + '" placeholder="portfolio"></div>' +
      "</div>" +
      '<div class="linha">' +
        '<div class="campo"><label>Branch</label><input type="text" id="cx-branch" value="' + esc(c.branch || "master") + '" placeholder="main"></div>' +
        '<div class="campo"><label>Token <span class="dica">— github_pat_...</span></label><input type="password" id="cx-token" value="' + esc(c.token) + '" autocomplete="off"></div>' +
      "</div>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-primario" id="btn-salvar-conexao">Salvar conexão</button>' +
        '<button class="btn btn-sec" id="btn-testar">Testar conexão</button>' +
        '<button class="btn btn-perigo" id="btn-limpar-token">Apagar token deste navegador</button>' +
      "</div>";
  };

  RENDER.geral = function () {
    return '<h2 class="secao-titulo">Geral e SEO</h2>' +
      '<p class="secao-ajuda">Título da aba do navegador, descrição que aparece no Google e no compartilhamento de link, e o logotipo.</p>' +
      campoTexto("site.titulo", "Título da página") +
      campoTexto("site.descricao", "Descrição (meta description)", "até ~160 caracteres", "textarea") +
      campoTexto("site.nomeMenu", "Nome exibido no menu") +
      campoImagem("site.logo", "Logotipo", "assets/img", "logo", false, 400);
  };

  RENDER.hero = function () {
    return '<h2 class="secao-titulo">Abertura (topo do site)</h2>' +
      '<p class="secao-ajuda">O primeiro nome aparece em verde. A foto é circular, no canto superior direito.</p>' +
      campoImagem("hero.foto", "Foto de perfil", "assets/img", "perfil", true, 600) +
      campoTexto("hero.fotoAlt", "Texto alternativo da foto", "acessibilidade e leitores de tela") +
      '<div class="linha">' +
        campoTexto("hero.nomeDestaque", "Nome (em verde)") +
        campoTexto("hero.nomeResto", "Sobrenome") +
      "</div>" +
      campoTexto("hero.rotulo", "Etiqueta acima do nome") +
      campoTexto("hero.subtitulo", "Subtítulo", "", "textarea") +
      '<div class="linha">' +
        campoTexto("hero.botaoTexto", "Botão principal — texto") +
        campoTexto("hero.botaoHref", "Botão principal — destino", "âncora interna, ex: #sobre-mim") +
      "</div>" +
      '<div class="linha">' +
        campoTexto("hero.botaoSecundarioTexto", "Botão secundário — texto") +
        campoTexto("hero.botaoSecundarioHref", "Botão secundário — destino") +
      "</div>";
  };

  RENDER.sobre = function () {
    return '<h2 class="secao-titulo">Sobre mim</h2>' +
      '<p class="secao-ajuda">O número em destaque aparece grande, em verde, ao lado do texto.</p>' +
      campoTexto("sobre.titulo", "Título da seção", 'a barra verde "|" é desenhada automaticamente') +
      '<div class="linha">' +
        campoTexto("sobre.numero", "Número em destaque") +
        campoTexto("sobre.numeroLegenda", "Legenda do número") +
      "</div>" +
      campoTexto("sobre.texto", "Texto principal", "", "textarea") +
      campoTexto("sobre.textoComplementar", "Texto complementar", "opcional — deixe vazio para ocultar", "textarea");
  };

  RENDER.habilidades = function () {
    var itens = pegar(estado.dados, "habilidades.itens") || [];
    var html = '<h2 class="secao-titulo">Principais habilidades</h2>' +
      '<p class="secao-ajuda">Cards com ícone, título e texto. Em desktop ficam 4 por linha; no celular, um embaixo do outro.</p>' +
      campoTexto("habilidades.titulo", "Título da seção");

    html += itens.map(function (it, i) {
      return '<div class="item">' + cabecalhoItem("habilidades.itens", i, it.titulo, itens.length) +
        campoSelect("habilidades.itens." + i + ".icone", "Ícone", listaIconesComoObjeto()) +
        campoTexto("habilidades.itens." + i + ".titulo", "Título") +
        campoTexto("habilidades.itens." + i + ".texto", "Texto", "", "textarea") +
      "</div>";
    }).join("");

    return html + botaoAdicionar("habilidades.itens", "Adicionar habilidade");
  };

  RENDER.projetos = function () {
    var itens = pegar(estado.dados, "projetos.itens") || [];
    var html = '<h2 class="secao-titulo">Projetos</h2>' +
      '<p class="secao-ajuda">Cada card vira um painel no site. O tipo define o selo mostrado e se o painel pode ser ' +
      'aberto dentro do próprio site (Power BI, HTML, SVG, Excel, Google Sheets, Looker, Tableau e PDF podem; ' +
      'Python, SQL e “Outro” abrem apenas em nova aba).</p>' +
      '<div class="aviso verde"><strong>Como importar um painel novo:</strong> clique em “Adicionar projeto”, ' +
      'escolha o tipo, cole o link de publicação e envie a imagem de capa. ' +
      'Power BI: <em>Arquivo → Inserir relatório → Publicar na web</em> e copie o link. ' +
      'Google Sheets: <em>Arquivo → Compartilhar → Publicar na web</em>. ' +
      'Excel: link do OneDrive/SharePoint com “Inserir”. ' +
      'HTML ou SVG: coloque o arquivo em <code>assets/embeds/</code> e use o caminho, ex. ' +
      '<code>assets/embeds/meu-painel.html</code>.</div>' +
      campoTexto("projetos.titulo", "Título da seção") +
      campoTexto("projetos.subtitulo", "Subtítulo da seção", "opcional");

    html += itens.map(function (p, i) {
      var base = "projetos.itens." + i;
      return '<div class="item">' + cabecalhoItem("projetos.itens", i, p.titulo, itens.length) +
        '<div class="linha">' +
          campoTexto(base + ".titulo", "Título do painel") +
          campoSelect(base + ".tipo", "Tipo / formato", TIPOS_PAINEL) +
        "</div>" +
        campoTexto(base + ".area", "Área de negócio", "ex: Financeiro, Logística, RH") +
        campoTexto(base + ".descricao", "Descrição", "objetivo do painel e o que ele responde", "textarea") +
        campoLista(base + ".indicadores", "Indicadores", "separados por vírgula — viram as etiquetas do card") +
        campoImagem(base + ".imagem", "Imagem de capa", "assets/projetos", p.titulo || ("projeto-" + (i + 1)), false, 1600) +
        campoTexto(base + ".link", "Link do painel", "URL de publicação ou caminho do arquivo", "url") +
        campoTexto(base + ".botao", "Texto do botão") +
        campoCheck(base + ".embed", "Permitir abrir dentro do site (botão do olho)") +
        campoCheck(base + ".visivel", "Visível no site") +
      "</div>";
    }).join("");

    return html + botaoAdicionar("projetos.itens", "Adicionar projeto");
  };

  RENDER.ajuda = function () {
    var itens = pegar(estado.dados, "ajuda.itens") || [];
    var html = '<h2 class="secao-titulo">Como posso te ajudar</h2>' +
      '<p class="secao-ajuda">Blocos de serviço. Dois por linha no desktop.</p>' +
      campoTexto("ajuda.titulo", "Título da seção");

    html += itens.map(function (it, i) {
      return '<div class="item">' + cabecalhoItem("ajuda.itens", i, it.titulo, itens.length) +
        campoSelect("ajuda.itens." + i + ".icone", "Ícone", listaIconesComoObjeto()) +
        campoTexto("ajuda.itens." + i + ".titulo", "Título") +
        campoTexto("ajuda.itens." + i + ".texto", "Texto", "", "textarea") +
      "</div>";
    }).join("");

    return html + botaoAdicionar("ajuda.itens", "Adicionar serviço");
  };

  RENDER.contato = function () {
    var itens = pegar(estado.dados, "contato.itens") || [];
    var html = '<h2 class="secao-titulo">Contato</h2>' +
      '<p class="secao-ajuda">Desmarque “ativo” para exibir o bloco sem link — é assim que o site mostra ' +
      '“Site: está em desenvolvimento”. E-mail usa <code>mailto:</code>, WhatsApp usa ' +
      '<code>https://wa.me/55DDDNUMERO</code>.</p>' +
      campoTexto("contato.titulo", "Título da seção") +
      campoTexto("contato.subtitulo", "Subtítulo", "opcional");

    html += itens.map(function (c, i) {
      var base = "contato.itens." + i;
      return '<div class="item">' + cabecalhoItem("contato.itens", i, c.rotulo, itens.length) +
        '<div class="linha">' +
          campoSelect(base + ".icone", "Ícone", listaIconesComoObjeto()) +
          campoTexto(base + ".rotulo", "Rótulo", "ex: E-mail") +
        "</div>" +
        campoTexto(base + ".valor", "Texto exibido") +
        campoTexto(base + ".href", "Link", "vazio = sem link", "url") +
        campoCheck(base + ".ativo", "Ativo (clicável)") +
      "</div>";
    }).join("");

    return html + botaoAdicionar("contato.itens", "Adicionar contato");
  };

  RENDER.rodape = function () {
    return '<h2 class="secao-titulo">Rodapé</h2>' +
      campoTexto("rodape.texto", "Texto principal", "o ano é inserido automaticamente") +
      campoTexto("rodape.nota", "Nota secundária", "opcional");
  };

  function listaIconesComoObjeto() {
    var o = {};
    ICONES_DISPONIVEIS.forEach(function (i) { o[i] = i; });
    return o;
  }

  /* =======================================================
     Modelos para novos itens
     ======================================================= */
  var MODELOS = {
    "habilidades.itens": { icone: "analise", titulo: "Nova habilidade", texto: "Descreva a habilidade." },
    "ajuda.itens":       { icone: "engrenagem", titulo: "Novo serviço", texto: "Descreva o serviço." },
    "contato.itens":     { icone: "link", rotulo: "Novo contato", valor: "", href: "", ativo: true },
    "projetos.itens":    {
      id: "", titulo: "Novo painel", tipo: "powerbi", area: "", descricao: "",
      indicadores: [], imagem: "", link: "", botao: "Ver detalhes", embed: true, visivel: true
    }
  };

  /* =======================================================
     Montagem da interface
     ======================================================= */
  function montarAbas() {
    $("#abas").innerHTML = ABAS.map(function (a) {
      return '<button type="button" data-aba="' + a.id + '"' +
             (a.id === estado.aba ? ' class="ativa"' : "") + ">" + esc(a.rotulo) + "</button>";
    }).join("");
  }

  function renderizarAba(manterPosicao) {
    var y = window.scrollY;
    montarAbas();
    var fn = RENDER[estado.aba];
    $("#conteudo").innerHTML = fn ? fn() : "";
    if (estado.aba === "conexao") ligarConexao();
    // so a troca de aba volta ao topo; upload e edicao de lista mantem o lugar,
    // senao o usuario perde de vista o card em que estava mexendo
    window.scrollTo(0, manterPosicao ? y : 0);
  }

  function atualizarEstadoConexao() {
    var ponto = $("#ponto-conexao"), txt = $("#txt-conexao");
    if (conexaoOk()) {
      ponto.className = "ponto ok";
      txt.textContent = estado.conexao.owner + "/" + estado.conexao.repo + " (" + estado.conexao.branch + ")";
    } else {
      ponto.className = "ponto pend";
      txt.textContent = "modo offline — sem GitHub";
    }
  }

  function ligarConexao() {
    $("#btn-salvar-conexao").addEventListener("click", function () {
      estado.conexao = {
        owner: $("#cx-owner").value.trim(),
        repo: $("#cx-repo").value.trim(),
        branch: $("#cx-branch").value.trim() || "main",
        token: $("#cx-token").value.trim()
      };
      try { localStorage.setItem(CHAVE_CONEXAO, JSON.stringify(estado.conexao)); } catch (e) {}
      atualizarEstadoConexao();
      log("Conexão salva neste navegador.", "ok");
    });

    $("#btn-testar").addEventListener("click", function () {
      if (!conexaoOk()) { log("Preencha usuário, repositório e token antes de testar.", "erro"); return; }
      log("Testando...");

      /* Ler não prova nada: repositório público é legível por qualquer token.
         O que importa é permissions.push — se for falso, o Publicar vai falhar com 403. */
      var c = estado.conexao;
      fetch("https://api.github.com/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo),
            { headers: ghCabecalhos(), cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error(mensagemErro(r));
          return r.json();
        })
        .then(function (repo) {
          if (!repo.permissions || !repo.permissions.push) {
            throw new Error("O token LÊ este repositório mas NÃO pode gravar. " +
              "Abra o token no GitHub e confira duas coisas: " +
              "(1) Repository access inclui " + c.owner + "/" + c.repo + "; " +
              "(2) Permissions → Contents está em 'Read and write', não 'Read-only'.");
          }
          return ghObter(CAMINHO_JSON);   // confirma também que a branch existe
        })
        .then(function (r) {
          log(r ? "Conexão OK — leitura e escrita liberadas, conteudo.json encontrado."
                : "Conexão OK — escrita liberada; data/conteudo.json será criado ao publicar.", "ok");
        })
        .catch(function (e) { log(e.message, "erro"); });
    });

    $("#btn-limpar-token").addEventListener("click", function () {
      estado.conexao.token = "";
      try { localStorage.setItem(CHAVE_CONEXAO, JSON.stringify(estado.conexao)); } catch (e) {}
      $("#cx-token").value = "";
      atualizarEstadoConexao();
      log("Token apagado deste navegador.", "ok");
    });
  }

  /* =======================================================
     Eventos de edição
     ======================================================= */
  function ligarEventosGlobais() {
    // troca de aba
    $("#abas").addEventListener("click", function (e) {
      var b = e.target.closest("[data-aba]");
      if (!b) return;
      estado.aba = b.getAttribute("data-aba");
      renderizarAba();
    });

    // digitação em qualquer campo ligado a um caminho
    $("#conteudo").addEventListener("input", function (e) {
      var el = e.target.closest("[data-caminho]");
      if (!el) return;
      var caminho = el.getAttribute("data-caminho");
      var valor;
      if (el.type === "checkbox") valor = el.checked;
      else if (el.hasAttribute("data-lista-texto")) {
        valor = el.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      } else valor = el.value;
      definir(estado.dados, caminho, valor);
      marcarSujo();

      // espelha o texto do caminho de imagem na prévia
      var previa = el.closest(".img-campo") && el.closest(".img-campo").querySelector(".img-previa");
      if (previa && el.type === "text") { previa.src = el.value; previa.style.opacity = 1; }
    });
    $("#conteudo").addEventListener("change", function (e) {
      var el = e.target.closest("[data-caminho]");
      if (el && (el.tagName === "SELECT" || el.type === "checkbox")) {
        definir(estado.dados, el.getAttribute("data-caminho"),
                el.type === "checkbox" ? el.checked : el.value);
        marcarSujo();
      }
    });

    // ações de lista
    $("#conteudo").addEventListener("click", function (e) {
      var b = e.target.closest("[data-acao]");
      if (!b) return;
      var lista = b.getAttribute("data-lista");
      var arr = pegar(estado.dados, lista) || [];
      var i = parseInt(b.getAttribute("data-i"), 10);

      switch (b.getAttribute("data-acao")) {
        case "adicionar":
          arr.push(JSON.parse(JSON.stringify(MODELOS[lista] || {})));
          definir(estado.dados, lista, arr);
          break;
        case "remover":
          if (!confirm("Remover “" + (arr[i].titulo || arr[i].rotulo || "este item") + "”?")) return;
          arr.splice(i, 1);
          break;
        case "subir":
          if (i > 0) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
          break;
        case "descer":
          if (i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
          break;
      }
      marcarSujo();
      renderizarAba(true);
    });

    // upload de imagem
    $("#conteudo").addEventListener("change", function (e) {
      var input = e.target.closest("[data-upload]");
      if (!input || !input.files || !input.files[0]) return;
      var caminho = input.getAttribute("data-upload");
      var pasta = input.getAttribute("data-pasta");
      var nome = input.getAttribute("data-nome");
      var largura = parseInt(input.getAttribute("data-largura"), 10) || 1600;

      log("Enviando imagem...");
      enviarImagem(input.files[0], pasta, nome, largura)
        .then(function (r) {
          definir(estado.dados, caminho, r.caminho);
          // nome do card, para o aviso deixar claro onde a capa foi aplicada
          var partes = caminho.split("."); partes.pop();
          var dono = pegar(estado.dados, partes.join(".")) || {};
          var onde = dono.titulo ? ' em "' + dono.titulo + '"' : "";
          marcarSujo();
          renderizarAba(true);
          log(r.embutida
            ? "Imagem embutida no conteúdo" + onde + " (" + r.kb + " KB). Configure a Conexão para gravá-la como arquivo."
            : "Capa" + onde + " publicada: " + r.caminho + " (" + r.kb + " KB).", "ok");
        })
        .catch(function (err) { log("Falha no envio: " + err.message, "erro"); });
    });

    // barra inferior
    $("#btn-recarregar").addEventListener("click", function () {
      if (estado.sujo && !confirm("Há alterações não publicadas. Recarregar e descartá-las?")) return;
      carregarConteudo(true);
    });

    $("#btn-previa").addEventListener("click", function () {
      salvarRascunho();
      window.open("index.html?rascunho=1", "_blank", "noopener");
    });

    $("#btn-baixar").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(estado.dados, null, 2) + "\n"], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "conteudo.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      log("conteudo.json baixado. Substitua o arquivo em data/ do repositório.", "ok");
    });

    $("#importar-json").addEventListener("change", function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          estado.dados = JSON.parse(fr.result);
          marcarSujo();
          renderizarAba();
          log("JSON importado.", "ok");
        } catch (err) { log("Arquivo inválido: " + err.message, "erro"); }
      };
      fr.readAsText(f);
      e.target.value = "";
    });

    $("#btn-publicar").addEventListener("click", publicar);

    window.addEventListener("beforeunload", function (e) {
      if (!estado.sujo) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  /* =======================================================
     Carregar e publicar
     ======================================================= */
  function carregarConteudo(forcarRemoto) {
    function aplicar(dados, origem) {
      estado.dados = dados;
      estado.sujo = false;
      renderizarAba();
      log("Conteúdo carregado (" + origem + ").", "ok");
    }

    if (conexaoOk() && forcarRemoto !== false) {
      log("Carregando do GitHub...");
      ghObter(CAMINHO_JSON)
        .then(function (r) {
          if (r && r.content) { aplicar(JSON.parse(base64ParaUtf8(r.content)), "GitHub"); return; }
          carregarLocal();
        })
        .catch(function (e) { log(e.message + " Usando a cópia local.", "erro"); carregarLocal(); });
    } else {
      carregarLocal();
    }

    function carregarLocal() {
      fetch(CAMINHO_JSON + "?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { aplicar(d, "arquivo local"); })
        .catch(function () {
          if (window.CONTEUDO_PADRAO) aplicar(JSON.parse(JSON.stringify(window.CONTEUDO_PADRAO)), "cópia embutida");
          else log("Não foi possível carregar o conteúdo.", "erro");
        });
    }
  }

  function publicar() {
    if (!conexaoOk()) {
      log("Sem conexão com o GitHub. Use “Baixar JSON” e suba o arquivo manualmente, ou configure a aba Conexão.", "erro");
      estado.aba = "conexao";
      renderizarAba();
      return;
    }
    var botao = $("#btn-publicar");
    botao.disabled = true;
    log("Publicando...");

    estado.dados.atualizadoEm = new Date().toISOString().slice(0, 10);
    var json = JSON.stringify(estado.dados, null, 2) + "\n";
    var js = CABECALHO_JS + json.trim() + ";\n";
    var carimbo = new Date().toLocaleString("pt-BR");

    ghGravarTexto(CAMINHO_JSON, json, "chore(portfolio): atualiza conteudo (" + carimbo + ")")
      .then(function () { return ghGravarTexto(CAMINHO_JS, js, "chore(portfolio): sincroniza fallback do conteudo"); })
      .then(function () {
        estado.sujo = false;
        log("Publicado. O GitHub Pages costuma refletir em até 1 minuto.", "ok");
      })
      .catch(function (e) { log("Falha ao publicar: " + e.message, "erro"); })
      .finally(function () { botao.disabled = false; });
  }

  /* =======================================================
     Início
     ======================================================= */
  document.addEventListener("DOMContentLoaded", function () {
    try {
      var salvo = localStorage.getItem(CHAVE_CONEXAO);
      if (salvo) estado.conexao = Object.assign(estado.conexao, JSON.parse(salvo));
    } catch (e) {}

    atualizarEstadoConexao();
    ligarEventosGlobais();
    estado.aba = conexaoOk() ? "geral" : "conexao";
    carregarConteudo();
  });
})();
