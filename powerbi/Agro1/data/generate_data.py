# -*- coding: utf-8 -*-
"""
Gera o dataset FICTICIO do Agro1 (portfolio).
Nenhum numero aqui vem de dados reais/sensiveis -- so mantem a mesma
ordem de grandeza e a mesma historia (Soja lider em margem e volume)
do dashboard original.
"""
import csv
import math
import os
import random

random.seed(42)

OUT_DIR = os.path.join(os.path.dirname(__file__))
os.makedirs(OUT_DIR, exist_ok=True)

CULTURAS = ["Soja", "Milho", "Trigo"]
UFS = ["PR", "RS", "SC"]
ANOS = [2019, 2020, 2021, 2022, 2023, 2024]

# ---------------------------------------------------------------
# 1) Cultura.csv
# ---------------------------------------------------------------
with open(os.path.join(OUT_DIR, "Cultura.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Cultura"])
    for c in CULTURAS:
        w.writerow([c])

# ---------------------------------------------------------------
# 2) UF.csv
# ---------------------------------------------------------------
UF_NOMES = {"PR": "Parana", "RS": "Rio Grande do Sul", "SC": "Santa Catarina"}
with open(os.path.join(OUT_DIR, "UF.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["UF", "UF_Nome"])
    for uf in UFS:
        w.writerow([uf, UF_NOMES[uf]])

# ---------------------------------------------------------------
# 3) Mesorregiao.csv
# ---------------------------------------------------------------
MESORREGIOES = [
    ("Noroeste Rio-Grandense", "RS"),
    ("Oeste Paranaense", "PR"),
    ("Sudoeste Paranaense", "PR"),
    ("Oeste Catarinense", "SC"),
]
with open(os.path.join(OUT_DIR, "Mesorregiao.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Mesorregiao", "UF"])
    for nome, uf in MESORREGIOES:
        w.writerow([nome, uf])

# ---------------------------------------------------------------
# 4) SafraAnoUF.csv  (producao por cultura/ano/UF + volume exportado)
# ---------------------------------------------------------------
ANNUAL_TOTALS = {
    "Soja":  {2019: 2_450_000, 2020: 2_720_000, 2021: 2_690_000, 2022: 2_340_000, 2023: 3_050_000, 2024: 3_600_000},
    "Milho": {2019: 1_150_000, 2020: 1_230_000, 2021: 1_080_000, 2022: 1_190_000, 2023: 1_320_000, 2024: 1_970_000},
    "Trigo": {2019:   420_000, 2020:   480_000, 2021:   510_000, 2022:   390_000, 2023:   560_000, 2024: 1_150_000},
}

UF_WEIGHTS = {
    "Soja":  {"RS": 0.62, "PR": 0.28, "SC": 0.10},
    "Milho": {"PR": 0.60, "RS": 0.28, "SC": 0.12},
    "Trigo": {"RS": 0.68, "PR": 0.22, "SC": 0.10},
}

EXPORT_RATIO = {"Soja": 0.58, "Milho": 0.22, "Trigo": 0.12}

safra_rows = []
for cultura in CULTURAS:
    for ano in ANOS:
        total = ANNUAL_TOTALS[cultura][ano]
        for uf in UFS:
            weight = UF_WEIGHTS[cultura][uf]
            noise = 1 + random.uniform(-0.04, 0.04)
            producao = round(total * weight * noise)
            exp_noise = 1 + random.uniform(-0.06, 0.06)
            exportado = round(producao * EXPORT_RATIO[cultura] * exp_noise)
            safra_rows.append([cultura, ano, uf, producao, exportado])

with open(os.path.join(OUT_DIR, "SafraAnoUF.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Cultura", "Ano", "UF", "Producao_ton", "Volume_Exportado_ton"])
    w.writerows(safra_rows)

# ---------------------------------------------------------------
# 5) SafraMesorregiao.csv  (snapshot do ultimo ano, 2024)
# ---------------------------------------------------------------
PRODUTIVIDADE_ALVO = {  # kg/ha
    "Soja": 3050,
    "Milho": 6400,
    "Trigo": 2650,
}
PR_SPLIT = {"Oeste Paranaense": 0.60, "Sudoeste Paranaense": 0.40}

# soma de producao 2024 por cultura/UF (a partir do safra_rows)
prod_2024 = {}
for cultura, ano, uf, producao, _exp in safra_rows:
    if ano == 2024:
        prod_2024[(cultura, uf)] = prod_2024.get((cultura, uf), 0) + producao

meso_rows = []
for cultura in CULTURAS:
    for nome, uf in MESORREGIOES:
        total_uf = prod_2024[(cultura, uf)]
        if uf == "PR":
            producao = round(total_uf * PR_SPLIT[nome])
        else:
            producao = total_uf
        kg_ha = PRODUTIVIDADE_ALVO[cultura] * (1 + random.uniform(-0.08, 0.08))
        area_ha = round(producao * 1000 / kg_ha)
        meso_rows.append([cultura, nome, area_ha, producao])

with open(os.path.join(OUT_DIR, "SafraMesorregiao.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Cultura", "Mesorregiao", "Area_ha", "Producao_ton"])
    w.writerows(meso_rows)

# ---------------------------------------------------------------
# 6) PrecoMensal.csv  (2019-01 .. 2026-07, R$/saca)
# ---------------------------------------------------------------
PRECO_INICIO = {"Soja": 82.00, "Milho": 38.50, "Trigo": 46.00}
PRECO_FIM = {"Soja": 128.40, "Milho": 58.20, "Trigo": 69.90}
CUSTO_INICIO = {"Soja": 52.00, "Milho": 34.00, "Trigo": 36.00}
CUSTO_FIM = {"Soja": 76.10, "Milho": 51.40, "Trigo": 55.60}

meses = []
y, m = 2019, 1
while (y, m) <= (2026, 7):
    meses.append((y, m))
    m += 1
    if m == 13:
        m = 1
        y += 1
n_meses = len(meses)

preco_rows = []
for cultura in CULTURAS:
    p0, p1 = PRECO_INICIO[cultura], PRECO_FIM[cultura]
    c0, c1 = CUSTO_INICIO[cultura], CUSTO_FIM[cultura]
    for i, (ano, mes) in enumerate(meses):
        t = i / (n_meses - 1)
        trend_p = p0 + (p1 - p0) * t
        trend_c = c0 + (c1 - c0) * t
        seasonal = 1 + 0.035 * math.sin(2 * math.pi * (mes / 12) + hash(cultura) % 5)
        noise = 1 + random.uniform(-0.03, 0.03)
        preco_med = round(trend_p * seasonal * noise, 2)
        spread = random.uniform(0.02, 0.05)
        preco_min = round(preco_med * (1 - spread), 2)
        preco_max = round(preco_med * (1 + spread), 2)
        custo_med = round(trend_c * (1 + random.uniform(-0.015, 0.015)), 2)
        ano_mes = f"{ano:04d}/{mes:02d}"
        preco_rows.append([cultura, ano_mes, ano, mes, preco_min, preco_med, preco_max, custo_med])

with open(os.path.join(OUT_DIR, "PrecoMensal.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Cultura", "AnoMes", "Ano", "Mes", "Preco_Minimo", "Preco_Medio", "Preco_Maximo", "Custo_Medio"])
    w.writerows(preco_rows)

print("OK - CSVs gerados em", OUT_DIR)

# ---------------------------------------------------------------
# Resumo de conferencia (nao vai para o modelo)
# ---------------------------------------------------------------
print("\n--- Resumo por cultura (2019-2024) ---")
for cultura in CULTURAS:
    total_prod = sum(r[3] for r in safra_rows if r[0] == cultura)
    total_exp = sum(r[4] for r in safra_rows if r[0] == cultura)
    ultimo = [r for r in preco_rows if r[0] == cultura][-1]
    margem = round(ultimo[5] - ultimo[7], 2)
    print(f"{cultura:6s} | Producao total: {total_prod:>10,} ton | Exportado: {total_exp:>9,} ton | "
          f"Preco atual: R$ {ultimo[5]:.2f} | Custo atual: R$ {ultimo[7]:.2f} | Margem: R$ {margem:.2f}")
