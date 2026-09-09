# Query Index configuration (tools.aem.live)

The dynamic `cards-article` listings (Adventures, Magazine) read from a
`query-index.json`. Today that file is generated in the repo by
`tools/importer/build-query-index.js` and committed at the repo root. To make it
update **automatically when authors publish** (instead of re-running the script),
configure the indexer at **https://tools.aem.live** → your site → **Index**.

> The old repo-based `helix-query.yaml` is retired; index config now lives at
> tools.aem.live. The config below is the equivalent of that file — paste it into
> the Index editor for `skumawat-adobe/ema-capstone`.

## Config

```yaml
version: 1

indices:
  # One row per adventure / magazine detail page.
  wknd-listing:
    include:
      - '/*/en/adventures/**'
      - '/*/en/magazine/**'
    exclude:
      # the listing pages themselves are not detail pages
      - '/*/en/adventures'
      - '/*/en/magazine'
    target: /query-index.json
    properties:
      title:
        select: head > meta[property="og:title"]
        value: attribute(el, 'content')
      description:
        select: head > meta[name="description"]
        value: attribute(el, 'content')
      image:
        select: head > meta[property="og:image"]
        value: attribute(el, 'content')
      category:
        # authored per page (see "Author action" below); comma-separated
        select: head > meta[name="category"]
        value: attribute(el, 'content')
      template:
        # adventure | article — used by the block's optional `filter` row
        select: head > meta[name="template"]
        value: attribute(el, 'content')
      lastModified:
        select: none
        value: parseTimestamp(headers['last-modified'], 'ddd, DD MMM YYYY hh:mm:ss GMT')
```

Notes:
- `target: /query-index.json` writes the index to the same path the block fetches
  (`blocks/cards-article/cards-article.js` → `QUERY_INDEX = '/query-index.json'`).
- The indexer always includes `path` automatically, so the block's path-prefix
  filter (`source: /us/en/adventures/`) works without any extra property.
- After saving, publish (or re-publish) the detail pages once so the indexer
  picks them up; new/edited pages are indexed automatically on each publish.

## Fields the block uses

`blocks/cards-article/cards-article.js` reads these per index row:

| Field         | Source (published page)                | Required |
|---------------|----------------------------------------|----------|
| `path`        | auto (indexer)                         | yes      |
| `title`       | `og:title`                             | yes      |
| `description` | `meta[name="description"]`             | no       |
| `image`       | `og:image`                             | no       |
| `category`    | `meta[name="category"]` (authored)     | adventures only |
| `template`    | `meta[name="template"]`                | optional |

## Author action required — `category` (and optional `template`)

Title, description, and image are already emitted on every published page, so
those index automatically. **Category is not** — it must be added to each
adventure page's metadata in Document Authoring:

1. Open the adventure page (e.g. `/us/en/adventures/bali-surf-camp`) in DA.
2. In its **Metadata** block add a row: **Category** → the category name(s),
   comma-separated for multi-category pages.

Category assignments (from the WKND source filter tabs):

| Adventure                    | Category        |
|------------------------------|-----------------|
| Bali Surf Camp               | Surfing         |
| Surf Camp in Costa Rica      | Surfing         |
| Climbing New Zealand         | Climbing        |
| Colorado Rock Climbing       | Climbing        |
| Cycling Tuscany              | Cycling, Travel |
| West Coast Cycling           | Cycling         |
| Whistler Mountain Biking     | Cycling         |
| Downhill Skiing Wyoming      | Skiing          |
| Ski Touring Mont Blanc       | Skiing          |
| Tahoe Skiing                 | Skiing          |
| Beervana in Portland         | Travel          |
| Gastronomic Marais Tour      | Travel          |
| Napa Wine Tasting            | Travel          |
| Riverside Camping            | Travel          |
| Yosemite Backpacking         | Travel          |
| Cycling Southern Utah        | *(none — All only)* |

`template` is optional: the block filters adventures vs articles by path prefix
(`/adventures/` vs `/magazine/`) via the stub's `source` row, so `template`/the
`filter` stub row is just belt-and-suspenders. If you add it, set it to
`adventure` on adventure pages and `article` on magazine pages.

## Status: live indexer is active (cutover done)

The query config above has been created via the Config Service
(`PUT https://admin.hlx.page/config/skumawat-adobe/sites/ema-capstone/content/query.yaml`),
AEM now generates `/query-index.json` automatically on publish, and the
previously-committed static `query-index.json` has been removed — the indexer's
version is the single source of truth. New detail pages are indexed on publish;
no manual step is needed.

`tools/importer/build-query-index.js` is retained only as a fallback for
offline/local development; it is no longer part of the deploy.

Category metadata has been added to all adventure detail pages (via
`import-adventure-detail.js`), so the index populates `category` and the
Adventures filter tabs render from it. The block still infers `adventure` vs
`article` from the path, so it does not depend on the `template` meta tag.

## Verifying auto-indexing (new page appears automatically)

The indexer regenerates `/query-index.json` whenever a matching page is
published — no code change or manual index step. To confirm this end-to-end:

1. **Pick/create a page** under an indexed path (`/{loc}/en/adventures/**` or
   `/{loc}/en/magazine/**`) with at least a Title (and, for adventures, a
   Category metadata row). A quick throwaway is fine — e.g.
   `/us/en/adventures/zzz-index-test`.

2. **Confirm it is NOT yet in the index:**

   ```bash
   BASE=https://main--ema-capstone--skumawat-adobe.aem.page
   curl -s "$BASE/query-index.json" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); \
       print('present:', any(r['path']=='/us/en/adventures/zzz-index-test' for r in d['data']), '| total:', d['total'])"
   ```

3. **Publish it** (preview + live):

   ```bash
   curl -s -X POST "https://admin.hlx.page/preview/skumawat-adobe/ema-capstone/main/us/en/adventures/zzz-index-test" -o /dev/null -w "preview:%{http_code}\n"
   curl -s -X POST "https://admin.hlx.page/live/skumawat-adobe/ema-capstone/main/us/en/adventures/zzz-index-test"    -o /dev/null -w "live:%{http_code}\n"
   ```

4. **Re-fetch the index** (allow a few seconds; the rebuild is async). The new
   path now appears and `total` has incremented, with `title` / `description` /
   `image` / `category` filled from the page's own metadata:

   ```bash
   curl -s "$BASE/query-index.json?cb=$(date +%s)" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); \
       row=[r for r in d['data'] if r['path']=='/us/en/adventures/zzz-index-test']; \
       print('present:', bool(row), '| total:', d['total']); \
       print(row[0] if row else 'not yet — retry in a few seconds')"
   ```

   The card then shows up automatically on the relevant listing/homepage grid
   (and under its category tab) with no code or content change to the listing.

5. **Clean up** the throwaway page (unpublish, then delete from DA source):

   ```bash
   curl -s -X DELETE "https://admin.hlx.page/live/skumawat-adobe/ema-capstone/main/us/en/adventures/zzz-index-test"    -o /dev/null -w "unpublish-live:%{http_code}\n"
   curl -s -X DELETE "https://admin.hlx.page/preview/skumawat-adobe/ema-capstone/main/us/en/adventures/zzz-index-test" -o /dev/null -w "unpublish-preview:%{http_code}\n"
   curl -s -X DELETE "https://admin.da.live/source/skumawat-adobe/ema-capstone/us/en/adventures/zzz-index-test.html"    -o /dev/null -w "delete-source:%{http_code}\n"
   ```

   Unpublishing also removes the row from the index automatically, confirming
   the index tracks publish state in both directions.
