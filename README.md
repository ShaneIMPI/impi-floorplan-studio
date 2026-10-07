# FloorPlan Studio (cloud edition)

Event floor-plan tool with saved plans, revision history and staff logins.
Stack: static front end + three Vercel serverless functions + Neon Postgres. No other paid services.

## Set-up (about 15 minutes)

### 1. Neon (database)
1. Create a free project at neon.com (any region; Frankfurt or the nearest to South Africa).
2. Open **SQL Editor**, paste the contents of `schema.sql`, and run it.
3. Click **Connect** and copy the **pooled** connection string. This is `DATABASE_URL`.

### 2. GitHub
Create a new private repository and upload everything in this folder (keep the `api` and `public` folders as they are).

### 3. Vercel
1. Import the repository at vercel.com/new. Leave the framework as **Other** and the build settings blank.
2. Under **Environment Variables** add:
   - `DATABASE_URL`: the Neon string from step 1
   - `JWT_SECRET`: a long random string (`openssl rand -base64 48`, or any 40+ character random text)
3. Deploy. If your project root is not `public`, set **Output Directory** to `public`.

### 4. First run
Open the site. On the **Sheet** tab, under **Cloud**, click **Create admin account**. This only works once, while there are no users. Then use **Add team member** for your staff.

## How it works
- **Save to cloud** writes a new numbered revision every time. Nothing is overwritten, so earlier issues sent to EMS stay retrievable under **Revisions**.
- Aerial and client-plan images are stored as JPEGs (max about 4 MB each, resized to 3000 px) in the database. The free plan gives 0.5 GB per project, which is roughly 250 or more images. If you outgrow it, move images to Cloudflare R2 or Vercel Blob; only `api/image.js` changes.
- Logins use hashed passwords (bcrypt) and a signed, HTTP-only 14-day cookie.

## Housekeeping
- Neon's free compute sleeps after 5 minutes idle. The first request after a quiet spell can take a second or two longer.
- Passwords cannot be reset by email yet. An admin can add a fresh account, or reset by running `update users set pw_hash = ...` in Neon.
- Neon free plan keeps only a short restore window. Use **Save project** (JSON) on the Sheet tab now and then for an offline backup of important events.
- Check Neon's and Vercel's current free-plan limits on their pricing pages before relying on them.

## Files
- `public/index.html`: the whole front end
- `api/auth.js`, `api/plans.js`, `api/image.js`, `api/_lib.js`: the back end
- `schema.sql`: database tables
- `.env.example`: the two settings you must provide

---

## Staff-only edition (locked)

The app is now served only to signed-in users.

- `public/index.html` is the **sign-in page** (first run: it asks you to create the administrator account).
- `private/app.html` is the **real app**. It is never served as a static file. `api/app.js` checks the session cookie and only then returns it at `/app`. No cookie = redirect to the sign-in page.
- `vercel.json` rewrites `/app` to `/api/app` and bundles the `private/` folder into the function.
- **Company name, logo and watermark** are fixed to "IMPI Protection Agency" for staff accounts. Only the administrator sees the company-name and logo controls.
- **Logo:** add your logo file as `public/impi-logo.png`. It appears on the sign-in page and in every exported title block. Without it the title block shows the company name as text.

### Deploy
Upload the whole folder to GitHub (keep the `api`, `private` and `public` folders and `vercel.json`). Vercel redeploys on its own. Existing accounts, plans and images in Neon are untouched.

Note: branding is locked in the app's interface. It stops staff changing it by accident or habit, not a determined technical user.
