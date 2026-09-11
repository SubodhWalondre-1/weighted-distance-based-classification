// charts.js - Interactive Visualizations and 2D Feature Space Canvas

let comparisonChart = null;
let impactChart = null;

// Palette for features and classes
const chartPalette = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4"];

function chartOptions(yTitle, yMax = 100) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutCubic" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(23, 23, 27, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#e2e8f0",
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "Inter", weight: "600", size: 12 },
        bodyFont: { family: "DM Mono", size: 11 },
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#74747d", font: { family: "DM Mono", size: 10 } },
        border: { color: "#e2e8f0" },
      },
      y: {
        beginAtZero: false,
        min: Math.max(0, yMax - 35),
        max: yMax,
        grid: { color: "rgba(226, 232, 240, 0.6)", strokeDash: [3, 3] },
        ticks: {
          color: "#74747d",
          font: { family: "DM Mono", size: 10 },
          callback: (value) => `${value}%`,
        },
        title: {
          display: Boolean(yTitle),
          text: yTitle,
          color: "#64748b",
          font: { family: "DM Mono", size: 10, weight: "500" },
        },
        border: { color: "transparent" },
      },
    },
  };
}

// ----------------------------------------------------
// Comparison Bar Chart
// ----------------------------------------------------
function renderComparisonChart(unweighted, weighted) {
  const canvas = document.getElementById("comparison-chart");
  if (!canvas) return;
  if (comparisonChart) comparisonChart.destroy();

  const ctx = canvas.getContext("2d");
  const unweightedGrad = ctx.createLinearGradient(0, 0, 0, 160);
  unweightedGrad.addColorStop(0, "#cbd5e1");
  unweightedGrad.addColorStop(1, "#94a3b8");

  const weightedGrad = ctx.createLinearGradient(0, 0, 0, 160);
  weightedGrad.addColorStop(0, "#818cf8");
  weightedGrad.addColorStop(1, "#6366f1");

  comparisonChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Unweighted", "Weighted (Custom)"],
      datasets: [
        {
          data: [unweighted * 100, weighted * 100],
          backgroundColor: [unweightedGrad, weightedGrad],
          hoverBackgroundColor: ["#94a3b8", "#4f46e5"],
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 38,
        },
      ],
    },
    options: {
      ...chartOptions("Accuracy", 100),
      plugins: {
        ...chartOptions("Accuracy", 100).plugins,
        tooltip: {
          ...chartOptions("Accuracy", 100).plugins.tooltip,
          callbacks: {
            label: (ctx) => ` Accuracy: ${ctx.raw.toFixed(2)}%`,
          },
        },
      },
    },
  });
}

// ----------------------------------------------------
// Sensitivity Line Chart
// ----------------------------------------------------
function renderImpactChart(rows) {
  const canvas = document.getElementById("impact-chart");
  if (!canvas || !rows || !rows.length) return;
  if (impactChart) impactChart.destroy();

  impactChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: rows[0]?.weights || [],
      datasets: rows.map((row, index) => {
        const color = chartPalette[index % chartPalette.length];
        return {
          label: row.name,
          data: row.accuracies.map((value) => value * 100),
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: color,
          pointBorderWidth: 2,
          tension: 0.35,
          fill: false,
        };
      }),
    },
    options: {
      ...chartOptions("Accuracy", 100),
      plugins: {
        ...chartOptions("Accuracy", 100).plugins,
        legend: {
          display: true,
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            boxHeight: 8,
            color: "#475569",
            font: { family: "Inter", size: 11, weight: "500" },
            padding: 16,
          },
        },
        tooltip: {
          ...chartOptions("Accuracy", 100).plugins.tooltip,
          callbacks: {
            title: (items) => `Weight Multiplier: ${items[0].label}`,
            label: (item) => ` ${item.dataset.label}: ${item.raw.toFixed(1)}%`,
          },
        },
      },
      scales: {
        ...chartOptions("Accuracy", 100).scales,
        x: {
          ...chartOptions("Accuracy", 100).scales.x,
          title: {
            display: true,
            text: "Weight Value (w)",
            color: "#64748b",
            font: { family: "DM Mono", size: 10, weight: "500" },
          },
        },
      },
    },
  });
}

