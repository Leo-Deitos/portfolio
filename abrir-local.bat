@echo off
chcp 65001 >nul
title Portfolio Leomar Deitos - servidor local
cd /d "%~dp0"

echo.
echo  ==============================================
echo   Portfolio - servidor local
echo  ==============================================
echo.

where py >nul 2>&1
if %errorlevel%==0 (
    echo  Servindo em http://localhost:8000
    echo  Site:   http://localhost:8000/index.html
    echo  Painel: http://localhost:8000/admin.html
    echo.
    echo  Feche esta janela para encerrar.
    start "" http://localhost:8000/index.html
    py -m http.server 8000
    goto fim
)

where python >nul 2>&1
if %errorlevel%==0 (
    echo  Servindo em http://localhost:8000
    start "" http://localhost:8000/index.html
    python -m http.server 8000
    goto fim
)

where npx >nul 2>&1
if %errorlevel%==0 (
    echo  Servindo com Node em http://localhost:8000
    start "" http://localhost:8000/index.html
    npx --yes http-server -p 8000 -c-1
    goto fim
)

echo  Nao encontrei Python nem Node neste computador.
echo.
echo  Opcoes:
echo    1^) Instale o Python: https://www.python.org/downloads/
echo    2^) Ou abra o index.html com dois cliques (o site funciona,
echo       mas usa a copia embutida do conteudo em vez do JSON^).
echo.
pause

:fim
