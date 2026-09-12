# Capas dos paineis

Coloque aqui as imagens de capa dos projetos (proporcao 16:9, ex. 1600x900).

O jeito facil e subir pelo painel (`admin.html` -> aba Projetos -> Imagem de capa):
ele redimensiona, converte para WebP e grava o arquivo aqui com o nome certo,
ja atualizando o caminho no `data/conteudo.json`.

Se preferir colocar na mao, use o nome do painel sem acento e com hifen no lugar
do espaco, e ajuste o campo `imagem` no JSON:

  Dashboard_DFC                       -> Dashboard_DFC.png
  Logistica1                          -> Logistica1.png
  RH1-dashboard                       -> RH1-dashboard.png
  Fluxo de Caixa Simulador Financeiro -> Fluxo-de-Caixa-Simulador-Financeiro.png
  Vendas1                             -> Vendas1.png
  Financas Pessoais 2024              -> Financas-Pessoais-2024.png

Enquanto a imagem nao existir, o card mostra um placeholder gerado em SVG com o
nome do painel. O site nao quebra.
