from typing import Any, Dict

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


class WeightedDistanceClassifier:
    """A small, educational KNN classifier using weighted Euclidean distance."""

    def __init__(self, weights: np.ndarray | None = None, k: int = 3) -> None:
        self.weights = None if weights is None else np.asarray(weights, dtype=float)
        self.k = k
        self.X_train: np.ndarray | None = None
        self.y_train: np.ndarray | None = None
        self.classes_: np.ndarray | None = None
        self.last_distances_: np.ndarray = np.array([], dtype=float)

    @staticmethod
    def calculate_distance(
        x1: np.ndarray,
        x2: np.ndarray,
        weights: np.ndarray | list[float],
    ) -> float:
        first = np.asarray(x1, dtype=float)
        second = np.asarray(x2, dtype=float)
        feature_weights = np.asarray(weights, dtype=float)
        if first.shape != second.shape or first.ndim != 1:
            raise ValueError("points must be one-dimensional arrays with equal shape")
        if feature_weights.shape != first.shape:
            raise ValueError("weights must match the number of features")
        if np.any(feature_weights < 0):
            raise ValueError("weights must be non-negative")
        return float(np.sqrt(np.sum(feature_weights * (first - second) ** 2)))

    def fit(self, X: np.ndarray, y: np.ndarray) -> "WeightedDistanceClassifier":
        features = np.asarray(X, dtype=float)
        labels = np.asarray(y)
        if features.ndim != 2 or features.shape[0] == 0:
            raise ValueError("training features must be a non-empty 2D array")
        if labels.ndim != 1 or len(labels) != len(features):
            raise ValueError("training labels must contain one value per row")
        if not np.isfinite(features).all():
            raise ValueError("features must contain only finite numbers")
        if self.k < 1:
            raise ValueError("k must be at least 1")

        if self.weights is None:
            self.weights = np.ones(features.shape[1], dtype=float)
        if len(self.weights) != features.shape[1]:
            raise ValueError("weights must match the number of features")
        if not np.isfinite(self.weights).all() or np.any(self.weights < 0):
            raise ValueError("weights must be finite and non-negative")
        if np.all(self.weights == 0):
            raise ValueError("at least one feature weight must be greater than zero")

        self.X_train = features
        self.y_train = labels
        self.classes_ = np.unique(labels)
        self.k = min(self.k, len(features))
        return self

    def _check_fitted(self) -> None:
        if self.X_train is None or self.y_train is None or self.weights is None:
            raise ValueError("classifier must be fitted before prediction")

    def _neighbor_indices(self, point: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        self._check_fitted()
        distances = np.sqrt(
            np.sum(self.weights * (self.X_train - np.asarray(point, dtype=float)) ** 2, axis=1)
        )
        indices = np.argsort(distances, kind="stable")[: self.k]
        return indices, distances

    def predict(self, X: np.ndarray) -> np.ndarray:
        self._check_fitted()
        features = np.asarray(X, dtype=float)
        if features.ndim != 2 or features.shape[1] != self.X_train.shape[1]:
            raise ValueError("prediction features must have the same columns as training features")

        predictions = []
        nearest_distances = []
        for point in features:
            indices, distances = self._neighbor_indices(point)
            neighbor_labels = self.y_train[indices]
            labels, counts = np.unique(neighbor_labels, return_counts=True)
            predictions.append(labels[np.argmax(counts)])
            nearest_distances.append(float(distances[indices[-1]]))
        self.last_distances_ = np.asarray(nearest_distances, dtype=float)
        return np.asarray(predictions)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        self._check_fitted()
        predictions = []
        for point in np.asarray(X, dtype=float):
            indices, _ = self._neighbor_indices(point)
            counts = np.array([np.sum(self.y_train[indices] == label) for label in self.classes_])
            predictions.append(counts / max(len(indices), 1))
        return np.asarray(predictions, dtype=float)

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
        actual = np.asarray(y_test)
        predictions = self.predict(X_test)
        labels = np.unique(np.concatenate((actual, self.classes_)))
        return {
            "accuracy": float(accuracy_score(actual, predictions)),
            "precision": float(precision_score(actual, predictions, average="weighted", zero_division=0)),
            "recall": float(recall_score(actual, predictions, average="weighted", zero_division=0)),
            "f1_score": float(f1_score(actual, predictions, average="weighted", zero_division=0)),
            "predictions": [str(value) for value in predictions.tolist()],
            "actual": [str(value) for value in actual.tolist()],
            "confusion_matrix": confusion_matrix(actual, predictions, labels=labels).tolist(),
            "distances": [float(value) for value in self.last_distances_.tolist()],
        }
