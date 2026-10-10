# DOSM occupation demand and BuildForward skill mapping

BuildForward uses two separately stored inputs:

1. **Market demand:** DOSM [Job Market Insights, Q2 2026](https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026) reports **19,899 online job offerings for Software Developers** out of **555,509 online job offerings overall**. DOSM says the quarterly release draws on offerings advertised through major private recruitment platforms. The count is for the occupation, not for any particular skill.
2. **Skill mapping:** BuildForward maps selected curriculum skills to that occupation in `services/api/data/buildforward_skill_occupation_map.csv`. These links are our documented judgement; DOSM did not publish the skill counts or the mapping used by BuildForward.

The DOSM values are stored in `services/api/data/dosm_occupation_demand.csv`. The [DOSM occupation classification](https://www.dosm.gov.my/uploads/content-downloads/file_20220920113610.pdf) describes Software Developers as designing, developing, testing and maintaining software. It supports a broad relationship to software testing; the narrower links below are BuildForward interpretations.

| BuildForward skill | Linked occupation | Relationship | Why this link is limited |
| --- | --- | --- | --- |
| Unit Testing | Software Developers | Related | DOSM describes software testing as occupation work, but does not count postings requiring unit testing. |
| Database Design | Software Developers | Adjacent | Data-backed software can involve database design, but the Q2 2026 occupation count does not establish that requirement. |
| Deployment | Software Developers | Adjacent | Delivering software can involve deployment, but the occupation count does not establish that requirement. |

CI/CD, containerisation, web APIs, and authentication have no mapping in this small sample. BuildForward marks their market signal unavailable rather than treating missing data as zero demand. All three mapped skills currently receive the **same occupation demand weight**, so the market input does not distinguish their relative demand.

## Priority formula

```text
occupation share = 19,899 Software Developer online offerings / 555,509 total online offerings
                 = 0.0358 (3.6%)

priority score = expected skill gap at graduation
               × occupation share
               × future learning opportunities factor

future learning opportunities factor = 1 / (1 + number of future learning opportunities)
```

The 3.6% figure is the share of DOSM's **online offerings for the selected occupation**, not the share of jobs requiring a mapped skill and not a share of all Malaysian jobs. The score is only an ordering aid for educator review; it is not a probability, an effect estimate, or a validated labour-market forecast. Skills without a mapped occupation follow mapped skills and are ordered by expected gap alone. Student-intake coverage and the 70% target remain illustrative.

The DOSM source is a fixed Q2 2026 snapshot loaded locally. The demo does not query DOSM live. The two CSVs keep the published count and BuildForward's interpretation auditable.
