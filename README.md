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

## Exhibition / indoor plans, event logo and footer

- **Sheet tab → Plan type & grid**: choose *Indoor / exhibition*, set a grid module (e.g. 3 m). The grid shows on screen and prints on the sheet with lettered columns (A, B, C…) and numbered rows (1, 2, 3…) so there are grid lines between stands. Turn printing/labels off there if not wanted. The Measure tool still works anywhere.
- **Library → Exhibition**: stands (3×3, 6×3, 6×6, 9×6, island 9×9), columns, registration desk, lounge, storage. Stands lock to grid corners when placed. **Number the stands** (Sheet tab) numbers them row by row.
- **Shade cloth** keeps its green banded look; the plain solid black line is a separate style (Plain black line). A line-style selector appears in the toolbar when the Fence tool is active.
- **Event logo**: Sheet tab → Upload event logo. It prints at the top of the right-hand panel with the event details below it.
- **Footer**: logos and company details come from `public/brand.json`. Put your logo files in `public/` (`impi-logo.png`, `logo-2.png`, `logo-3.png`; missing files are skipped) and replace every `[PLACEHOLDER]` in `brand.json` before issuing plans.

## Internal layouts (tent / VIP area)

1. Draw the outline with **Line / fence → Plain black line** (a thin black line, also closable).
2. Select it, then in the toolbar View box choose **+ New internal layout…** and name it. The outline joins the layout.
3. You are now in "Internals only": the aerial underlay and the rest of the site are hidden, new items belong to that layout, and Fit/legend/scale/export use only that layout (sheet title shows "<name> – internal layout").
4. Switch the View box back to **Whole plan** to see everything together. Sheet tab → Internal layouts has rename, delete, and add/remove selected items.

## Safety sign images and evacuation plan

- Assembly point, hose reel, fire extinguisher, first aid, no smoking and emergency exit signs now use the supplied sign artwork (embedded in the app, no extra files). A mirrored exit sign is available. The Defibrillator (AED) sign was removed; it belongs to the medical tent. Older plans containing an AED sign simply no longer draw it.
- **Evacuation** (toolbar button, or Sheet tab → Emergency evacuation) switches to the separate emergency evacuation plan: structures fade, and exits, assembly point, first aid and fire equipment stand out.
- **Generate evacuation routes** draws green arrowed routes from every zone, tent, stage, stall and stand to its nearest exit (Exit / Emergency exit / Entrance doors; exit signs if there are no doors), routing around structures, walls and fences, then on to the Assembly point sign if one is placed. Re-run it after changing the layout; Clear routes removes them. Routes only appear in the evacuation plan and export as their own sheet ("EMERGENCY EVACUATION PLAN"). Works inside internal layouts too.
- Routes are shortest clear walking paths, indicative only. Verify exit widths and capacity.
