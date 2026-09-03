"""Gera a base sintetica do painel RH1 a partir dos marginais ja publicados
no estudo de caso (projects/rh1.html).

Regra do gerador: todo numero citado no estudo de caso e uma ANCORA e precisa
ser reproduzido exatamente. Os anos e cruzamentos nao documentados sao
preenchidos de forma deterministica (seed fixa) e plausivel, respeitando os
totais.

O ponto delicado e casar tres marginais que se restringem mutuamente:
contratacoes por ano, demissoes por ano e faixa de tempo de casa no
desligamento. Isso e resolvido por um pareamento guloso cronologico
(`parear_saidas`), nao por ajuste posterior de datas — ajustar depois quebra
os picos anuais e joga demissoes para fora do periodo da base.

Saida: JSON com 860 colaboradores, pronto para embutir no painel HTML.
"""

from __future__ import annotations

import bisect
import json
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 20260902
random.seed(SEED)

# --------------------------------------------------------------------------
# Ancoras extraidas do estudo de caso
# --------------------------------------------------------------------------

HEADCOUNT_ATIVO = 249
DESLIGADOS = 611
DATA_REFERENCIA = date(2020, 7, 31)

MASSA_SALARIAL_ATIVOS = 871_825.84
SALARIO_MAX = 39_460.80
SALARIO_MIN = 255.00

MASSA_HORAS_NORMAIS = 4_762_118.22
TOTAL_HORAS_EXTRAS = 269_109.74
TOTAL_ABSENTEISMO = 34_000.74

# Contratacoes por ano — 2011/2012/2013 e 2020 sao ancoras do texto;
# 2002-2010 e 2014-2019 preenchidos dentro das faixas descritas.
CONTRATACOES = {
    2002: 12, 2003: 15, 2004: 18, 2005: 22, 2006: 25, 2007: 28,
    2008: 32, 2009: 42, 2010: 54,
    2011: 62, 2012: 57, 2013: 110,
    2014: 75, 2015: 68, 2016: 52, 2017: 61, 2018: 55, 2019: 48,
    2020: 24,
}

# Demissoes por ano — 2013, 2014, 2019 e 2020 sao ancoras.
# Os primeiros anos ficam baixos porque nao ha quadro suficiente para desligar.
DEMISSOES = {
    2002: 1, 2003: 3, 2004: 5, 2005: 8, 2006: 11, 2007: 14,
    2008: 18, 2009: 23, 2010: 29, 2011: 35, 2012: 44,
    2013: 58, 2014: 62, 2015: 53, 2016: 49, 2017: 40, 2018: 41,
    2019: 76, 2020: 41,
}

# Faixa de tempo de casa no desligamento -> (quantidade, dias min, dias max)
RETENCAO = {
    "Até 60 dias": (104, 5, 59),
    "De 60 a 365 dias": (365, 60, 365),
    "Acima de 365 dias": (142, 366, 5000),
}

# Quadro ativo — distribuicoes marginais (somam 249 cada)
ESCOLARIDADE_ATIVOS = {
    "Ensino Médio Completo": 107,
    "Superior Completo": 47,
    "Ensino Médio Incompleto": 34,
    "Superior Incompleto": 22,
    "Outros níveis": 39,
}

FAIXA_ETARIA_ATIVOS = {"15-24": 10, "25-34": 28, "35-44": 106, "45-54": 87, "55+": 18}

GENERO_ATIVOS = {"Masculino": 154, "Feminino": 95}

# cargo -> (qtd ativos, salario base mensal)
CARGOS_ATIVOS = {
    "Operador": (49, 2_650.00),
    "Gestor": (22, 9_800.00),
    "Ajudante": (15, 1_680.00),
    "Assistente": (13, 2_400.00),
    "Resinador I": (13, 2_180.00),
    "Analista": (18, 4_900.00),
    "Auxiliar Administrativo": (16, 2_050.00),
    "Supervisor": (14, 6_400.00),
    "Mecânico de Manutenção I": (12, 3_450.00),
    "Motorista": (11, 2_900.00),
    "Eletricista de Manutenção Geral I": (10, 3_600.00),
    "Operador de Ponte Rolante I": (9, 3_100.00),
    "Coordenador": (9, 7_600.00),
    "Encarregado": (9, 4_200.00),
    "Técnico de Segurança": (8, 3_800.00),
    "Almoxarife": (7, 2_300.00),
    "Estagiário": (6, 1_400.00),
    "Aprendiz": (5, 700.00),
    "Diretor": (3, 22_000.00),
}

CAUSA_DESLIGAMENTO = {"Passivo": 395, "Espontâneo": 144, "Ativo": 72}

