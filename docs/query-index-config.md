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

## Until the indexer is configured

The repo keeps working today via the committed `query-index.json`. To refresh it
after importing new detail pages:

```
node tools/importer/build-query-index.js
```

Once the tools.aem.live index above is live, that manual step is no longer
needed — delete the committed `query-index.json` (and optionally the generator)
so the indexer's version is the single source of truth.
