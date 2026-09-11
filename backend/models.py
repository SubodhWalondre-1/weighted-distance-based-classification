from typing import List, Optional

from pydantic import BaseModel, Field


class DatasetRequest(BaseModel):
    n_samples: int = Field(default=120, ge=20, le=1000)
    n_features: int = Field(default=2, ge=2, le=3)
    random_state: int = 42


class ClassificationRequest(BaseModel):
    dataset: Optional[str] = None
    features: List[List[float]]
    labels: List[str]
    weights: Optional[List[float]] = None
    test_size: float = Field(default=0.2, gt=0.0, lt=1.0)
    k: int = Field(default=3, ge=1)


class FeatureWeightRequest(ClassificationRequest):
    weight_values: List[float] = Field(default=[0.0, 0.5, 1.0, 1.5, 2.0])
    feature_names: Optional[List[str]] = None


class ClassificationResponse(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    weights: List[float]
    predictions: List[str]
    actual: List[str]
    confusion_matrix: List[List[int]]
    distances: List[float]
