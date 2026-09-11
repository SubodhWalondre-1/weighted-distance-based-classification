# Weighted Distance-Based Classification Laboratory

An interactive, educational machine learning workbench for studying feature weighting in distance-based classification (Weighted K-Nearest Neighbors).

![Weighted Distance Classifier](frontend/style.css)

---

## Overview

In traditional distance-based classification (such as standard KNN), each feature contributes equally to the distance calculation. However, in real-world scenarios, certain features carry far more informative signal than others, and irrelevant or noisy features can degrade classification performance.

This laboratory provides:
1. A **FastAPI Python Backend** implementing a custom `WeightedDistanceClassifier` with evaluation metrics, baseline comparison, and sensitivity analysis.
2. A **Framework-Free Interactive Frontend** featuring real-time 2D metric deformation, draggable query points, live K-nearest neighbor rays, radial metric gauges, and instant presets.

---

## Features

- **Custom Weighted KNN Engine**: Uses weighted Euclidean distance:
  $$D(x, y) = \sqrt{\sum_{i=1}^{d} w_i (x_i - y_i)^2}$$
- **Interactive 2D Feature Space Canvas**:
  - Real-time 60 FPS visualization of samples in normalized feature space.
  - Dynamic deformation of the iso-distance metric ellipse as feature weights change.
  - Interactive click-and-drag for query Point A with real-time K-nearest neighbor ray connections.
- **Baseline Comparison**: Direct benchmarking between unweighted ($w_i = 1.0$) and custom weighted models.
- **Sensitivity Analysis**: Automatic feature weight sweep ($0.0 \to 2.0$) to distinguish informative features from noise.
- **Confusion Matrix & Distance Breakdown**: Detailed breakdown of individual feature squared differences and test error distributions.
- **Quick Weight Presets**: One-click configurations for *Equal Weights*, *Feature 1 Heavy*, *Feature 2 Heavy*, and *Noise Suppressed*.

---

## Project Structure

```
weighted-distance-based-classification/
├── api/
│   ├── index.py           # Vercel Serverless Function entrypoint
│   └── requirements.txt
├── backend/
│   ├── classifier.py      # WeightedDistanceClassifier implementation
│   ├── dataset.py         # Sample dataset generator and preprocessing
│   ├── main.py            # FastAPI REST endpoints and CORS setup
│   ├── models.py          # Pydantic request/response schemas
│   ├── requirements.txt   # Python dependencies (fastapi, uvicorn, scikit-learn, numpy)
│   └── README.md
├── frontend/
│   ├── index.html         # Accessible dashboard markup and canvas container
│   ├── style.css          # Responsive design system, glassmorphism, and animations
│   ├── app.js             # State management, API communication, and event coordination
│   ├── charts.js          # Chart.js charts and 2D FeatureSpaceCanvas engine
│   └── README.md
├── vercel.json            # Vercel routing configuration
├── requirements.txt       # Root dependencies for Vercel Python runtime
├── .gitignore
└── README.md
```

---

## Deploy to Vercel

Both the Python FastAPI backend and the interactive frontend are configured to deploy together on Vercel out of the box:

### Option A: Import from GitHub (Recommended)
1. Go to [vercel.com/new](https://vercel.com/new) and log in.
2. Select your GitHub repository: `SubodhWalondre-1/weighted-distance-based-classification`.
3. Keep all **Project Settings** at default values (Vercel automatically detects `vercel.json` for routing, `api/index.py` for the Python serverless runtime, and `frontend/` for the web assets).
4. Click **Deploy**.
5. Once deployed, your interactive laboratory will be live at `https://your-project-name.vercel.app`!

### Option B: Deploy via Vercel CLI
```bash
npx vercel
```
Follow the interactive prompts to link and deploy the project to your Vercel account.

---

## Quick Start (Local)

### 1. Start the Backend API

From the project root:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API will be running at `http://127.0.0.1:8000` with interactive Swagger docs available at `http://127.0.0.1:8000/docs`.

### 2. Serve the Frontend

In a separate terminal, serve the `frontend/` directory using any static file server:

```bash
# Using Python's built-in HTTP server:
python -m http.server 5500 -d frontend
```

Open `http://127.0.0.1:5500` in your web browser.

---

## License

MIT License. Designed for educational and practical machine learning demonstration.
