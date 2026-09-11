// app.js - Main Application Logic & Reactive Event Coordination

// Dynamic API base: Use relative path on Vercel/production, or port 8000 when running locally
const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? (window.location.port === "8000" ? "" : "http://127.0.0.1:8000")
    : "";
const state = {
  dataset: null,
  weights: [1, 1],
  featureNames: ["Feature 1", "Feature 2"],
  running: false,
};

let toastTimer = null;

const $ = (id) => document.getElementById(id);

// ----------------------------------------------------
// Toast Notifications
// ----------------------------------------------------
function showToast(message, isSuccess = false) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.borderLeftColor = isSuccess ? "var(--success)" : "var(--accent)";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
}

// ----------------------------------------------------
// HTTP Requests
// ----------------------------------------------------
async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "The request could not be completed.");
    }
    return payload;
  } catch (error) {
    if (error instanceof TypeError) {
      showToast("Backend connection unavailable. Please ensure FastAPI server is running on port 8000.");
      setStatus("Offline", false);
    } else {
      showToast(error.message);
    }
    throw error;
  }
}

// ----------------------------------------------------
// Status Badge Handling
// ----------------------------------------------------
function setStatus(label, loading = false) {
  const status = $("model-status");
  if (!status) return;
  status.classList.toggle("is-loading", loading);
  status.querySelector("strong").textContent = label;
}

// ----------------------------------------------------
// Slider Track Gradient Fill
// ----------------------------------------------------
function setRangeFill(input, percentage) {
  if (!input) return;
  input.style.setProperty("--fill", `${Math.max(0, Math.min(100, percentage))}%`);
}

// ----------------------------------------------------
// Formula Chips Synchronization
// ----------------------------------------------------
function updateFormulaChips() {
  const container = $("formula-live-chips");
  if (!container) return;

  container.innerHTML = state.weights
    .map((w, i) => `<span class="chip-item">w<sub>${i + 1}</sub> = <strong>${w.toFixed(1)}</strong></span>`)
    .join("");
}

// ----------------------------------------------------
// Setup Controls & Event Listeners
// ----------------------------------------------------
function setupControls() {
  // K-Slider
  const kInput = $("k-input");
  const kOutput = $("k-value");
  kInput.addEventListener("input", (e) => {
    const val = e.target.value;
    kOutput.textContent = val;
    setRangeFill(e.target, ((val - e.target.min) / (e.target.max - e.target.min)) * 100);
    updateDecisionCanvas(state.dataset, state.weights, Number(val));
  });

  // Test Size Slider
  const testInput = $("test-size-input");
  const testOutput = $("test-size-value");
  testInput.addEventListener("input", (e) => {
    const val = e.target.value;
    testOutput.textContent = `${val}%`;
    setRangeFill(e.target, ((val - 10) / 30) * 100);
  });

  // Dataset Select Dropdown
  const datasetSelect = $("dataset-select");
  datasetSelect.addEventListener("change", () => {
    loadDatasetFromSelection();
  });

  // Buttons
  $("load-button").addEventListener("click", loadDatasetFromSelection);
  $("run-button").addEventListener("click", runClassification);

  // Reset Weights
  $("reset-button").addEventListener("click", () => {
    state.weights = state.weights.map(() => 1.0);
    renderWeightControls();
    updateFormulaChips();
    updateDecisionCanvas(state.dataset, state.weights, Number(kInput.value));
    updateDistanceVisualizer();
    showToast("Feature weights reset to 1.0", true);
  });

  // Preset Buttons
  document.querySelectorAll(".preset-pill").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const preset = e.currentTarget.dataset.preset;
      applyWeightPreset(preset);
    });
  });

  // Initial Slider Track Fills
  setRangeFill(kInput, ((kInput.value - kInput.min) / (kInput.max - kInput.min)) * 100);
  setRangeFill(testInput, ((testInput.value - 10) / 30) * 100);

  // Hook canvas point moving callback to distance visualizer
  window.onFeatureSpacePointMoved = (pointA, pointB, weights) => {
    $("point-a").textContent = `[${pointA.map((v) => v.toFixed(2)).join(", ")}]`;
    $("point-b").textContent = `[${pointB.map((v) => v.toFixed(2)).join(", ")}]`;
    const dist = Math.sqrt(
      weights.reduce((sum, w, i) => {
        const diff = (pointA[i] || 0) - (pointB[i] || 0);
        return sum + w * diff * diff;
      }, 0)
    );
    $("weighted-distance").textContent = dist.toFixed(2);
  };
}

