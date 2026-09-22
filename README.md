# poe-art

Item art for Path of Exile 1 and 2, taken from each game patch and served from `https://art.pobredux.com`.

A scheduled workflow asks GGG's patch servers for the current version of each game. When a game has a new
patch, it exports the item tables and item art from the patch CDN with
[ggpk-explorer](https://github.com/juddisjudd/ggpk-explorer), uploads new images to the `poe-art` R2 bucket,
and commits the new map to `maps/`.

## Maps

`maps/poe1.json` and `maps/poe2.json` map English item names to image hashes:

```json
{
  "game": "poe2",
  "version": "4.5.5.3",
  "images": "https://art.pobredux.com/img/",
  "bases": { "Conqueror Plate": "…" },
  "uniques": { "Astramentis": "…" }
}
```

An image URL is `images + hash + ".webp"`. Look a unique up in `uniques` first and fall back to its base type
in `bases`. Runeforged and Runemastered bases are in `bases` with the art of their plain base. Gems are base
items, so they are in `bases` too.

The same map is published at `maps/<game>/<version>.json` and `maps/<game>/latest.json` on the art domain.
Images and versioned maps are cached for a year; `latest.json` for five minutes.

## Commands

```sh
bun install
bun run patch                 # print the current patch of each game
bun run stale                 # list games whose published map is older than the patch
bun run update                # export, map and upload every stale game
bun run update poe2 --force   # rebuild one game even if its patch has not changed
bun run update --dry-run      # export and map only; the map goes to work/
bun run update --reuse        # map an export already in work/ instead of downloading it again
bun run typecheck
```

`update` needs `ggpk-explorer` on `PATH`, or `GGPK_EXPLORER` set to it. On a machine without the ggpk-explorer
GUI's cached schema, set `DAT_SCHEMA` to a downloaded
[schema.min.json](https://github.com/poe-tool-dev/dat-schema/releases/latest/download/schema.min.json).

Uploads read `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` from `.env` locally and from the
repository secrets in CI. `R2_BUCKET` and `ART_BASE_URL` default to `poe-art` and `https://art.pobredux.com`.

## Licence

The scripts are MIT licensed. The game art is not; see [NOTICE.md](NOTICE.md).
