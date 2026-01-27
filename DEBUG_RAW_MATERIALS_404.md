# Issue: API Route 404 "Route not found" on Production

The usage `GET /api/raw-materials` works locally but returns `404 Not Found` (with body `{"error":"Route not found"}`) on the production server.

## Diagnosis
The error message `{"error":"Route not found"}` comes directly from your Express backend (`server/index.js`). This confirms the server is receiving the request but **does not recognize the route**.

### The Root Cause: Missing Files on Server
We analyzed the `git pull` logs you shared from the server:
```
Updating aed9e96..b610bfc
Fast-forward
 server/migrate_raw_materials.js | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
```

**Crucially, this log shows that ONLY `migrate_raw_materials.js` was updated.**

The other critical files we modified locally were **NOT** updated on the server:
1.  `server/routes/raw_materials.js` (The new file containing the logic)
2.  `server/index.js` (The file where we registered the route using `app.use(...)`)

Because `server/index.js` on the server wasn't updated, it doesn't know about `app.use('/api/raw-materials')`, so it returns 404.

## Solution

You need to push your local changes to GitHub so they can be pulled to the server.

### Step 1: Push Changes Locally
On your **local machine** (where we made the edits), run:

```bash
# Add the new route file and modified index
git add server/routes/raw_materials.js server/index.js

# Commit the changes
git commit -m "feat: add raw materials api route"

# Push to GitHub
git push origin main
```

### Step 2: Deploy to Server
Go back to your **server terminal** and run:

```bash
# Pull the changes you just pushed
git pull

# Verify that server/index.js and server/routes/raw_materials.js are in the list of updated files
# Restart the server to load the new code
pm2 restart all
```

After these steps, the 404 error will be resolved.
