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

## Email delivery on Render
Emails are sent through the Resend HTTPS API. Create a Resend API key and verify the sending domain, then add these environment variables to the Render web service:

- `RESEND_API_KEY` — Resend API key
- `SENDER_EMAIL` — sender address on the verified domain
- `MAIL_FROM_NAME` — optional sender display name
- `MAIL_REPLY_TO` — optional reply-to address
- `EMAIL_DRY_RUN=false`

Do not configure Gmail SMTP credentials; Render deployments use Resend over HTTPS.
