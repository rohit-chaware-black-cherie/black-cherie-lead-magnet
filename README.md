# Black*Cherie — Alignment Score form

```
GET /  → form
POST /api/submissions  → validate → score → MongoDB → email HTML scorecard
```

The score is **not shown on the page**. After submit, users see a confirmation and receive the full scorecard in email.

## Run locally
```bash
cp .env.example .env
npm install
npm run dev                 # http://localhost:3000
npm test
```

Set `EMAIL_DRY_RUN=true` locally to log emails without sending.
Health check: `GET /health`.
