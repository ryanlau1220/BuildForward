# Malaysian role-profile skill signal

BuildForward includes a small locally stored market signal from the Institute of Labour Market Information and Analysis (ILMIA), an agency of DOSM. The six sampled MyJobProfile profiles cover MASCO 2511 (Computer Systems Analysts), 2512 (Software Developers), 2514 (Application Programmers), 2519 (Software QA/testing roles), 2521 (Database Designers and Administrators), and 2522 (IT System Administrators). Each profile identifies skills for the occupation; the profile pages cite Q1 2024 Job Market Insights as their source.

The CSV at `services/api/data/malaysia_role_skill_signals.csv` records three skill mappings. Database design is listed in four of six selected profiles (67%). JUnit or software testing is listed in two of six profiles (33%). Cloud computing, used as a related signal for deployment, is listed in two of six profiles (33%). These values are computed as the proportion of this **selected profile sample** containing a matching skill tag.

This is not a representative sample of job advertisements and these percentages do not mean that 67%, 33%, or 33% of Malaysian software job ads require each skill. Skill mappings are deliberately small and explicit. CI/CD, containerisation, web APIs, and authentication have no mapped signal in this dataset; BuildForward labels those as unavailable and does not treat missing data as zero market demand.

## Source profiles

- [Computer Systems Analysts (2511)](https://www.ilmia.gov.my/bda-myjobprofile/job/2511/computer-systems-analysts)
- [Software Developers (2512)](https://www.ilmia.gov.my/bda-myjobprofile/job/2512/software-developers)
- [Application Programmers (2514)](https://www.ilmia.gov.my/bda-myjobprofile/job/2514/application-programmers)
- [Software and Application Developers and Analysts n.e.c. (2519)](https://www.ilmia.gov.my/bda-myjobprofile/job/2519/software-and-application-developers-and-analysts-not-elsewhere-classified)
- [Database Designers and Administrators (2521)](https://www.ilmia.gov.my/bda-myjobprofile/job/2521/database-designers-and-administrators)
- [Information Technology System Administrators (2522)](https://www.ilmia.gov.my/bda-myjobprofile/job/2522/information-technology-system-administrators)

ILMIA describes MyJobProfile as part of its Labour Market Information Data Warehouse. DOSM says its online job-market insight releases draw on job offers advertised through major private recruitment platforms; the Q2 2025 release reported 281,736 online offerings overall. That overall count is context only and is not used as a denominator for this role-profile signal. See [ILMIA](https://www.ilmia.gov.my/bda-myjobprofile/) and the [DOSM Q2 2025 release](https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-and-my-job-profile-second-quarter-of-).

## Priority formula

For skills with a mapped role-profile signal, the forecast uses:

```text
priority score = expected skill gap at graduation
               × selected role-profile coverage
               × future learning opportunities factor

future learning opportunities factor = 1 / (1 + number of future learning opportunities)
```

The score is an ordering aid for planning. It is not a probability or a validated labour-market forecast. Fewer future learning opportunities raises the score. Skills without a mapped market signal appear after skills with evidence and are ordered by expected gap alone. Student-intake figures and the 70% target remain illustrative.
