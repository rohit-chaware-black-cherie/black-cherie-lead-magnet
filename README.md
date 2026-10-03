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

## Email delivery
Email is sent through the Brevo HTTPS API. Create a Brevo API key, verify your sender address/domain in Brevo, then add these environment variables to the deployment:

- `BREVO_API_KEY` — Brevo API key
- `SENDER_EMAIL` — sender address verified in Brevo
- `MAIL_FROM_NAME` — optional sender display name
- `MAIL_REPLY_TO` — optional reply-to address
- `EMAIL_DRY_RUN=false`

Brevo is called over HTTPS, so the app does not need outbound SMTP access. The sender must meet Brevo's verification requirements to send to other recipients.