# Concentracao de hora extra (peso relativo por cargo)
PESO_HORA_EXTRA = {
    "Mecânico de Manutenção I": 9.0,
    "Resinador I": 7.5,
    "Eletricista de Manutenção Geral I": 6.8,
    "Operador de Ponte Rolante I": 5.9,
    "Operador": 2.2,
    "Motorista": 1.9,
    "Ajudante": 1.4,
    "Encarregado": 1.1,
    "Almoxarife": 0.8,
    "Assistente": 0.5,
    "Auxiliar Administrativo": 0.4,
    "Técnico de Segurança": 0.4,
    "Analista": 0.2,
    "Supervisor": 0.15,
    "Coordenador": 0.1,
    "Gestor": 0.05,
    "Estagiário": 0.0,
    "Aprendiz": 0.0,
    "Diretor": 0.0,
}


def expandir(marginal: dict[str, int]) -> list[str]:
    """Transforma {categoria: n} numa lista embaralhada com n repeticoes."""
    lista = [chave for chave, n in marginal.items() for _ in range(n)]
    random.shuffle(lista)
    return lista


def datas_do_ano(ano: int, quantidade: int) -> list[date]:
    """Sorteia datas dentro do ano. 2020 para em 31/07 (fim da base)."""
    inicio = date(ano, 1, 1)
    fim = DATA_REFERENCIA if ano == 2020 else date(ano, 12, 31)
    vao = (fim - inicio).days
    return [inicio + timedelta(days=random.randint(0, vao)) for _ in range(quantidade)]


def parear_saidas(
    admissoes: list[date], saidas: list[date]
) -> dict[int, tuple[date, str]]:
    """Casa cada demissao com uma admissao respeitando a faixa de tempo de casa.

    Percorre as saidas em ordem cronologica. Para cada uma, considera apenas as
    faixas que ainda tem cota E que encontram admissao disponivel na janela
    correspondente; entre elas escolhe a de maior cota restante proporcional,
    para nao esgotar cedo uma faixa que so serve a saidas tardias.

    Returns:
        Mapa indice_da_admissao -> (data_de_saida, nome_da_faixa).
    """
    disponiveis = sorted(range(len(admissoes)), key=lambda i: admissoes[i])
    datas_ordenadas = [admissoes[i] for i in disponiveis]

    cota = {nome: qtd for nome, (qtd, _, _) in RETENCAO.items()}
    total = dict(cota)
    resultado: dict[int, tuple[date, str]] = {}

    for saida in sorted(saidas):
        candidatas: list[tuple[float, str, int]] = []

        for nome, (_, dias_min, dias_max) in RETENCAO.items():
            if cota[nome] == 0:
                continue
            # admissao precisa estar entre saida-dias_max e saida-dias_min
            inicio = saida - timedelta(days=dias_max)
            fim = saida - timedelta(days=dias_min)
            esq = bisect.bisect_left(datas_ordenadas, inicio)
            dir_ = bisect.bisect_right(datas_ordenadas, fim)
            if esq >= dir_:
                continue
            # dentro da janela, pega a admissao mais antiga ainda livre:
            # libera as recentes para saidas futuras
            posicao = esq
            candidatas.append((cota[nome] / total[nome], nome, posicao))

        if not candidatas:
            raise RuntimeError(
                f"sem admissão compatível para a saída de {saida.isoformat()} — "
                "ajuste DEMISSOES ou CONTRATACOES"
            )

        _, faixa, posicao = max(candidatas, key=lambda t: t[0])
        indice = disponiveis.pop(posicao)
        datas_ordenadas.pop(posicao)
        cota[faixa] -= 1
        resultado[indice] = (saida, faixa)

    return resultado