// ----------------------------------------------------
// Weight Presets Handler
// ----------------------------------------------------
function applyWeightPreset(preset) {
  const n = state.weights.length;
  if (preset === "equal") {
    state.weights = state.weights.map(() => 1.0);
  } else if (preset === "feat1") {
    state.weights = state.weights.map((_, i) => (i === 0 ? 2.0 : 0.2));
  } else if (preset === "feat2") {
    state.weights = state.weights.map((_, i) => (i === 1 ? 2.0 : 0.2));
  } else if (preset === "suppress") {
    // Suppress noise features (features beyond index 0)
    state.weights = state.weights.map((_, i) => (i === 0 ? 1.8 : 0.1));
  }

  renderWeightControls();
  updateFormulaChips();
  updateDecisionCanvas(state.dataset, state.weights, Number($("k-input").value));
  updateDistanceVisualizer();
  showToast(`Applied preset: ${preset.toUpperCase()}`, true);
}

// ----------------------------------------------------
// Render Weight Sliders (4-Column Aligned Grid)
// ----------------------------------------------------
function renderWeightControls() {
  const container = $("weights-container");
  if (!container) return;

  container.innerHTML = state.featureNames
    .map((name, index) => {
      const weight = state.weights[index] ?? 1.0;
      const fill = Math.min(100, Math.round((weight / 2) * 100));

      return `
        <div class="weight-row">
          <span class="weight-name" title="${name}">${name}</span>
          <div class="weight-control">
            <input 
              class="weight-range" 
              type="range" 
              min="0" 
              max="2" 
              step="0.1" 
              value="${weight}" 
              data-index="${index}" 
              aria-label="${name} importance weight"
              style="--fill: ${fill}%"
            />
          </div>
          <span class="weight-value-chip">${weight.toFixed(1)}</span>
          <span class="weight-percent-badge">${fill}%</span>
        </div>
      `;
    })
    .join("");

  // Attach live reactive input events
  container.querySelectorAll(".weight-range").forEach((input) => {
    input.addEventListener("input", (e) => {
      const index = Number(e.target.dataset.index);
      const val = Number(e.target.value);
      state.weights[index] = val;

      const row = e.target.closest(".weight-row");
      const fill = Math.min(100, Math.round((val / 2) * 100));

      row.querySelector(".weight-value-chip").textContent = val.toFixed(1);
      row.querySelector(".weight-percent-badge").textContent = `${fill}%`;
      setRangeFill(e.target, fill);

      updateFormulaChips();
      updateDecisionCanvas(state.dataset, state.weights, Number($("k-input").value));
      updateDistanceVisualizer();
    });
  });
}

// ----------------------------------------------------
// Render Dataset Table & Stats
// ----------------------------------------------------
function renderDataset(dataset) {
  state.dataset = dataset;
  state.featureNames = dataset.feature_names;
  // Keep previous weights if length matches, otherwise reset to 1.0
  if (state.weights.length !== dataset.feature_names.length) {
    state.weights = dataset.feature_names.map(() => 1.0);
  }

  // Update Stats Strip
  $("sample-count").textContent = dataset.summary.number_of_samples;
  $("feature-count").textContent = dataset.summary.number_of_features;
  $("class-count").textContent = dataset.summary.classes.length;
  $("dataset-badge").textContent = `${dataset.summary.number_of_samples} observations`;

  // Update Data Table
  $("dataset-head").innerHTML = `
    <tr>
      ${dataset.feature_names.map((name) => `<th>${name}</th>`).join("")}
      <th>Target Class</th>
    </tr>
  `;

  $("dataset-body").innerHTML = dataset.features
    .slice(0, 10)
    .map((row, index) => {
      const label = dataset.labels[index];
      const badgeColor = label === "Class A" ? "var(--accent)" : "var(--success)";
      return `
        <tr>
          ${row.map((val) => `<td>${Number(val).toFixed(3)}</td>`).join("")}
          <td><strong style="color: ${badgeColor}; font-weight: 700;">${label}</strong></td>
        </tr>
      `;
    })
    .join("");

  renderWeightControls();
  updateFormulaChips();
  updateDecisionCanvas(state.dataset, state.weights, Number($("k-input").value));
  updateDistanceVisualizer();
}

