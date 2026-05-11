"""
SATTRACK — Satellite Tracker Backend
FastAPI + WebSocket + skyfield SGP4 propagation
"""

import asyncio
import json
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from skyfield.api import load, wgs84, EarthSatellite

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SATTRACK API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global state ─────────────────────────────────────────────────────────────

ts = load.timescale()
satellites: list[EarthSatellite] = []
tle_updated: str = ""

# Hardcoded fallback TLEs (ISS + popular sats) if Celestrak is unreachable
FALLBACK = """ISS (ZARYA)
1 25544U 98067A   24100.50000000  .00020000  00000-0  36000-3 0  9990
2 25544  51.6400 200.0000 0001200  30.0000 330.0000 15.50000000440000
HUBBLE
1 20580U 90037B   24100.50000000  .00000800  00000-0  40000-4 0  9992
2 20580  28.4700 123.4500 0002700  80.0000 280.0000 15.09000000980000
NOAA 18
1 28654U 05018A   24100.50000000  .00000200  00000-0  13000-3 0  9995
2 28654  99.0700 100.0000 0013700 100.0000 260.0000 14.12000000960000
TERRA
1 25994U 99068A   24100.50000000  .00000100  00000-0  60000-4 0  9994
2 25994  98.2100 150.0000 0001200  90.0000 270.0000 14.57000000890000
AQUA
1 27424U 02022A   24100.50000000  .00000100  00000-0  70000-4 0  9991
2 27424  98.2200 160.0000 0001300  85.0000 275.0000 14.57000000790000
GOES 16
1 41866U 16071A   24100.50000000  .00000000  00000-0  00000-0 0  9993
2 41866   0.0500 250.0000 0001000  20.0000 340.0000  1.00273000000000
SENTINEL-2A
1 40697U 15028A   24100.50000000  .00000100  00000-0  50000-4 0  9996
2 40697  98.5700 130.0000 0001100  75.0000 285.0000 14.30000000000000
"""

# ─── Category classification ───────────────────────────────────────────────────

def classify(name: str) -> str:
    n = name.upper()
    if any(k in n for k in ('ISS', 'ZARYA', 'TIANGONG', 'TIANHE', 'CSS ', 'MIR ')):
        return 'station'
    if 'STARLINK' in n:
        return 'starlink'
    if 'ONEWEB' in n:
        return 'oneweb'
    if any(k in n for k in ('GPS', 'NAVSTAR', 'GLONASS', 'GALILEO', 'BEIDOU', 'COMPASS', 'QZSS', 'IRNSS', 'GSAT-')):
        return 'gps'
    if any(k in n for k in ('NOAA', 'GOES ', 'METEOSAT', 'METEOR-', 'METOP', 'FENGYUN', 'FY-', 'HIMAWARI', 'INSAT', 'ELEKTRO', 'DMSP')):
        return 'weather'
    if any(k in n for k in ('SENTINEL', 'LANDSAT', 'TERRA', 'AQUA', 'WORLDVIEW', 'SPOT-', 'PLANET', 'DOVE', 'RESOURCESAT', 'IKONOS', 'GEOEYE', 'CARTOSAT', 'RADARSAT')):
        return 'earth'
    if any(k in n for k in ('HUBBLE', 'HST ', 'CHANDRA', 'FERMI', 'SWIFT', 'INTEGRAL', 'XMM', 'TESS', 'KEPLER', 'JAMES WEBB', 'JWST', 'RXTE', 'NUSTAR', 'WISE', 'GALEX')):
        return 'science'
    if any(k in n for k in ('DEB', 'R/B', 'ROCKET BODY', 'DEBRIS', 'FRAGM', 'PKM')):
        return 'debris'
    return 'other'

# ─── TLE sources (one per category + active catch-all) ────────────────────────

TLE_URLS = [
    "https://celestrak.org/pub/TLE/stations.txt",
    "https://celestrak.org/pub/TLE/starlink.txt",
    "https://celestrak.org/pub/TLE/oneweb.txt",
    "https://celestrak.org/pub/TLE/gps-ops.txt",
    "https://celestrak.org/pub/TLE/weather.txt",
    "https://celestrak.org/pub/TLE/resource.txt",
    "https://celestrak.org/pub/TLE/science.txt",
    "https://celestrak.org/pub/TLE/visual.txt",
    "https://celestrak.org/pub/TLE/tle-new.txt",
]

# ─── TLE loading ──────────────────────────────────────────────────────────────

def parse_fallback() -> list[EarthSatellite]:
    lines = [l for l in FALLBACK.strip().splitlines() if l.strip()]
    result = []
    for i in range(0, len(lines) - 2, 3):
        try:
            sat = EarthSatellite(lines[i + 1], lines[i + 2], lines[i].strip(), ts)
            result.append(sat)
        except Exception:
            pass
    logger.info(f"Loaded {len(result)} fallback satellites")
    return result


def fetch_tles() -> list[EarthSatellite]:
    global tle_updated
    seen: set[int] = set()
    result: list[EarthSatellite] = []
    for url in TLE_URLS:
        try:
            sats = load.tle_file(url, reload=True)
            added = 0
            for sat in sats:
                if sat.model.satnum not in seen:
                    seen.add(sat.model.satnum)
                    result.append(sat)
                    added += 1
            logger.info(f"Loaded {added} new sats from {url} (total {len(result)})")
        except Exception as e:
            logger.warning(f"TLE fetch failed ({url}): {e}")
    if not result:
        logger.warning("All TLE sources failed — using fallback")
        result = parse_fallback()
    tle_updated = datetime.now(timezone.utc).isoformat()
    logger.info(f"Total unique satellites loaded: {len(result)}")
    return result

