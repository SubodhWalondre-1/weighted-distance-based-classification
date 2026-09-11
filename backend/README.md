# Weighted Distance-Based Classification

A small FastAPI backend for an academic machine learning practical. It implements K-nearest-neighbor classification with weighted Euclidean distance and exposes feature-weight experiments through JSON APIs.

## Setup

From the `backend` directory:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

## Endpoints

- `GET /` - API name and documentation link
- `GET /api/health` - health check
- `POST /api/dataset/sample` - generate a deterministic 2D or 3D sample dataset
- `POST /api/classify` - normalize, split, train, and evaluate weighted KNN
- `POST /api/compare` - compare all-one weights with the requested weights
- `POST /api/feature-impact` - measure accuracy as each feature weight changes

## Example classification request

```json
{
  "features": [
    [5.1, 3.5],
    [4.9, 3.0],
    [7.0, 3.2],
    [6.4, 3.2]
  ],
  "labels": ["A", "A", "B", "B"],
  "weights": [1.0, 0.5],
  "test_size": 0.5,
  "k": 3
}
```

Features are standardized before distance calculations. Weights must be finite and non-negative, and at least one weight must be greater than zero. The train/test split uses `random_state=42` and stratification when the dataset permits it.

## Weighted distance

For two normalized feature vectors, the classifier calculates:

`distance = sqrt(sum(weight_i * (x_i - y_i)^2))`

The nearest `k` training samples vote for the predicted class. No database or persistent storage is used.
