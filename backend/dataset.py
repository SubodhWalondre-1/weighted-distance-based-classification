from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


def generate_sample_dataset(
    n_samples: int = 120,
    n_features: int = 2,
    random_state: int = 42,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """Create a small dataset with one useful feature and one noise feature."""
    if n_features not in (2, 3):
        raise ValueError("n_features must be 2 or 3")

    features, labels = make_classification(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=1,
        n_redundant=0,
        n_repeated=0,
        n_classes=2,
        n_clusters_per_class=1,
        class_sep=1.5,
        flip_y=0.03,
        random_state=random_state,
    )
    feature_names = [f"Feature {index + 1}" for index in range(n_features)]
    return features, np.where(labels == 0, "Class A", "Class B"), feature_names


def normalize_features(
    features: np.ndarray,
    scaler: StandardScaler | None = None,
) -> Tuple[np.ndarray, StandardScaler]:
    """Standardize features and return the scaler for consistent test processing."""
    values = np.asarray(features, dtype=float)
    if values.ndim != 2 or values.shape[0] == 0:
        raise ValueError("features must be a non-empty 2D array")
    active_scaler = scaler or StandardScaler()
    if scaler is None:
        return active_scaler.fit_transform(values), active_scaler
    return active_scaler.transform(values), active_scaler


def split_dataset(
    features: np.ndarray,
    labels: np.ndarray,
    test_size: float = 0.2,
    random_state: int = 42,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Split data deterministically, stratifying when every class allows it."""
    if len(features) == 0 or len(labels) == 0:
        raise ValueError("features and labels cannot be empty")
    if len(features) != len(labels):
        raise ValueError("features and labels must have the same number of rows")

    try:
        return train_test_split(
            features,
            labels,
            test_size=test_size,
            random_state=random_state,
            stratify=labels,
        )
    except ValueError:
        return train_test_split(
            features,
            labels,
            test_size=test_size,
            random_state=random_state,
        )


def dataset_summary(
    features: np.ndarray,
    labels: np.ndarray,
    feature_names: List[str] | None = None,
) -> Dict[str, Any]:
    values = np.asarray(features)
    target = np.asarray(labels)
    if values.ndim != 2 or values.shape[0] == 0:
        raise ValueError("features must be a non-empty 2D array")
    if target.ndim != 1 or len(target) != len(values):
        raise ValueError("labels must contain one value per feature row")

    names = feature_names or [f"Feature {index + 1}" for index in range(values.shape[1])]
    unique, counts = np.unique(target, return_counts=True)
    return {
        "number_of_samples": int(values.shape[0]),
        "number_of_features": int(values.shape[1]),
        "classes": [str(item) for item in unique.tolist()],
        "feature_names": names,
        "class_distribution": {
            str(label): int(count) for label, count in zip(unique.tolist(), counts.tolist())
        },
    }
