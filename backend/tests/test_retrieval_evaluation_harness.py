"""
Tests for TA-60: the retrieval-quality evaluation harness lives in
data_pipeline/evaluation/, covers all three retrieval jobs, and a
baseline has genuinely been recorded (not just claimed).
"""
import json
from pathlib import Path

# TA-79: __file__-relative, not a hardcoded container path -- resolves
# the same way in Docker or outside it.
REPO_ROOT = Path(__file__).parent.parent.parent


def test_harness_lives_in_evaluation_directory():
    path = REPO_ROOT / "data_pipeline" / "evaluation" / "retrieval_quality_harness.py"
    assert path.exists()


def test_baseline_results_recorded():
    path = REPO_ROOT / "data_pipeline" / "evaluation" / "baseline_results.json"
    assert path.exists()

    data = json.loads(path.read_text())

    # All three retrieval jobs represented.
    assert "rule_lookup_accuracy_by_top_k" in data
    assert "disclosure_absence_accuracy_by_threshold" in data
    assert "precedent_majority_agreement_rate" in data

    # The tunable parameters the ticket requires are genuinely varied.
    assert len(data["rule_lookup_accuracy_by_top_k"]) >= 2  # top-k varied
    assert len(data["disclosure_absence_accuracy_by_threshold"]) >= 2  # threshold varied
    assert "chunk_size_comparison_top_k3" in data
    assert len(data["chunk_size_comparison_top_k3"]) >= 2  # chunk size varied
    assert "distance_metric_comparison_top_k3" in data
    assert len(data["distance_metric_comparison_top_k3"]) >= 2  # distance metric varied

    # Honest methodology notes are present, not silently omitted.
    assert "notes" in data
    assert "ground_truth_granularity" in data["notes"]
