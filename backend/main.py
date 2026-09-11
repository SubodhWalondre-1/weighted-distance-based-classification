from typing import Any, Dict, Tuple

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from classifier import WeightedDistanceClassifier
from dataset import (
    dataset_summary,
    generate_sample_dataset,
    normalize_features,
    split_dataset,
)
from models import (
    ClassificationRequest,
    ClassificationResponse,
    DatasetRequest,
    FeatureWeightRequest,
)

app = FastAPI(
    title="Weighted Distance-Based Classification API",
    description="Educational API for studying feature weighting with weighted KNN.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _prepare_data(request: ClassificationRequest) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    if not request.features or not request.labels:
        raise ValueError("features and labels cannot be empty")
    features = np.asarray(request.features, dtype=float)
    labels = np.asarray(request.labels)
    if features.ndim != 2 or features.shape[0] == 0 or features.shape[1] == 0:
        raise ValueError("features must be a non-empty rectangular 2D array")
    if len(features) != len(labels):
        raise ValueError("features and labels must have the same number of rows")
    if len(np.unique(labels)) < 2:
        raise ValueError("at least two classes are required")
    if not np.isfinite(features).all():
        raise ValueError("features must contain only finite numbers")

    X_train, X_test, y_train, y_test = split_dataset(
        features,
        labels,
        test_size=request.test_size,
    )
    X_train, scaler = normalize_features(X_train)
    X_test, _ = normalize_features(X_test, scaler)
    return X_train, X_test, y_train, y_test


def _weights_for(request: ClassificationRequest, feature_count: int) -> np.ndarray:
    weights = np.ones(feature_count, dtype=float) if request.weights is None else np.asarray(request.weights, dtype=float)
    if len(weights) != feature_count:
        raise ValueError("weights must match the number of features")
    if not np.isfinite(weights).all() or np.any(weights < 0):
        raise ValueError("weights must be finite and non-negative")
    if np.all(weights == 0):
        raise ValueError("at least one feature weight must be greater than zero")
    return weights


def _run(request: ClassificationRequest, weights: np.ndarray | None = None) -> Dict[str, Any]:
    X_train, X_test, y_train, y_test = _prepare_data(request)
    active_weights = _weights_for(request, X_train.shape[1]) if weights is None else weights
    classifier = WeightedDistanceClassifier(weights=active_weights, k=request.k)
    classifier.fit(X_train, y_train)
    result = classifier.evaluate(X_test, y_test)
    result["weights"] = [float(value) for value in active_weights.tolist()]
    return result


@app.get("/")
@app.get("/api")
@app.get("/api/")
def root() -> Dict[str, str]:
    return {"message": "Weighted Distance-Based Classification API", "docs": "/docs"}


@app.get("/health")
@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "healthy"}


@app.post("/dataset/sample")
@app.post("/api/dataset/sample")
def sample_dataset(request: DatasetRequest | None = None) -> Dict[str, Any]:
    settings = request or DatasetRequest()
    features, labels, feature_names = generate_sample_dataset(
        n_samples=settings.n_samples,
        n_features=settings.n_features,
        random_state=settings.random_state,
    )
    return {
        "features": features.tolist(),
        "labels": labels.tolist(),
        "feature_names": feature_names,
        "summary": dataset_summary(features, labels, feature_names),
    }


@app.post("/classify", response_model=ClassificationResponse)
@app.post("/api/classify", response_model=ClassificationResponse)
def classify(request: ClassificationRequest) -> Dict[str, Any]:
    try:
        return _run(request)
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/compare")
@app.post("/api/compare")
def compare(request: ClassificationRequest) -> Dict[str, Any]:
    try:
        feature_count = len(request.features[0]) if request.features else 0
        weighted = _run(request)
        unweighted = _run(request, np.ones(feature_count, dtype=float))
        return {
            "unweighted": {key: unweighted[key] for key in ("accuracy", "precision", "recall", "f1_score")},
            "weighted": {key: weighted[key] for key in ("accuracy", "precision", "recall", "f1_score")},
            "improvement": float(weighted["accuracy"] - unweighted["accuracy"]),
            "weights": weighted["weights"],
        }
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/feature-impact")
@app.post("/api/feature-impact")
def feature_impact(request: FeatureWeightRequest) -> Dict[str, Any]:
    try:
        feature_count = len(request.features[0]) if request.features else 0
        if len(request.weight_values) == 0:
            raise ValueError("weight_values cannot be empty")
        if any(value < 0 for value in request.weight_values):
            raise ValueError("weight_values must be non-negative")
        names = request.feature_names or [f"Feature {index + 1}" for index in range(feature_count)]
        if len(names) != feature_count:
            raise ValueError("feature_names must match the number of features")

        rows = []
        for feature_index, name in enumerate(names):
            accuracies = []
            for value in request.weight_values:
                weights = _weights_for(request, feature_count)
                weights[feature_index] = value
                if np.all(weights == 0):
                    accuracies.append(0.0)
                    continue
                accuracies.append(_run(request, weights)["accuracy"])
            rows.append({
                "name": name,
                "weights": [float(value) for value in request.weight_values],
                "accuracies": accuracies,
            })
        return {"features": rows}
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