// ----------------------------------------------------
// Payload Builder
// ----------------------------------------------------
function payload() {
  return {
    features: state.dataset.features,
    labels: state.dataset.labels,
    weights: state.weights,
    test_size: Number($("test-size-input").value) / 100,
    k: Number($("k-input").value),
  };
}

// ----------------------------------------------------
// Smooth Metric Counter & Gauge Animation
// ----------------------------------------------------
function animateMetric(numberElement, circleElement, value) {
  const start = performance.now();
  const duration = 750;
  const targetPct = value * 100;

  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);
    // Cubic ease out
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = targetPct * ease;

    numberElement.textContent = `${current.toFixed(1)}%`;
    if (circleElement) {
      circleElement.setAttribute("stroke-dasharray", `${current.toFixed(1)}, 100`);
    }

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
}

function updateMetrics(result) {
  animateMetric($("metric-accuracy"), $("circle-accuracy"), result.accuracy);
  animateMetric($("metric-precision"), $("circle-precision"), result.precision);
  animateMetric($("metric-recall"), $("circle-recall"), result.recall);
  animateMetric($("metric-f1"), $("circle-f1"), result.f1_score);

  const resultState = $("result-state");
  resultState.innerHTML = '<span class="result-state-dot"></span> Classification Complete';
  resultState.classList.add("complete");
}

// ----------------------------------------------------
// Update Comparison Section
// ----------------------------------------------------
function updateComparison(comparison) {
  const unweightedAcc = comparison.unweighted.accuracy * 100;
  const weightedAcc = comparison.weighted.accuracy * 100;
  const delta = (comparison.improvement || (comparison.weighted.accuracy - comparison.unweighted.accuracy)) * 100;

  $("unweighted-accuracy").textContent = `${unweightedAcc.toFixed(1)}%`;
  $("weighted-accuracy").textContent = `${weightedAcc.toFixed(1)}%`;

  $("unweighted-weights").textContent = `Weights: [${state.weights.map(() => "1.0").join(", ")}]`;
  $("weighted-weights").textContent = `Weights: [${state.weights.map((v) => v.toFixed(1)).join(", ")}]`;

  const deltaText = `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`;
  $("improvement-value").textContent = deltaText;
  $("improvement-value").style.color = delta >= 0 ? "var(--success)" : "var(--danger)";

  const deltaPill = $("delta-pill");
  if (deltaPill) {
    deltaPill.textContent = delta >= 0 ? `${deltaText} BOOST` : `${deltaText} DELTA`;
    deltaPill.style.background = delta >= 0 ? "var(--success-soft)" : "var(--danger-soft)";
    deltaPill.style.color = delta >= 0 ? "var(--success-dark)" : "var(--danger)";
  }

  // Progress bar fills proportionally to accuracy
  const bar = $("improvement-bar");
  if (bar) {
    bar.style.width = `${Math.min(100, Math.max(8, weightedAcc))}%`;
    bar.style.background = delta >= 0 ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : "#ef4444";
  }

  renderComparisonChart(comparison.unweighted.accuracy, comparison.weighted.accuracy);

  if (delta > 0) {
    showToast(`Feature weighting improved accuracy by ${deltaText}!`, true);
  }
}