# ─── Computation ──────────────────────────────────────────────────────────────

def get_position(sat: EarthSatellite) -> Optional[dict]:
    try:
        t = ts.now()
        geo = sat.at(t)
        sp = wgs84.subpoint(geo)
        v = geo.velocity.km_per_s
        speed = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
        return {
            "id":       sat.model.satnum,
            "name":     sat.name.strip(),
            "lat":      round(sp.latitude.degrees, 4),
            "lon":      round(sp.longitude.degrees, 4),
            "alt_km":   round(sp.elevation.km, 1),
            "speed_kms": round(speed, 2),
            "category": classify(sat.name),
        }
    except Exception:
        return None


def get_orbit_path(sat: EarthSatellite, steps: int = 80) -> list:
    path = []
    now = datetime.now(timezone.utc)
    for i in range(steps):
        t = ts.from_datetime(now + timedelta(minutes=(90 / steps) * i))
        try:
            sp = wgs84.subpoint(sat.at(t))
            path.append({
                "lat": round(sp.latitude.degrees, 3),
                "lon": round(sp.longitude.degrees, 3),
            })
        except Exception:
            pass
    return path


def get_passes(sat: EarthSatellite, lat: float, lon: float) -> list:
    observer = wgs84.latlon(lat, lon)
    now = datetime.now(timezone.utc)
    t0 = ts.from_datetime(now)
    t1 = ts.from_datetime(now + timedelta(hours=24))
    passes, cur = [], {}
    try:
        times, events = sat.find_events(observer, t0, t1, altitude_degrees=10.0)
        for ti, ev in zip(times, events):
            iso = ti.utc_datetime().isoformat()
            if ev == 0:
                cur = {"rise": iso}
            elif ev == 1:
                diff = sat - observer
                alt, az, _ = diff.at(ti).altaz()
                cur["peak"] = iso
                cur["peak_el"] = round(alt.degrees, 1)
            elif ev == 2:
                cur["set"] = iso
                if "rise" in cur:
                    passes.append(cur)
                cur = {}
    except Exception as e:
        logger.warning(f"Pass calc error: {e}")
    return passes[:5]

# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    global satellites
    satellites = fetch_tles()

# ─── REST endpoints ───────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "online", "count": len(satellites), "tle_updated": tle_updated}


@app.get("/satellites")
def all_satellites(limit: int = Query(default=250, le=500)):
    out = []
    for sat in satellites[:limit]:
        p = get_position(sat)
        if p:
            out.append(p)
    return {"count": len(out), "satellites": out}


def get_elements(sat: EarthSatellite) -> dict:
    m = sat.model
    try:
        no = m.no_kozai if m.no_kozai > 0 else m.no
    except AttributeError:
        no = 0
    period_min = round((2 * math.pi / no), 2) if no > 0 else None
    try:
        epoch_dt = sat.epoch.utc_datetime()
        epoch_iso = sat.epoch.utc_iso()
        epoch_age = round((datetime.now(timezone.utc) - epoch_dt).total_seconds() / 86400, 2)
    except Exception:
        epoch_iso = None
        epoch_age = None
    alt_km_approx = None
    try:
        t = ts.now()
        sp = wgs84.subpoint(sat.at(t))
        alt_km_approx = round(sp.elevation.km, 1)
    except Exception:
        pass
    if alt_km_approx is not None:
        if alt_km_approx < 500:
            orbit_type = "LEO"
        elif alt_km_approx < 2000:
            orbit_type = "MEO"
        elif alt_km_approx < 35900:
            orbit_type = "HEO"
        else:
            orbit_type = "GEO"
    else:
        orbit_type = "UNK"
    return {
        "incl_deg":      round(math.degrees(m.inclo), 4),
        "ecc":           round(m.ecco, 7),
        "raan_deg":      round(math.degrees(m.nodeo), 4),
        "period_min":    period_min,
        "epoch":         epoch_iso,
        "epoch_age_days": epoch_age,
        "orbit_type":    orbit_type,
    }


@app.get("/satellite/{sat_id}")
def one_satellite(sat_id: int):
    for sat in satellites:
        if sat.model.satnum == sat_id:
            pos = get_position(sat)
            if not pos:
                return {"error": "position unavailable"}
            return {**pos, "orbit": get_orbit_path(sat), "elements": get_elements(sat)}
    return {"error": "not found"}


@app.get("/passes")
def pass_predictions(
    sat_id: int,
    lat: float = Query(...),
    lon: float = Query(...),
):
    for sat in satellites:
        if sat.model.satnum == sat_id:
            return {"name": sat.name.strip(), "passes": get_passes(sat, lat, lon)}
    return {"error": "not found"}


@app.post("/reload")
async def reload_tles():
    global satellites
    satellites = fetch_tles()
    return {"status": "ok", "count": len(satellites)}

# ─── WebSocket ────────────────────────────────────────────────────────────────

active_connections: list[WebSocket] = []


@app.websocket("/ws")
async def ws_stream(websocket: WebSocket, limit: int = 250):
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"WS connected. Total: {len(active_connections)}")
    try:
        while True:
            positions = []
            for sat in satellites[:limit]:
                p = get_position(sat)
                if p:
                    positions.append(p)
            await websocket.send_text(json.dumps({
                "type": "positions",
                "ts":   datetime.now(timezone.utc).isoformat(),
                "count": len(positions),
                "data": positions,
            }))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WS error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(f"WS disconnected. Total: {len(active_connections)}")