def gerar() -> dict:
    # ---- 1. admissoes (total = 860) ----
    admissoes: list[date] = []
    for ano, qtd in CONTRATACOES.items():
        admissoes.extend(datas_do_ano(ano, qtd))
    admissoes.sort()
    assert len(admissoes) == HEADCOUNT_ATIVO + DESLIGADOS

    # ---- 2. saidas (total = 611) e pareamento com as admissoes ----
    saidas: list[date] = []
    for ano, qtd in DEMISSOES.items():
        saidas.extend(datas_do_ano(ano, qtd))
    assert len(saidas) == DESLIGADOS

    pareamento = parear_saidas(admissoes, saidas)
    ativos_idx = [i for i in range(len(admissoes)) if i not in pareamento]
    assert len(ativos_idx) == HEADCOUNT_ATIVO

    causas = expandir(CAUSA_DESLIGAMENTO)

    # ---- 3. atributos do quadro ATIVO seguem os marginais publicados ----
    escolaridade_ativos = expandir(ESCOLARIDADE_ATIVOS)
    faixa_ativos = expandir(FAIXA_ETARIA_ATIVOS)
    genero_ativos = expandir(GENERO_ATIVOS)
    cargos_ativos = expandir({c: q for c, (q, _) in CARGOS_ATIVOS.items()})

    # ---- 4. salarios: base por cargo + variacao, depois escala para que a
    # massa dos ativos bata exatamente com a ancora ----
    salario: dict[int, float] = {}
    for ordem, idx in enumerate(ativos_idx):
        base = CARGOS_ATIVOS[cargos_ativos[ordem]][1]
        salario[idx] = base * random.uniform(0.82, 1.24)

    idx_diretor = next(i for o, i in enumerate(ativos_idx) if cargos_ativos[o] == "Diretor")
    idx_aprendiz = next(i for o, i in enumerate(ativos_idx) if cargos_ativos[o] == "Aprendiz")
    salario[idx_diretor] = SALARIO_MAX
    salario[idx_aprendiz] = SALARIO_MIN

    ajustaveis = [i for i in ativos_idx if i not in (idx_diretor, idx_aprendiz)]
    fator = (MASSA_SALARIAL_ATIVOS - SALARIO_MAX - SALARIO_MIN) / sum(
        salario[i] for i in ajustaveis
    )
    for i in ajustaveis:
        salario[i] = round(salario[i] * fator, 2)

    sobra = round(MASSA_SALARIAL_ATIVOS - sum(salario[i] for i in ativos_idx), 2)
    if sobra:
        # joga os centavos residuais no maior salario ajustavel, que nao e extremo
        alvo = max(ajustaveis, key=lambda i: salario[i])
        salario[alvo] = round(salario[alvo] + sobra, 2)

    # ---- 5. hora extra concentrada por cargo; absenteismo difuso ----
    peso_total = sum(PESO_HORA_EXTRA[cargos_ativos[o]] for o in range(len(ativos_idx)))
    hora_extra = {
        idx: round(TOTAL_HORAS_EXTRAS * PESO_HORA_EXTRA[cargos_ativos[o]] / peso_total, 2)
        for o, idx in enumerate(ativos_idx)
    }
    sobra = round(TOTAL_HORAS_EXTRAS - sum(hora_extra.values()), 2)
    if sobra:
        alvo = max(hora_extra, key=hora_extra.get)
        hora_extra[alvo] = round(hora_extra[alvo] + sobra, 2)

    sorteios = [random.uniform(0.2, 1.8) for _ in ativos_idx]
    soma = sum(sorteios)
    absenteismo = {
        idx: round(TOTAL_ABSENTEISMO * sorteios[o] / soma, 2)
        for o, idx in enumerate(ativos_idx)
    }
    sobra = round(TOTAL_ABSENTEISMO - sum(absenteismo.values()), 2)
    if sobra:
        alvo = max(absenteismo, key=absenteismo.get)
        absenteismo[alvo] = round(absenteismo[alvo] + sobra, 2)

    # ---- 6. monta os registros ----
    ordem_ativo = {idx: o for o, idx in enumerate(ativos_idx)}
    colaboradores: list[dict] = []
    contador_saida = 0

    for idx, admissao in enumerate(admissoes):
        if idx in ordem_ativo:
            o = ordem_ativo[idx]
            colaboradores.append({
                "id": idx + 1,
                "cargo": cargos_ativos[o],
                "escolaridade": escolaridade_ativos[o],
                "genero": genero_ativos[o],
                "faixaEtaria": faixa_ativos[o],
                "admissao": admissao.isoformat(),
                "demissao": None,
                "causa": None,
                "tempoCasaDias": (DATA_REFERENCIA - admissao).days,
                "salario": salario[idx],
                "horaExtra": hora_extra[idx],
                "absenteismo": absenteismo[idx],
            })
        else:
            saida, _ = pareamento[idx]
            cargo = random.choices(
                list(CARGOS_ATIVOS), weights=[q for q, _ in CARGOS_ATIVOS.values()], k=1
            )[0]
            colaboradores.append({
                "id": idx + 1,
                "cargo": cargo,
                "escolaridade": random.choices(
                    list(ESCOLARIDADE_ATIVOS), weights=list(ESCOLARIDADE_ATIVOS.values()), k=1
                )[0],
                "genero": random.choices(["Masculino", "Feminino"], weights=[62, 38], k=1)[0],
                "faixaEtaria": random.choices(
                    list(FAIXA_ETARIA_ATIVOS), weights=list(FAIXA_ETARIA_ATIVOS.values()), k=1
                )[0],
                "admissao": admissao.isoformat(),
                "demissao": saida.isoformat(),
                "causa": causas[contador_saida],
                "tempoCasaDias": (saida - admissao).days,
                "salario": round(CARGOS_ATIVOS[cargo][1] * random.uniform(0.8, 1.2), 2),
                "horaExtra": 0.0,
                "absenteismo": 0.0,
            })
            contador_saida += 1

    return {
        "meta": {
            "fonte": "Base sintética derivada dos marginais publicados no estudo de caso RH1",
            "seed": SEED,
            "periodo": "2002-01-01 a 2020-07-31",
            "dataReferencia": DATA_REFERENCIA.isoformat(),
            "colaboradores": len(colaboradores),
            "ativos": HEADCOUNT_ATIVO,
            "desligados": DESLIGADOS,
        },
        "ancoras": {
            "massaSalarialAtivos": MASSA_SALARIAL_ATIVOS,
            "massaHorasNormais": MASSA_HORAS_NORMAIS,
            "totalHorasExtras": TOTAL_HORAS_EXTRAS,
            "totalAbsenteismo": TOTAL_ABSENTEISMO,
            "salarioMaximo": SALARIO_MAX,
            "salarioMinimo": SALARIO_MIN,
            "linhasFolha": 27462,
        },
        "colaboradores": colaboradores,
    }


