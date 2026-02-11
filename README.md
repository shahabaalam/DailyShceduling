<p align="center">
  <img src="assets/icons/logo.png" alt="Daily Scheduling logo" width="72" />
</p>

# Daily Scheduling

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.13-1f2430?style=flat&logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-1f2430?style=flat&logo=fastapi&logoColor=white" />
  <img alt="SQLAlchemy" src="https://img.shields.io/badge/SQLAlchemy-1f2430?style=flat&logo=sqlalchemy&logoColor=white" />
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-1f2430?style=flat&logo=sqlite&logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-1f2430?style=flat&logo=javascript&logoColor=white" />
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-1f2430?style=flat&logo=html5&logoColor=white" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1f2430?style=flat&logo=css3&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-1f2430?style=flat&logo=vercel&logoColor=white" />
</p>

Elegant daily scheduling with a clean timeline, fast add/edit flows, and a responsive UI that scales from mobile to desktop.

## Highlights
- Fast task creation with timeline view
- Focus mode, calendar jump, inbox, and settings
- Google login with per‑user data isolation
- Responsive layout with desktop sidebar and mobile menu
- Encrypted fields stored in SQLite

## Quick Start
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open `http://localhost:8000`

## Environment
Create `.env` (or set variables in your host):
```
DATABASE_KEY=your_long_random_key
DATABASE_SALT=your_salt
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---
Built for clarity, speed, and calm daily planning.
