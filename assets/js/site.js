/* =========================================================
   Portfólio Leomar Deitos — renderização do site público
   Fonte de verdade: data/conteudo.json
   Fallback (abertura via file://): window.CONTEUDO_PADRAO
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. Biblioteca de ícones (SVG inline, herda currentColor)
     --------------------------------------------------------- */
  var ICONES = {
    analise:  '<path d="M3 3v18h18"/><path d="M7 15l3.5-4 3 3L21 6"/>',
    design:   '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    projetos: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    logistica:'<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    planilha: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    engrenagem:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
    banco:    '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M12 2L2 8h20L12 2z"/>',
    site:     '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    email:    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-11h4v1.5A5 5 0 0 1 16 8z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    github:   '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
    whatsapp: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    telefone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    powerbi:  '<path d="M4 21V9h5v12M11 21V3h5v18M18 21v-8h3v8"/>',
    codigo:   '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    html:     '<path d="M4 3l1.6 17L12 22l6.4-2L20 3H4z"/><path d="M8 8h8l-.5 4H9l.3 3.5 2.7.8 2.7-.8.2-2"/>',
    svg:      '<path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><path d="m12 22V12M21 7l-9 5M3 7l9 5"/>',
    excel:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 13 6 6M15 13l-6 6"/>',
    sheets:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M12 13v4"/>',
    link:     '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    seta:     '<path d="M7 17 17 7M7 7h10v10"/>',
    olho:     '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
  };

  function icone(nome, classe) {
    var d = ICONES[nome] || ICONES.link;
    return '<svg class="' + (classe || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  /* ---------------------------------------------------------
     2. Tipos de painel suportados (novos formatos entram aqui)
     --------------------------------------------------------- */
  var TIPOS = {
    powerbi: { rotulo: "Power BI",      icone: "powerbi", embutivel: true  },
    html:    { rotulo: "HTML",          icone: "html",    embutivel: true  },
    svg:     { rotulo: "SVG",           icone: "svg",     embutivel: true  },
    excel:   { rotulo: "Excel",         icone: "excel",   embutivel: true  },
    sheets:  { rotulo: "Google Sheets", icone: "sheets",  embutivel: true  },
    looker:  { rotulo: "Looker Studio", icone: "dashboard", embutivel: true },
    tableau: { rotulo: "Tableau",       icone: "dashboard", embutivel: true },
    python:  { rotulo: "Python",        icone: "codigo",  embutivel: false },
    sql:     { rotulo: "SQL",           icone: "codigo",  embutivel: false },
    pdf:     { rotulo: "PDF",           icone: "link",    embutivel: true  },
    link:    { rotulo: "Projeto",       icone: "link",    embutivel: false }
  };
  window.TIPOS_PAINEL = TIPOS; // reaproveitado pelo admin

  /* ---------------------------------------------------------
     3. Utilitários
     --------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function valorPorCaminho(obj, caminho) {
    return caminho.split(".").reduce(function (acc, chave) {
      return acc == null ? undefined : acc[chave];
    }, obj);
  }

  function escapar(txt) {
    return String(txt == null ? "" : txt)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* URL segura: bloqueia javascript: e afins vindos do JSON editável.
     Lista o que é PROIBIDO (esquemas), não o que é permitido — assim qualquer
     caminho relativo do repositório funciona (projects/, paineis/, etc.).
     permitirDados=true libera data:image/, usado quando o painel embute a capa. */
  function urlSegura(url, permitirDados) {
    var u = String(url == null ? "" : url).trim();
    if (!u) return "";
    // tab e quebra de linha no meio do esquema sao truque classico ("java	script:")
    u = u.replace(new RegExp("[\u0000-\u001F\u007F]","g"), "");
    var esquema = u.match(/^([a-z][a-z0-9+.\-]*):/i);
    if (!esquema) return u;                       // relativo ou âncora
    var e = esquema[1].toLowerCase();
    if (e === "http" || e === "https" || e === "mailto" || e === "tel") return u;
    if (permitirDados && /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(u)) return u;
    return "";
  }

  /* Placeholder gerado em SVG — o card fica apresentável antes do upload da imagem.
     Sem título: ele já aparece logo abaixo no card, e escreveria por cima do selo. */
  function placeholder(titulo, tipoRotulo) {
    var s = escapar(String(tipoRotulo || "").toUpperCase());
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#26251F"/><stop offset="1" stop-color="#141412"/>' +
        '</linearGradient></defs>' +
        '<rect width="640" height="360" fill="url(#g)"/>' +
        '<g stroke="#5F8575" stroke-opacity=".13" stroke-width="1">' +
          '<path d="M0 110h640M0 180h640M0 250h640"/>' +
        '</g>' +
        '<g fill="#5F8575" fill-opacity=".20">' +
          '<rect x="286" y="214" width="52" height="96" rx="5"/>' +
          '<rect x="352" y="170" width="52" height="140" rx="5"/>' +
          '<rect x="418" y="238" width="52" height="72" rx="5"/>' +
          '<rect x="484" y="140" width="52" height="170" rx="5"/>' +
        '</g>' +
        '<path d="M300 262 L378 206 L444 232 L510 172" fill="none" ' +
          'stroke="#8FB3A3" stroke-opacity=".55" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<g fill="#8FB3A3" fill-opacity=".55">' +
          '<circle cx="300" cy="262" r="5"/><circle cx="378" cy="206" r="5"/>' +
          '<circle cx="444" cy="232" r="5"/><circle cx="510" cy="172" r="5"/>' +
        '</g>' +
        '<text x="60" y="318" fill="#8C877D" font-family="Inter,Segoe UI,Arial" ' +
          'font-size="15" letter-spacing="3">' + s + '</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* Avatar com iniciais, usado se a foto de perfil não existir */
  function avatarIniciais(nome) {
    var partes = String(nome || "L D").trim().split(/\s+/);
    var ini = (partes[0][0] || "L") + (partes.length > 1 ? partes[partes.length - 1][0] : "");
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        '<rect width="200" height="200" fill="#23221F"/>' +
        '<circle cx="100" cy="100" r="99" fill="#23221F" stroke="#5F8575" stroke-width="2"/>' +
        '<text x="100" y="128" text-anchor="middle" fill="#5F8575" font-family="Inter,Segoe UI,Arial" ' +
          'font-size="86" font-weight="700">' + escapar(ini.toUpperCase()) + '</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------------------------------------------------------
     4. Renderização
     --------------------------------------------------------- */

  /* data-bind="caminho"            -> textContent
     data-bind="caminho:href"       -> atributo
     data-bind="a.b|c.d:href"       -> múltiplos, separados por | */
  function aplicarBinds(dados) {
    $$("[data-bind]").forEach(function (el) {
      el.getAttribute("data-bind").split("|").forEach(function (regra) {
        var partes = regra.split(":");
        var caminho = partes[0].trim();
        var attr = (partes[1] || "").trim();
        var valor = valorPorCaminho(dados, caminho);
        if (valor === undefined || valor === null || valor === "") return;
        if (attr) {
          el.setAttribute(attr, (attr === "href" || attr === "src") ? (urlSegura(valor, attr === "src") || valor) : valor);
        } else {
          el.textContent = valor;
        }
      });
    });
  }

  function renderFoto(dados) {
    var img = $("#hero-foto");
    if (!img) return;
    var nome = (dados.hero.nomeDestaque || "") + " " + (dados.hero.nomeResto || "");
    var fallback = avatarIniciais(nome);
    img.alt = dados.hero.fotoAlt || ("Foto de " + nome.trim());
    img.onerror = function () { img.onerror = null; img.src = fallback; };
    img.src = dados.hero.foto ? (urlSegura(dados.hero.foto, true) || fallback) : fallback;
  }

  function renderCardsSimples(alvo, itens) {
    var el = $(alvo);
    if (!el) return;
    el.innerHTML = (itens || []).map(function (it) {
      return '<article class="card revelar">' +
               '<div class="card__icone">' + icone(it.icone) + '</div>' +
               '<h3 class="card__titulo">' + escapar(it.titulo) + '</h3>' +
               '<p class="card__texto">' + escapar(it.texto) + '</p>' +
             '</article>';
    }).join("");
  }

  function renderProjetos(itens) {
    var el = $("#lista-projetos");
    if (!el) return;

    var visiveis = (itens || []).filter(function (p) { return p.visivel !== false; });

    if (!visiveis.length) {
      el.innerHTML = '<p class="secao__subtitulo">Nenhum projeto publicado ainda.</p>';
      return;
    }

    el.innerHTML = visiveis.map(function (p, i) {
      var tipo = TIPOS[p.tipo] || TIPOS.link;
      var link = urlSegura(p.link);
      var img = urlSegura(p.imagem, true);
      var ph = placeholder(p.titulo, tipo.rotulo);
      var podeEmbutir = p.embed !== false && tipo.embutivel && !!link;

      var tags = (p.indicadores || []).slice(0, 5).map(function (t) {
        return "<li>" + escapar(t) + "</li>";
      }).join("");

      var botaoVer = link
        ? '<a class="btn btn--primario" href="' + escapar(link) + '" target="_blank" rel="noopener noreferrer">' +
            escapar(p.botao || "Ver detalhes") + icone("seta") +
          "</a>"
        : '<span class="btn btn--inativo">Em breve</span>';

      var botaoEmbed = podeEmbutir
        ? '<button class="btn btn--secundario btn--icone" type="button" data-embed="' + escapar(link) +
          '" data-titulo="' + escapar(p.titulo) + '" title="Visualizar aqui" aria-label="Visualizar ' +
          escapar(p.titulo) + ' nesta página">' + icone("olho") + "</button>"
        : "";

      return '<article class="projeto revelar" style="transition-delay:' + (i % 3) * 70 + 'ms">' +
               '<figure class="projeto__figura">' +
                 '<span class="projeto__selo">' + icone(tipo.icone) + escapar(tipo.rotulo) + "</span>" +
                 '<img class="projeto__img" loading="lazy" decoding="async" alt="Prévia do painel ' + escapar(p.titulo) + '"' +
                   ' src="' + escapar(img || ph) + '" data-ph="' + escapar(ph) + '">' +
               "</figure>" +
               '<div class="projeto__corpo">' +
                 (p.area ? '<p class="projeto__area">' + escapar(p.area) + "</p>" : "") +
                 '<h3 class="projeto__titulo">' + escapar(p.titulo) + "</h3>" +
                 '<p class="projeto__descricao">' + escapar(p.descricao) + "</p>" +
                 (tags ? '<ul class="projeto__tags">' + tags + "</ul>" : "") +
                 '<div class="projeto__acoes">' + botaoVer + botaoEmbed + "</div>" +
               "</div>" +
             "</article>";
    }).join("");

    /* imagem ausente cai para o placeholder gerado */
    $$("#lista-projetos .projeto__img").forEach(function (img) {
      img.onerror = function () { img.onerror = null; img.src = img.getAttribute("data-ph"); };
    });
  }

  function renderContato(itens) {
    var el = $("#lista-contato");
    if (!el) return;
    el.innerHTML = (itens || []).map(function (c) {
      var href = urlSegura(c.href);
      var ativo = c.ativo !== false && !!href;
      var tag = ativo ? "a" : "div";
      var attrs = ativo
        ? ' href="' + escapar(href) + '"' + (/^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "")
        : "";
      return "<" + tag + ' class="contato-item revelar' + (ativo ? "" : " contato-item--inativo") + '"' + attrs + ">" +
               '<span class="contato-item__icone">' + icone(c.icone) + "</span>" +
               "<span>" +
                 '<span class="contato-item__rotulo">' + escapar(c.rotulo) + "</span>" +
                 '<span class="contato-item__valor">' + escapar(c.valor) + "</span>" +
               "</span>" +
             "</" + tag + ">";
    }).join("");
  }

  function render(dados) {
    if (!dados) return;
    document.title = (dados.site && dados.site.titulo) || document.title;
    aplicarBinds(dados);
    renderFoto(dados);
    renderCardsSimples("#lista-habilidades", dados.habilidades && dados.habilidades.itens);
    renderCardsSimples("#lista-ajuda", dados.ajuda && dados.ajuda.itens);
    renderProjetos(dados.projetos && dados.projetos.itens);
    renderContato(dados.contato && dados.contato.itens);
    ativarRevelacao();
  }

  /* ---------------------------------------------------------
     5. Interações
     --------------------------------------------------------- */
  function ativarRevelacao() {
    var alvos = $$(".revelar:not(.visivel)");
    if (!("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      alvos.forEach(function (el) { el.classList.add("visivel"); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visivel"); obs.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    alvos.forEach(function (el) { obs.observe(el); });
  }

  function ativarMenu() {
    var botao = $(".topo__botao-menu");
    var nav = $("#menu-principal");
    if (!botao || !nav) return;

    botao.addEventListener("click", function () {
      var aberto = nav.classList.toggle("aberto");
      botao.setAttribute("aria-expanded", String(aberto));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("aberto");
        botao.setAttribute("aria-expanded", "false");
      }
    });

    var topo = $(".topo");
    var aoRolar = function () { topo.classList.toggle("rolou", window.scrollY > 8); };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
  }

  function ativarScrollSpy() {
    var secoes = $$("main section[id]");
    var links = $$(".topo__nav a[href^='#']");
    if (!secoes.length || !("IntersectionObserver" in window)) return;

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("ativo", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secoes.forEach(function (s) { obs.observe(s); });
  }

  function ativarModal() {
    var modal = $("#modal");
    var corpo = $("#modal-corpo");
    var titulo = $("#modal-titulo");
    var abrirExterno = $("#modal-abrir");
    if (!modal) return;

    function abrir(url, nome) {
      titulo.textContent = nome;
      abrirExterno.href = url;
      corpo.innerHTML = '<iframe src="' + escapar(url) + '" title="' + escapar(nome) +
                        '" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>';
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      $(".modal__fechar").focus();
    }
    function fechar() {
      modal.hidden = true;
      corpo.innerHTML = "";           // interrompe o carregamento do iframe
      document.body.style.overflow = "";
    }

    document.addEventListener("click", function (e) {
      var gatilho = e.target.closest("[data-embed]");
      if (gatilho) { abrir(gatilho.getAttribute("data-embed"), gatilho.getAttribute("data-titulo")); return; }
      if (e.target.closest("[data-fechar-modal]")) fechar();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) fechar();
    });
  }

  /* ---------------------------------------------------------
     6. Carregamento do conteúdo
     --------------------------------------------------------- */
  function carregar() {
    var padrao = window.CONTEUDO_PADRAO || null;

    /* Pré-visualização do admin: só com ?rascunho=1 na URL. O visitante nunca vê. */
    if (/[?&]rascunho=1/.test(location.search)) {
      try {
        var rascunho = localStorage.getItem("portfolio.rascunho");
        if (rascunho) {
          render(JSON.parse(rascunho));
          marcarPreview();
          return;
        }
      } catch (e) { /* localStorage indisponível — segue o fluxo normal */ }
    }

    if (padrao) render(padrao);   // pinta imediatamente, sem esperar a rede

    fetch("data/conteudo.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (dados) { render(dados); })
      .catch(function () {
        if (!padrao) console.warn("[portfolio] conteudo.json não carregou e não há conteúdo padrão embutido.");
      });
  }

  function marcarPreview() {
    var aviso = document.createElement("div");
    aviso.textContent = "Pré-visualização do rascunho (não publicado)";
    aviso.style.cssText = "position:fixed;bottom:14px;left:14px;z-index:200;background:#5F8575;color:#12211B;" +
                          "padding:8px 14px;border-radius:999px;font:600 13px Inter,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.4)";
    document.body.appendChild(aviso);
  }

  /* ---------------------------------------------------------
     7. Início
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var anoEl = document.getElementById("ano");
    if (anoEl) anoEl.textContent = new Date().getFullYear();
    ativarMenu();
    ativarModal();
    ativarScrollSpy();
    carregar();
  });

  /* exposto para o admin reutilizar ícones e placeholders */
  window.PORTFOLIO = { icone: icone, placeholder: placeholder, TIPOS: TIPOS };
})();