def conferir(dados: dict) -> None:
    """Valida o gerado contra as ancoras antes de gravar."""
    cols = dados["colaboradores"]
    ativos = [c for c in cols if c["demissao"] is None]
    desl = [c for c in cols if c["demissao"]]

    checagens: list[tuple[str, object, object]] = [
        ("total de colaboradores", len(cols), 860),
        ("ativos", len(ativos), HEADCOUNT_ATIVO),
        ("desligados", len(desl), DESLIGADOS),
        ("massa salarial", round(sum(c["salario"] for c in ativos), 2), MASSA_SALARIAL_ATIVOS),
        ("salário máximo", max(c["salario"] for c in ativos), SALARIO_MAX),
        ("salário mínimo", min(c["salario"] for c in ativos), SALARIO_MIN),
        ("hora extra", round(sum(c["horaExtra"] for c in ativos), 2), TOTAL_HORAS_EXTRAS),
        ("absenteísmo", round(sum(c["absenteismo"] for c in ativos), 2), TOTAL_ABSENTEISMO),
        ("má contratação (<60d)", sum(1 for c in desl if c["tempoCasaDias"] < 60), 104),
        ("saída 60-365d", sum(1 for c in desl if 60 <= c["tempoCasaDias"] <= 365), 365),
        ("saída >365d", sum(1 for c in desl if c["tempoCasaDias"] > 365), 142),
    ]

    for ano, qtd in CONTRATACOES.items():
        checagens.append(
            (f"contratações {ano}", sum(1 for c in cols if c["admissao"][:4] == str(ano)), qtd)
        )
    for ano, qtd in DEMISSOES.items():
        checagens.append(
            (f"demissões {ano}", sum(1 for c in desl if c["demissao"][:4] == str(ano)), qtd)
        )
    for esc, qtd in ESCOLARIDADE_ATIVOS.items():
        checagens.append(
            (f"escolaridade {esc}", sum(1 for c in ativos if c["escolaridade"] == esc), qtd)
        )
    for faixa, qtd in FAIXA_ETARIA_ATIVOS.items():
        checagens.append(
            (f"faixa {faixa}", sum(1 for c in ativos if c["faixaEtaria"] == faixa), qtd)
        )
    for causa, qtd in CAUSA_DESLIGAMENTO.items():
        checagens.append((f"causa {causa}", sum(1 for c in desl if c["causa"] == causa), qtd))
    for cargo, (qtd, _) in CARGOS_ATIVOS.items():
        checagens.append((f"cargo {cargo}", sum(1 for c in ativos if c["cargo"] == cargo), qtd))

    falhas = [c for c in checagens if c[1] != c[2]]
    for nome, obtido, esperado in checagens:
        if obtido != esperado:
            print(f"FALHA {nome}: {obtido} (esperado {esperado})")

    fora_periodo = [c for c in desl if c["demissao"] > DATA_REFERENCIA.isoformat()]
    invertidas = [c for c in desl if c["demissao"] < c["admissao"]]

    print(f"{len(checagens) - len(falhas)}/{len(checagens)} âncoras conferem")
    print(f"demissões fora do período da base: {len(fora_periodo)}")
    print(f"demissões anteriores à admissão: {len(invertidas)}")

    if falhas or fora_periodo or invertidas:
        raise SystemExit("\nValidação falhou — JSON não gravado.")


if __name__ == "__main__":
    dados = gerar()
    conferir(dados)
    destino = Path(__file__).with_name("rh1-dados.json")
    destino.write_text(
        json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"\nGravado: {destino.name} ({destino.stat().st_size / 1024:.0f} KB)")
