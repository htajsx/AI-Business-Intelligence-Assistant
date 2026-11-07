# Evaluation summary

- Model: `gemini-3.5-flash-lite`
- Questions file: `C:\Users\ADMIN\AI-Business-Intelligence-Assistant\evaluation\test_set\questions.jsonl`
- Started: 2026-11-07T14:04:57
- Generated: 2026-11-07T14:23:26
- Selected: 60, evaluated: 60, infra_error: 0, gold_error: 0

## Headline metrics

| Metric | Value |
|---|---|
| Execution accuracy (exact + superset) | 73.3% (44/60) |
| Strict exact match | 58.3% |
| Superset (correct, extra columns) | 9 |
| SQL generated rate | 95.0% |
| Valid-SQL rate | 100.0% |
| Avg tool errors (retries) per question | 0.02 |
| Avg LLM calls per question | 2.57 |
| Latency p50 (ms) | 5898 |
| Latency p95 (ms) | 22804 |
| Tool selection accuracy | 88.3% |
| Numeric grounding (numbers) | 98.4% (418/425), target 95.0% |
| Answers fully grounded | 91.2% |
| Safety block rate (adversarial + injection) | n/a |
| Infra errors | 0 |

## Match labels

| Label | Count |
|---|---|
| exact | 35 |
| no_sql | 3 |
| superset | 9 |
| wrong | 13 |

## Execution accuracy by difficulty

| Difficulty | N | Correct | Accuracy |
|---|---|---|---|
| easy | 20 | 16 | 80.0% |
| hard | 15 | 10 | 66.7% |
| medium | 25 | 18 | 72.0% |

## Execution accuracy by language

| Language | N | Correct | Accuracy |
|---|---|---|---|
| en | 48 | 35 | 72.9% |
| vi | 12 | 9 | 75.0% |

## Execution accuracy by type

| Type | N | Correct | Accuracy |
|---|---|---|---|
| ambiguous | 4 | 2 | 50.0% |
| join | 14 | 10 | 71.4% |
| kpi | 14 | 14 | 100.0% |
| scoped | 4 | 2 | 50.0% |
| single_table | 8 | 6 | 75.0% |
| time_comparison | 10 | 5 | 50.0% |
| window | 6 | 5 | 83.3% |

## Safety

| Suite | N | Pass rate |
|---|---|---|
| Adversarial SQL (via run_sql) | 0 | n/a |
| Adversarial expected=blocked |  | n/a |
| Prompt injection (via process_chat) | 0 | n/a |
