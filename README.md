# SATTRACK

Real-time satellite tracking dashboard with a FastAPI backend and a React + Vite frontend.

## What This Project Does

- Streams live satellite positions from backend to frontend using WebSocket
- Shows satellites on an interactive 3D Earth view
- Classifies satellites into categories (station, starlink, oneweb, gps, weather, earth observation, science, debris, other)
- Displays details for a selected satellite, including orbital elements and predicted passes

## Tech Stack

Backend:
- FastAPI
- Skyfield
- Uvicorn

Frontend:
- React
- Vite
- Three.js
- @react-three/fiber
- @react-three/drei

## Project Structure

- backend/main.py
- backend/requirements.txt
- frontend/package.json
- frontend/vite.config.js
- frontend/src

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Run Locally

### 1) Start backend

From the backend folder:

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

### 2) Start frontend

From the frontend folder:

npm install
npm run dev

Frontend runs on port 5173 by default.

## API Overview

Base URL: http://localhost:8000

- GET /
  - Health/status and TLE update time
- GET /satellites?limit=250
  - Snapshot list of positions
- GET /satellite/{sat_id}
  - One satellite with orbit path and orbital elements
- GET /passes?sat_id={id}&lat={lat}&lon={lon}
  - Next visible passes for observer location
- POST /reload
  - Reload TLE data sources
- WS /ws?limit=250
  - Live stream of satellite positions every 2 seconds

## Frontend-Backend Integration

Vite proxy in frontend/vite.config.js routes:

- /satellites -> http://localhost:8000
- /passes -> http://localhost:8000
- /ws -> ws://localhost:8000 (WebSocket)

## Notes

- TLEs are loaded from multiple Celestrak feeds and deduplicated by NORAD ID
- If remote TLE sources fail, backend falls back to embedded sample satellites
- Satellite category is computed in backend and sent in each position payload

## Troubleshooting

- If frontend is blank, verify both servers are running and check browser console
- If WebSocket does not connect, ensure backend is on port 8000 and Vite dev server is on 5173
- If stale data appears, call POST /reload or restart backend

## License

No license file is currently included. Add one if you plan to distribute this project.
# ORBITAL-SURVEILLANCE-SYSTEM