// ----------------------------------------------------
// Distance Visualizer Breakdown
// ----------------------------------------------------
function updateDistanceVisualizer() {
  if (!state.dataset || state.dataset.features.length < 2) return;

  const a = state.dataset.features[0];
  const b = state.dataset.features[1];

  // Standard deviation normalization
  const means = a.map(
    (_, idx) => state.dataset.features.reduce((sum, row) => sum + row[idx], 0) / state.dataset.features.length
  );
  const deviations = a.map(
    (_, idx) =>
      Math.sqrt(
        state.dataset.features.reduce((sum, row) => sum + (row[idx] - means[idx]) ** 2, 0) /
          state.dataset.features.length
      ) || 1
  );

  const differences = a.map((val, idx) => (val - b[idx]) / deviations[idx]);
  const contributions = differences.map((diff, idx) => (state.weights[idx] ?? 1.0) * diff ** 2);

  $("point-a").textContent = `[${a.map((v) => v.toFixed(2)).join(", ")}]`;
  $("point-b").textContent = `[${b.map((v) => v.toFixed(2)).join(", ")}]`;
  $("weighted-distance").textContent = Math.sqrt(contributions.reduce((sum, val) => sum + val, 0)).toFixed(2);

  renderDistanceBars(contributions, state.featureNames);
}

// ----------------------------------------------------
// Load Dataset by Selection
// ----------------------------------------------------
async function loadDatasetFromSelection() {
  const sel = $("dataset-select").value;
  let n_samples = 120;
  let n_features = 2;

  if (sel === "3d-150") {
    n_samples = 150;
    n_features = 3;
  } else if (sel === "2d-240") {
    n_samples = 240;
    n_features = 2;
  } else if (sel === "2d-60") {
    n_samples = 60;
    n_features = 2;
  }

  setStatus("Loading Dataset...", true);
  $("load-button").disabled = true;

  try {
    const data = await request("/api/dataset/sample", {
      method: "POST",
      body: JSON.stringify({
        n_samples,
        n_features,
        random_state: 42,
      }),
    });
    renderDataset(data);
    setStatus("Ready");
    showToast(`Loaded ${data.summary.number_of_samples} samples (${n_features} features)`, true);
  } catch (error) {
    setStatus("Offline");
  } finally {
    $("load-button").disabled = false;
  }
}

// ----------------------------------------------------
// Run Classification Pipeline
// ----------------------------------------------------
async function runClassification() {
  if (!state.dataset || state.running) return;

  state.running = true;
  setStatus("Computing Distances & KNN...", true);

  const runBtn = $("run-button");
  runBtn.classList.add("is-loading");
  runBtn.disabled = true;
  runBtn.querySelector(".button-label").textContent = "Evaluating Model...";

  try {
    const data = payload();

    const [result, comparison, impact] = await Promise.all([
      request("/api/classify", { method: "POST", body: JSON.stringify(data) }),
      request("/api/compare", { method: "POST", body: JSON.stringify(data) }),
      request("/api/feature-impact", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          feature_names: state.featureNames,
          weight_values: [0, 0.5, 1, 1.5, 2],
        }),
      }),
    ]);

    updateMetrics(result);
    updateComparison(comparison);
    renderImpactChart(impact.features);
    renderConfusionMatrix(result.confusion_matrix);
    updateDistanceVisualizer();
    updateDecisionCanvas(state.dataset, state.weights, Number($("k-input").value));

    setStatus("Ready");
    runBtn.querySelector(".button-label").textContent = "Evaluation Complete!";
    setTimeout(() => {
      runBtn.querySelector(".button-label").textContent = "Run Classification";
    }, 2000);
  } catch (error) {
    setStatus("Error");
    runBtn.querySelector(".button-label").textContent = "Run Classification";
  } finally {
    state.running = false;
    runBtn.classList.remove("is-loading");
    runBtn.disabled = false;
  }
}

// ----------------------------------------------------
// DOMContentLoaded Initialization
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupControls();
  initDecisionCanvas();
  loadDatasetFromSelection();
});
