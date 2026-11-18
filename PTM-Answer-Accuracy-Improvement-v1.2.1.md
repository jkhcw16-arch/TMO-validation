# PTM Answer Accuracy Improvement v1.2.1

Implemented a question-type-aware evidence capsule reader.

- Keeps the highest-scoring concise sentence as the lead answer.
- Adds distinct retrieved evidence for multi-session, temporal-reasoning, and knowledge-update questions.
- Adds a second supporting turn for single-session user and assistant questions.
- Preserves the custom reader interface.
- Does not inspect gold answers, `has_answer`, or `answer_session_ids` during generation.
- Adds a regression test for multi-session evidence synthesis.

The official LongMemEval design identifies indexing, retrieval, and reading as separate memory stages. This change targets the reading stage because retrieval recall@5 was already 0.9519.

Local lexical comparison on the same 500-instance cleaned oracle file is included in `improved-longmemeval-metrics.json`. These metrics are not the official API-based semantic auto-evaluator score.
