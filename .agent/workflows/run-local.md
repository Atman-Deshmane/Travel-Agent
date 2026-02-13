---
description: Run the full app locally (backend + frontend) for development
---
// turbo-all

## Prerequisites
- Python 3.10+ installed
- Node.js 18+ installed
- `.env` file with API keys in the project root

## Steps

1. **Create Python venv** (one-time, skip if `venv/` exists):
```bash
cd "/Users/atmandeshmane/Documents/NextLeap Capstone Project 1"
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

2. **Start the backend** (runs on port 5001):
```bash
cd "/Users/atmandeshmane/Documents/NextLeap Capstone Project 1"
venv/bin/python server.py
```

3. **Start the frontend** (runs on port 5173, in a new terminal):
```bash
cd "/Users/atmandeshmane/Documents/NextLeap Capstone Project 1/trip-dashboard"
npm run dev
```

4. Open http://localhost:5173/kodaikanal/ in browser

## Notes
- The frontend automatically detects dev mode and routes API calls to `127.0.0.1:5001` (see `src/config/api.ts`)
- In production, it routes to `api.100cr.cloud`
- The backend reads API keys from the `.env` file in the project root
