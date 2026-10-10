import csv
from functools import lru_cache
from pathlib import Path

MARKET_DATA = Path(__file__).resolve().parents[1] / "data" / "malaysia_role_skill_signals.csv"
ROLE_PROFILE_SAMPLE_SIZE = 6
MARKET_DATASET_NAME = "ILMIA selected Malaysian software and ICT role profiles"
MARKET_DATASET_PERIOD = "Q1 2024"
MARKET_DATASET_SOURCE = "https://www.ilmia.gov.my/bda-myjobprofile/"
ROLE_PROFILES = {
    "2511": {
        "name": "Computer Systems Analysts",
        "url": f"{MARKET_DATASET_SOURCE}job/2511/computer-systems-analysts",
    },
    "2512": {
        "name": "Software Developers",
        "url": f"{MARKET_DATASET_SOURCE}job/2512/software-developers",
    },
    "2514": {
        "name": "Application Programmers",
        "url": f"{MARKET_DATASET_SOURCE}job/2514/application-programmers",
    },
    "2519": {
        "name": "Software and Application Developers and Analysts n.e.c.",
        "url": (
            f"{MARKET_DATASET_SOURCE}job/2519/"
            "software-and-application-developers-and-analysts-not-elsewhere-classified"
        ),
    },
    "2521": {
        "name": "Database Designers and Administrators",
        "url": f"{MARKET_DATASET_SOURCE}job/2521/database-designers-and-administrators",
    },
    "2522": {
        "name": "Information Technology System Administrators",
        "url": f"{MARKET_DATASET_SOURCE}job/2522/information-technology-system-administrators",
    },
}


@lru_cache(maxsize=1)
def load_market_signals() -> dict[str, dict]:
    signals = {}
    with MARKET_DATA.open(newline="", encoding="utf-8") as source:
        for row in csv.DictReader(source):
            count = int(row["matched_profiles"])
            sample_size = int(row["profile_sample_size"])
            if not 0 < count <= sample_size <= ROLE_PROFILE_SAMPLE_SIZE:
                raise ValueError(f"Invalid role coverage in market data for {row['competency']}")
            if row["competency"] in signals:
                raise ValueError(f"Duplicate market signal for {row['competency']}")
            signals[row["competency"]] = {
                **row,
                "matched_profile_codes": row["matched_profile_codes"].split(";"),
                "profiles": [
                    {"code": code, **ROLE_PROFILES[code]}
                    for code in row["matched_profile_codes"].split(";")
                ],
                "role_coverage": count / sample_size,
            }
    return signals


def market_dataset_summary() -> dict:
    return {
        "name": MARKET_DATASET_NAME,
        "period": MARKET_DATASET_PERIOD,
        "sampled_role_profiles": ROLE_PROFILE_SAMPLE_SIZE,
        "source": MARKET_DATASET_SOURCE,
        "measure": "share of selected role profiles listing a mapped skill tag",
        "claim_limit": (
            "Not a percentage of all job ads or skill prevalence. Selected profiles are a small, "
            "non-representative Q1 2024 sample; related skill tags are mapped to canonical competencies."
        ),
    }
