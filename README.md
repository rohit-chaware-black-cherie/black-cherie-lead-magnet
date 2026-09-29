# Black*Cherie — Alignment Score form

```
GET /  → form
POST /api/submissions  → validate → score → MongoDB → email scorecard
```

## Run locally
```bash
cp .env.example .env
npm install
npm run dev                 # http://localhost:3000
npm test
```

Set `EMAIL_DRY_RUN=true` locally to log emails without sending.
Health check: `GET /health`.

## Notes
- Score is recomputed on the server (`src/scoring.js`) so clients can't tamper with it.
- `submissionId` is unique — client retries won't create duplicate rows or emails.
- Optional PDF: set `GUIDE_PDF_PATH` and the file is attached to the scorecard email.
