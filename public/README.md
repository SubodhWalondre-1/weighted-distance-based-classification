# Weighted Distance Classifier Frontend

A framework-free interactive dashboard for the Weighted Distance-Based Classification practical. It uses semantic HTML, responsive CSS, vanilla JavaScript, and Chart.js from a CDN.

## Run

Start the FastAPI backend first from `backend/`:

```bash
python -m uvicorn main:app --reload
```

Then serve this folder with any static file server. For example, from the project root:

```bash
python -m http.server 5500 -d frontend
```

Open `http://127.0.0.1:5500` in a browser.

Opening `index.html` directly may work in some browsers, but a local server is recommended so the frontend and API requests behave consistently.

## Structure

- `index.html` - accessible dashboard markup and Chart.js CDN entry point
- `style.css` - white academic visual system, responsive layout, and animations
- `app.js` - state, API requests, controls, loading states, metrics, and errors
- `charts.js` - comparison chart, feature-impact chart, confusion matrix, and distance bars

The frontend expects the backend at `http://127.0.0.1:8000`. Feature sliders update the visual explanation locally and only call the backend when **Run classification** is pressed.
