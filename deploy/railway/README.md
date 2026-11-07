# Railway deployment

Target: project `84390521-4312-4cca-9b2d-1bc7e1dc829d`, production environment.
Source: `MaM-SZ/AIGC-Studio`, branch `dev`.

The three application services use Railway's native GitHub integration. Pushes to
`dev` build and deploy affected services; no GitHub Actions token is required.
Each application's production environment has its own native repository trigger.
All Docker build contexts are the repository root. Build and deployment settings
are stored on the Railway services (no deprecated `railway.toml` configuration).

| Service | Dockerfile / source | Health check | Memory ceiling |
| --- | --- | --- | --- |
| novanova-api | `deploy/railway/api.Dockerfile` | `/actuator/health` | 1 GB |
| novanova-web | `deploy/railway/web.Dockerfile` | `/` | 0.375 GB |
| novanova-gateway | `deploy/railway/gateway.Dockerfile` | `/healthz` | 0.125 GB |
| Postgres | Existing Railway Postgres image and persistent volume | — | 0.5 GB |
| Redis | Existing Redis image and persistent volume | — | 0.25 GB |

Each service runs one replica. CPU ceilings are 1 vCPU for the API and 0.5 vCPU for
the other services. These are limits, not reserved resources or fixed charges;
Railway bills actual usage. Watch paths restrict builds to each service's source
directory and deployment files.

## Data and credentials

This deployment starts with a new `aigc_studio` database (automatically created by
the application's bootstrap initializer), Redis logical database `1`, and a
separate `aigc-studio:` prefix for the AI task stream. Existing databases and
volumes are retained. The previously stopped ToonFlow services remain stopped.

Database and Redis connection details use Railway service variable references.
The encryption key and administrator password are generated outside Git. The
local `.env.railway-access` file is ignored by Git and Docker and contains the
initial administrator credentials. Read it locally or use Railway's Variables tab;
never add it to a commit. Changing `APP_SECRET_KEY` after saving encrypted
provider credentials will make those credentials unreadable.

Only the gateway has a public HTTP domain. It routes `/api/` over Railway's
private network to the API, and other requests to Next.js. It preserves the
public HTTPS scheme and disables buffering for streamed AI responses. Browser
API requests use the same origin, with no embedded API keys.

## Low-traffic settings and Serverless

`sleepApplication` is enabled before deployments for all five services. Next.js
telemetry is disabled. The gateway resolves private DNS only when handling a
request; its health check is local and does not wake the API or web service.
The API uses a 384 MB JVM heap, a small database connection pool (maximum four,
initial/minimum idle zero), and one AI consumer at a time. Restart retries are
bounded to avoid an indefinitely failing application consuming resources.

**Serverless is not a promise that every service will sleep.** Railway requires
5–10 minutes without outbound packets. This upstream application continuously
consumes Redis queues and runs scheduled database tasks, so the API, Redis and
Postgres may remain awake even without users. The web and gateway can sleep
independently. Do not disable queue consumers to force sleep: that breaks AI
generation and recovery. Idle containers and volumes can still incur charges;
opening the site after sleep may involve a cold start or a retry.

No uptime monitor is configured, since periodic HTTP checks would defeat sleep.
Full backend scale-to-zero would require redesigning the queue consumers and
scheduled jobs or moving them to an on-demand worker architecture.

## Further configuration

After administrator login, configure model providers and object storage in the
application. AI provider usage and object storage have their own costs. SMTP and
payment merchant credentials are not supplied by this deployment. Email health
checks are disabled while SMTP is unconfigured; database and Redis health checks
remain active.

For database migrations, keep `FLYWAY_MIGRATION_LOCATION` set to
`classpath:db/migration-community` for the new database. Never point an existing
database at a different Flyway history.

## Verification

Verify the GitHub commit SHA and `SUCCESS` status for all three application
deployments. Check the gateway home page and `/healthz`, then sign in and verify
an authenticated API request and canvas save/read/delete. Actual model generation
requires a configured provider. Inspect Railway's deployment state after an idle
period to distinguish an enabled Serverless flag from confirmed sleeping.
