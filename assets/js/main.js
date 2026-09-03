// Leo Deitos — Portfolio de Dashboards
// Lightbox simples para as galerias de screenshots.

document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.querySelector("[data-lightbox]");
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector("img");
  const triggers = document.querySelectorAll("[data-lightbox-trigger]");

  const open = (src, alt) => {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      open(trigger.getAttribute("src"), trigger.getAttribute("alt"));
    });
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.closest("[data-lightbox-close]")) {
      close();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
});


// Filtro da grade de projetos por ferramenta.
// As opcoes saem dos proprios cards: chip azul (.tag sem modificador de cor)
// = ferramenta; verde = setor; roxo = natureza do dado. Adicionar um projeto
// novo na grade basta para a opcao aparecer aqui.

document.addEventListener("DOMContentLoaded", () => {
  const painel = document.getElementById("toolFilter");
  const grade = document.getElementById("projectGrid");
  if (!painel || !grade) return;

  const cards = Array.from(grade.querySelectorAll(".project-card"));
  if (cards.length < 2) return;

  const ferramentasDoCard = (card) =>
    Array.from(card.querySelectorAll(".tag"))
      .filter((t) => !t.classList.contains("tag-green") && !t.classList.contains("tag-purple"))
      .map((t) => t.textContent.trim());

  // conta em quantos cards cada ferramenta aparece
  const contagem = new Map();
  cards.forEach((card) => {
    new Set(ferramentasDoCard(card)).forEach((f) => {
      contagem.set(f, (contagem.get(f) || 0) + 1);
    });
  });

  // uma ferramenta presente em todos os cards nao separa nada: vira ruido
  const opcoes = Array.from(contagem.entries())
    .filter(([, n]) => n < cards.length)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));

  if (!opcoes.length) return;

  const caixa = painel.querySelector(".tool-filter-chips");
  const chips = [];

  const criarChip = (rotulo, valor, contador) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tool-chip";
    b.dataset.valor = valor;
    b.setAttribute("aria-pressed", valor === "" ? "true" : "false");
    b.innerHTML =
      rotulo + (contador == null ? "" : ' <span class="count">' + contador + "</span>");
    b.addEventListener("click", () => aplicar(valor));
    caixa.appendChild(b);
    chips.push(b);
  };

  criarChip("Todos", "", cards.length);
  opcoes.forEach(([ferramenta, n]) => criarChip(ferramenta, ferramenta, n));

  const aplicar = (valor) => {
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.valor === valor)));
    cards.forEach((card) => {
      card.hidden = valor !== "" && !ferramentasDoCard(card).includes(valor);
    });
  };

  painel.hidden = false;
});
