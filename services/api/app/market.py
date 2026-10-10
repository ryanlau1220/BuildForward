"""DOSM occupation demand and BuildForward's separate curriculum-skill links."""

import csv
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DEMAND_DATA = DATA_DIR / "dosm_occupation_demand.csv"
SKILL_MAP = DATA_DIR / "buildforward_skill_occupation_map.csv"
MARKET_DATASET_NAME = "DOSM Job Market Insights: online job offerings"
MARKET_DATASET_PERIOD = "Q2 2026"
MARKET_DATASET_SOURCE = (
    "https://www.dosm.gov.my/portal-main/release-content/"
    "big-data-analytics-job-market-insights-q22026"
)


@lru_cache(maxsize=1)
def load_market_signals() -> dict[str, dict]:
    occupations = {}
    with DEMAND_DATA.open(newline="", encoding="utf-8") as source:
        for row in csv.DictReader(source):
            count = int(row["online_offerings"])
            total = int(row["total_online_offerings"])
            if not 0 < count <= total or row["period"] != MARKET_DATASET_PERIOD:
                raise ValueError(f"Invalid DOSM demand row for {row['occupation_code']}")
            if row["occupation_code"] in occupations:
                raise ValueError(f"Duplicate DOSM occupation {row['occupation_code']}")
            occupations[row["occupation_code"]] = {
                "code": row["occupation_code"],
                "name": row["occupation_name"],
                "online_offerings": count,
                "total_online_offerings": total,
                "source": row["source_url"],
            }

    signals = {}
    with SKILL_MAP.open(newline="", encoding="utf-8") as source:
        for row in csv.DictReader(source):
            skill = row["competency"]
            if skill in signals:
                raise ValueError(f"Duplicate BuildForward skill mapping for {skill}")
            occupation = occupations[row["occupation_code"]]
            signals[skill] = {
                "occupation": occupation,
                "occupation_share": (
                    occupation["online_offerings"] / occupation["total_online_offerings"]
                ),
                "mapping_type": row["mapping_type"],
                "mapping_note": row["mapping_note"],
            }
    return signals


def market_dataset_summary() -> dict:
    return {
        "name": MARKET_DATASET_NAME,
        "period": MARKET_DATASET_PERIOD,
        "source": MARKET_DATASET_SOURCE,
        "measure": "share of DOSM online job offerings in a selected occupation",
        "mapping_source": "BuildForward's documented occupation-to-skill mapping",
        "claim_limit": (
            "DOSM counts online offerings by occupation, not demand for individual skills. "
            "BuildForward's occupation-to-skill links are editorial and do not measure skill prevalence. "
            "Online offerings are not all Malaysian jobs."
        ),
    }
