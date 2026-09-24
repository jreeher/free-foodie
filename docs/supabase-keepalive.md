# Keeping a free-tier Supabase project from pausing

Free-tier Supabase projects are paused after about 7 days without activity.
A paused project stops serving the app until someone restores it. The fix is a
scheduled job that makes a few real read queries every few days. GitHub
Actions is a good host: it's free, needs no server, and runs on GitHub's
machines (so it isn't affected by office network restrictions).

Supabase's inactivity rules can change, so re-check their docs. A keep-alive
job isn't a guarantee. If real users depend on the app, the Pro plan is the
only fully reliable fix.

## What you need

- A GitHub repo for the project.
- The project's URL (`https://<project-ref>.supabase.co`).
- The project's **publishable / anon key** (Supabase dashboard -> Settings ->
  API). Never use the `service_role` or "secret" key here.
- At least one table the anon key is allowed to read. Check that the table has
  Row Level Security enabled with a `SELECT` policy that allows public reads
  (e.g. `USING (true)`). If no table is publicly readable, add a tiny one just
  for this, or the queries will return empty results (still counts as activity,
  but you won't be testing much).

## Step 1: Add the two repository secrets

In GitHub: repo -> **Settings** -> **Secrets and variables** (under Security)
-> **Actions** -> **Secrets** tab -> **New repository secret**.

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | the publishable/anon key |

Use **repository** secrets (not environment secrets or variables). Names must
match the workflow exactly.

## Step 2: Add the workflow

Create `.github/workflows/supabase-keepalive.yml`. Replace the table and
column names in the three `q ...` lines with ones from your project. Aim for
queries that resemble what your app really does (a list with a join, a filtered
search, a small aggregate) rather than one bare request.

```yaml
name: Supabase keep-alive

on:
  schedule:
    - cron: '17 14 */3 * *'   # every 3 days, 14:17 UTC
  workflow_dispatch:           # adds a manual "Run workflow" button

jobs:
  keepalive:
    runs-on: ubuntu-latest
    steps:
      - name: Run app-style read queries
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          set -euo pipefail
          api="$SUPABASE_URL/rest/v1"

          # Vary the search term by day of year
          terms=(alpha beta gamma delta)
          term="${terms[$(( 10#$(date +%j) % ${#terms[@]} ))]}"

          q() {
            echo "GET $1"
            curl -fsS --retry 3 --retry-delay 5 "$api/$1" \
              -H "apikey: $SUPABASE_ANON_KEY" -o /dev/null -w "  -> %{http_code}\n"
            sleep $(( RANDOM % 4 + 1 ))
          }

          # EDIT THESE to match your own tables/columns:
          q "items?select=id,name,category&order=created_at.desc&limit=5"
          q "items?select=id,name&name=ilike.*${term}*&limit=10"
          q "ratings?select=item_id,rating&limit=20"
```

Query tips (PostgREST syntax):
- Joins: `parent?select=id,title,child(name)` follows foreign keys.
- Search: `column=ilike.*text*`.
- Always add `limit` so the job stays cheap.

Test each query before committing:

```bash
curl "$SUPABASE_URL/rest/v1/items?select=id&limit=1" -H "apikey: $SUPABASE_ANON_KEY"
```

A `200` with JSON means it works. A `401` means the key is wrong; a `404`
means the table name is wrong (or not exposed to the API).

## Step 3: Commit, push, and run it once

1. Commit and push the workflow file to the repo's default branch.
2. In GitHub open the **Actions** tab, then click the workflow in the left
   sidebar under **All workflows** ("Supabase keep-alive").
3. Click **Run workflow** (dropdown at the top right of that page), keep the
   default branch, and confirm. If GitHub asks to enable workflows on first
   use, do that first.
4. Open the run and check the log: each query should show `-> 200`.

## How it behaves

- Runs every 3 days (leaves margin if one run is delayed or fails).
- The job fails, and GitHub emails the repo owner, if the database is
  unreachable or a query errors. That also alerts you if the project has
  already paused.
- GitHub disables scheduled workflows in repos with no commits for 60 days.
  Make an occasional commit or re-enable it from the Actions tab.
- Watch the project for the first week or two to confirm it stays awake.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No "Run workflow" button | Workflow isn't on the default branch yet, or lacks `workflow_dispatch:` |
| Job fails with 401 | Wrong key, or secret name doesn't match the workflow |
| Job fails with 404 | Table name is wrong or the table isn't exposed via the API |
| Job fails with `curl: (22)` and a 5xx | Project is paused or down; restore it in the Supabase dashboard |
| Empty `[]` results | RLS blocks anon reads on that table (add a public `SELECT` policy or pick another table) |