// ----------------------------------------------------
// Confusion Matrix
// ----------------------------------------------------
function renderConfusionMatrix(matrix) {
  const container = document.getElementById("confusion-matrix");
  if (!container) return;
  if (!matrix || !matrix.length) {
    container.innerHTML = '<div class="empty-state">Run classification to generate matrix.</div>';
    return;
  }

  const numClasses = matrix.length;
  const labels = matrix.map((_, i) => (i < 2 ? `Class ${String.fromCharCode(65 + i)}` : `Class ${i + 1}`));
  const totalSamples = matrix.flat().reduce((a, b) => a + b, 0);
  const max = Math.max(...matrix.flat(), 1);

  let html = `
    <div class="matrix-wrapper">
      <div class="matrix-top-axis">Predicted Label</div>
      <div class="matrix-body-layout">
        <div class="matrix-left-axis"><span>Actual Label</span></div>
        <div class="matrix-grid-area">
          <div class="matrix-header-row">
            <div class="matrix-corner-label"></div>
            ${labels.map((l) => `<div class="matrix-col-header">${l}</div>`).join("")}
          </div>
  `;

  for (let r = 0; r < numClasses; r++) {
    html += `<div class="matrix-row"><div class="matrix-row-header">${labels[r]}</div>`;
    for (let c = 0; c < numClasses; c++) {
      const count = matrix[r][c];
      const isDiagonal = r === c;
      const pct = totalSamples ? ((count / totalSamples) * 100).toFixed(1) : 0;
      const intensity = count / max;

      let bgColor;
      let textColor;
      if (isDiagonal) {
        bgColor = `rgba(16, 185, 129, ${0.15 + intensity * 0.75})`;
        textColor = intensity > 0.45 ? "#ffffff" : "#065f46";
      } else {
        bgColor = count > 0 ? `rgba(239, 68, 68, ${0.12 + intensity * 0.65})` : "rgba(241, 245, 249, 0.7)";
        textColor = count > 0 ? (intensity > 0.45 ? "#ffffff" : "#991b1b") : "#94a3b8";
      }

      html += `
        <div class="matrix-cell" style="background:${bgColor}; color:${textColor};" 
             title="Actual: ${labels[r]}, Predicted: ${labels[c]} (${count} samples, ${pct}%)">
          <span class="cell-count">${count}</span>
          <span class="cell-pct">${pct}%</span>
        </div>
      `;
    }
    html += `</div>`;
  }

  html += `
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ----------------------------------------------------
// Feature Distance Contribution Bars
// ----------------------------------------------------
function renderDistanceBars(contributions, names) {
  const container = document.getElementById("distance-bars");
  if (!container) return;
  const max = Math.max(...contributions, 0.0001);
  const sum = contributions.reduce((a, b) => a + b, 0) || 1;

  container.innerHTML = contributions
    .map((val, idx) => {
      const share = Math.round((val / sum) * 100);
      const barFill = Math.min(100, Math.round((val / max) * 100));
      const color = chartPalette[idx % chartPalette.length];
      return `
        <div class="distance-bar-row">
          <div class="distance-bar-info">
            <span class="feat-dot" style="background:${color}"></span>
            <span class="feat-title">${names[idx] || `Feature ${idx + 1}`}</span>
          </div>
          <div class="bar-rail">
            <div class="bar-fill" style="width: ${barFill}%; background: linear-gradient(90deg, ${color}cc, ${color})"></div>
          </div>
          <div class="distance-bar-values">
            <span class="feat-diff">${val.toFixed(2)}</span>
            <span class="feat-share">${share}%</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// ----------------------------------------------------
// 2D FEATURE SPACE INTERACTIVE CANVAS ENGINE
// Visualizes points, Point A (draggable query), Point B,
// Iso-distance metric ellipse (deforming live with weights),
// and live K-nearest neighbor connecting rays!
// ----------------------------------------------------
class FeatureSpaceCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.dataset = null;
    this.weights = [1, 1];
    this.k = 3;
    this.pointA = [0.4, 0.3]; // normalized coords [-2.5, 2.5]
    this.pointB = [-0.8, -0.6];
    this.draggedPoint = null;

    this.setupListeners();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Continuous loop for pulse effect
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  loop() {
    this.draw();
    requestAnimationFrame(this.loop);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = (rect.height || 340) * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height || 340;
    this.draw();
  }

  updateData(dataset, weights, k) {
    this.dataset = dataset;
    if (weights && weights.length >= 2) {
      this.weights = weights;
    }
    if (k) this.k = k;
    this.draw();
  }

  // World coordinates [-3, 3] to Canvas coordinates [0, width], [height, 0]
  toScreen(x, y) {
    const padX = 40;
    const padY = 36;
    const sx = padX + ((x + 3) / 6) * (this.width - 2 * padX);
    const sy = this.height - padY - ((y + 3) / 6) * (this.height - 2 * padY);
    return [sx, sy];
  }

  toWorld(sx, sy) {
    const padX = 40;
    const padY = 36;
    const x = ((sx - padX) / (this.width - 2 * padX)) * 6 - 3;
    const y = 3 - ((sy - padY) / (this.height - 2 * padY)) * 6;
    return [Math.max(-2.8, Math.min(2.8, x)), Math.max(-2.8, Math.min(2.8, y))];
  }

  setupListeners() {
    if (!this.canvas) return;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    this.canvas.addEventListener("mousedown", (e) => {
      const [sx, sy] = getPos(e);
      const [ax, ay] = this.toScreen(this.pointA[0], this.pointA[1]);
      const [bx, by] = this.toScreen(this.pointB[0], this.pointB[1]);

      const distA = Math.hypot(sx - ax, sy - ay);
      const distB = Math.hypot(sx - bx, sy - by);

      if (distA < 22) {
        this.draggedPoint = "A";
      } else if (distB < 22) {
        this.draggedPoint = "B";
      } else {
        // Clicked elsewhere: move Point A to cursor location
        const [wx, wy] = this.toWorld(sx, sy);
        this.pointA = [wx, wy];
        this.draggedPoint = "A";
        this.notifyPointMoved();
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.draggedPoint) return;
      const [sx, sy] = getPos(e);
      const [wx, wy] = this.toWorld(sx, sy);
      if (this.draggedPoint === "A") {
        this.pointA = [wx, wy];
      } else if (this.draggedPoint === "B") {
        this.pointB = [wx, wy];
      }
      this.notifyPointMoved();
    });

    window.addEventListener("mouseup", () => {
      this.draggedPoint = null;
    });

    // Mobile / Touch Handling
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const [wx, wy] = this.toWorld(sx, sy);
        this.pointA = [wx, wy];
        this.draggedPoint = "A";
        this.notifyPointMoved();
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener("touchmove", (e) => {
      if (this.draggedPoint && e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const [wx, wy] = this.toWorld(sx, sy);
        this.pointA = [wx, wy];
        this.notifyPointMoved();
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener("touchend", () => {
      this.draggedPoint = null;
    });
  }

  notifyPointMoved() {
    if (window.onFeatureSpacePointMoved) {
      window.onFeatureSpacePointMoved(this.pointA, this.pointB, this.weights);
    }
  }

  draw() {
    if (!this.ctx || !this.width) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Grid lines
    ctx.strokeStyle = "rgba(226, 232, 240, 0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -3; x <= 3; x += 1) {
      const [sx] = this.toScreen(x, 0);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = -3; y <= 3; y += 1) {
      const [, sy] = this.toScreen(0, y);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Axes
    const [origX, origY] = this.toScreen(0, 0);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origX, 0);
    ctx.lineTo(origX, h);
    ctx.moveTo(0, origY);
    ctx.lineTo(w, origY);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#64748b";
    ctx.font = "500 10px 'DM Mono', monospace";
    ctx.fillText("Feature 1 (Normalized) →", w - 165, origY - 7);
    ctx.fillText("Feature 2 ↑", origX + 7, 16);

    // 2. Plot Dataset Samples
    const points = [];
    if (this.dataset && this.dataset.features) {
      const f = this.dataset.features;
      const labels = this.dataset.labels;
      const f0 = f.map((r) => r[0]);
      const f1 = f.map((r) => r[1]);
      const mean0 = f0.reduce((a, b) => a + b, 0) / f0.length;
      const mean1 = f1.reduce((a, b) => a + b, 0) / f1.length;
      const std0 = Math.sqrt(f0.reduce((s, v) => s + (v - mean0) ** 2, 0) / f0.length) || 1;
      const std1 = Math.sqrt(f1.reduce((s, v) => s + (v - mean1) ** 2, 0) / f1.length) || 1;

      for (let i = 0; i < f.length; i++) {
        const nx = (f[i][0] - mean0) / std0;
        const ny = (f[i][1] - mean1) / std1;
        const [sx, sy] = this.toScreen(nx, ny);
        const isClassA = labels[i] === "Class A" || labels[i] === labels[0];

        points.push({ x: nx, y: ny, sx, sy, isClassA, label: labels[i] });

        ctx.fillStyle = isClassA ? "rgba(99, 102, 241, 0.7)" : "rgba(16, 185, 129, 0.7)";
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 3. Weighted KNN Connecting Rays
    const w1 = Math.max(0.01, this.weights[0] ?? 1);
    const w2 = Math.max(0.01, this.weights[1] ?? 1);

    if (points.length > 0) {
      const scored = points.map((p) => {
        const dist = Math.sqrt(w1 * (p.x - this.pointA[0]) ** 2 + w2 * (p.y - this.pointA[1]) ** 2);
        return { ...p, dist };
      });
      scored.sort((a, b) => a.dist - b.dist);
      const kNearest = scored.slice(0, Math.min(this.k, scored.length));

      const [ax, ay] = this.toScreen(this.pointA[0], this.pointA[1]);
      ctx.save();
      ctx.setLineDash([4, 4]);
      kNearest.forEach((nb) => {
        ctx.strokeStyle = nb.isClassA ? "rgba(99, 102, 241, 0.75)" : "rgba(16, 185, 129, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(nb.sx, nb.sy);
        ctx.stroke();

        // Highlight ring
        ctx.strokeStyle = nb.isClassA ? "#6366f1" : "#10b981";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(nb.sx, nb.sy, 7, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // 4. Weighted Metric Iso-Distance Ellipses
    // Iso-distance boundary: w1 * dx^2 + w2 * dy^2 = R^2
    const [ax, ay] = this.toScreen(this.pointA[0], this.pointA[1]);
    const [zeroX, zeroY] = this.toScreen(0, 0);
    const [oneX, oneY] = this.toScreen(1, 1);
    const scaleX = Math.abs(oneX - zeroX);
    const scaleY = Math.abs(oneY - zeroY);

    const contourRadii = [0.85, 1.6];
    contourRadii.forEach((r, idx) => {
      const rx = (r / Math.sqrt(w1)) * scaleX;
      const ry = (r / Math.sqrt(w2)) * scaleY;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ax, ay, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 0 ? "rgba(245, 158, 11, 0.8)" : "rgba(245, 158, 11, 0.35)";
      ctx.lineWidth = idx === 0 ? 2 : 1.2;
      ctx.setLineDash(idx === 0 ? [5, 4] : [3, 4]);
      ctx.stroke();
      if (idx === 0) {
        ctx.fillStyle = "rgba(245, 158, 11, 0.06)";
        ctx.fill();
      }
      ctx.restore();
    });

    // 5. Point B
    const [bx, by] = this.toScreen(this.pointB[0], this.pointB[1]);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0e7490";
    ctx.font = "600 10px Inter, sans-serif";
    ctx.fillText("Point B", bx + 11, by + 3);

    // 6. Point A (Query Target)
    const now = performance.now() / 500;
    const pulseRadius = 11 + Math.sin(now) * 3;
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(ax, ay, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#b45309";
    ctx.font = "600 11px Inter, sans-serif";
    ctx.fillText("Point A (Query)", ax + 12, ay - 4);
  }
}

let featureCanvas = null;

function initDecisionCanvas() {
  featureCanvas = new FeatureSpaceCanvas("decision-canvas");
}

function updateDecisionCanvas(dataset, weights, k) {
  if (!featureCanvas) {
    initDecisionCanvas();
  }
  if (featureCanvas) {
    featureCanvas.updateData(dataset, weights, k);
  }
}
