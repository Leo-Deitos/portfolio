# Portfolio — Leo Deitos

Site estático (HTML/CSS/JS puro, sem build) com o portfólio de dashboards.

## Estrutura

```
index.html                     → página inicial (grid de projetos, sobre, contato)
projects/agro1.html            → estudo de caso do dashboard Agro1
assets/css/style.css           → estilos
assets/js/main.js              → lightbox das screenshots
assets/screenshots/<projeto>/  → imagens de cada dashboard
```

## Adicionar um novo projeto

1. Criar uma pasta em `assets/screenshots/<nome-do-projeto>/` com as imagens.
2. Duplicar `projects/agro1.html` como `projects/<nome-do-projeto>.html` e ajustar textos, ficha técnica e galeria.
3. Adicionar um novo `.project-card` em `index.html`, dentro de `#projetos`, apontando para o novo arquivo.

## Publicar no GitHub Pages

1. Fazer push deste repositório para o GitHub (branch `master` ou `main`).
2. No GitHub: **Settings → Pages → Source** → selecionar a branch e a pasta raiz (`/`).
3. O site fica disponível em `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.
