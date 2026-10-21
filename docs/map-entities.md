# Map entities

`MapEntity` represents a positioned point, with category-specific fields distinguished by `type`, and is defined in `src/types/MapEntity.ts`. Every entity has one `position`; there is no geometry discriminator or polygon entity type.

All entities have a stable UUID v4 string `id`, unique across the database. A non-empty string `title` is required for NPC, Enemy, Codex, and Item (except Prison Key and Arrows) entities; Place titles (except optional LostRoom titles) and Arrows titles are derived. Title points require their text title. Tablet titles are derived from `tabletType`; mirror teleporters display Mirror Teleporter, lost rooms display their trimmed optional title or Lost room, and altars use their altar subtype name. The drawer, tooltips, accessible marker labels, and menu search use this displayed title. Creation and editing forms trim surrounding whitespace and reject blank titles when the field is required. Prison Key titles are optional; absent or blank titles display Prison Key. Entities support optional `description: string` and `url: string` fields. Either may be omitted or contain an empty string. A non-empty URL must be an absolute URL accepted by the standard `URL` constructor without a base; relative paths are rejected. Validation does not fetch the URL or check whether its destination exists. Values are preserved unchanged through loading, editing, JSON export, and synchronization, except for hidden Tablet title and description fields and Altar titles, and all MirrorTeleporter metadata, which are omitted. Missing fields and explicit empty strings remain distinct in change tracking.

The repository database contains only positioned entities. To migrate an older export, retain entries whose `kind` was `point`, discard all other entries, and remove `kind` from the retained objects. Preserve their IDs, positions, metadata, and order. Schema version remains 2; the loader rejects removed `kind` and `points` fields rather than silently dropping legacy geometry.

## Tablet metadata and appearance

Altars are grouped by altarType into static subtype-title rows with visibility eyes and counts, without expandable member lists. Teleportation altars stay in the separate Teleporters category.

The Tablets menu list is grouped by tabletType into Faith, Damage, Crit, and Stamina. Each subtype has a visibility eye, count, and a collapsible member list that starts closed. Clicking the group title toggles its list without navigating the map. Member rows show only the derived entity title; clicking one locates that particular entity and opens its popup. Individual member eyes are omitted. Empty subtype groups remain present. Group visibility, parent mixed states, menu-only search, and creation/editing updates use the shared tree behavior.

Place tablets do not need stored title or description values. Loading and export discard legacy values for these fields, and the repository database has been updated without changing UUIDs or positions. Schema version remains 2. Altar titles are also derived, while their description and URL remain editable. Non-Place entities retain their required title and optional description, except Prison Keys, whose title is optional, and Arrows, whose title is derived.

| Tablet subtype | Displayed title | Frame border color |
| -------------- | --------------- | ------------------ |
| Damage         | Damage          | #df3434            |
| Faith          | Faith           | #ebebeb            |
| Crit           | Crit            | #d6e037            |
| Stamina        | Stamina         | #59df34            |

The explicit mapping lives in src/helpers/tabletAppearance.ts; colors use shared CSS variables. It applies to map markers in both modes. Other Place frames retain their white border.

The entityFieldVisibility helper centralizes title, description, and URL visibility based on entity fields. Extend it when adding future conditions, together with the corresponding TypeScript fields and validation. Forms apply visibility on initialization and every category or place-subtype change. Hidden URLs do not trigger wiki validation or block saving. Hidden values are cleared immediately and omitted on submission; returning to a visible field leaves it empty rather than restoring stale text. Canceling the dialog still leaves the working database unchanged.

## Mirror teleporter metadata

Mirror teleporters display the fixed title Mirror Teleporter in the drawer, tooltips, and menu search. Stored title, description, and URL are unnecessary; the loader and exporter omit legacy values. Their forms hide and clear these fields using the same visibility helper as tablets. Returning to another subtype leaves all three fields empty. IDs, positions, and schema version 2 remain unchanged.

## Lost room metadata

LostRoom places accept an optional string title, including an empty string. Loading and JSON export preserve this field when supplied. The drawer, hover tooltip, popup, accessible marker label, and menu search use the trimmed title or Lost room when missing or blank. Creation and editing forms show an optional Title and trim it on submission, omitting blank input. Description and URL are optional editable fields, preserved through loading and JSON export. Matching wiki URLs use the standard debounced page-existence validation. On first popup opening, LostRoom requests the wiki Description section only, caches the result, and falls back to local Description if the section is absent or the request fails. No image request or image placeholder is used. The URL appears below the content and opens in a new tab. Switching to a subtype with a hidden title clears the entered title. Lost rooms is now a collapsible subgroup with individual entity navigation and visibility controls. UUIDs, positions, and schema version remain unchanged; existing unnamed rooms need no migration.

## Altar titles

Altar forms hide and clear Title while keeping Description and URL editable. Faith cost is editable except for TeleportationAltar and FaithStatue, where it is hidden and cleared. Stored titles are optional and omitted on loading, saving, and export. The repository migration removes only Altar titles, retaining IDs, coordinates, subtype, description, URL, and cost. Schema version remains 2.

The explicit mapping in src/helpers/altarTitles.ts uses altar enum members and titles made from their keys with spaces. The drawer, tooltips, accessible marker labels, and menu search share these titles:

| MapPlaceAltarType key | Displayed title          |
| --------------------- | ------------------------ |
| RunicAltar            | Runic Altar              |
| BlessingAltar         | Blessing Altar           |
| HealingStatue         | Healing Statue           |
| DiseasePurgingStatue  | Disease Purging Statue   |
| TeleportationAltar    | Teleportation Altar      |
| FaithStatue           | Faith Statue             |
| AltarOfTheMagnanimous | Altar Of The Magnanimous |
| StrangeAltar          | Strange Altar            |
| AltarOfRedemption     | Altar Of Redemption      |
| ImpiousAltar          | Impious Altar            |

## Points

Point categories are defined in `MapEntityType`:

- `Npc = 'npc'`: characters the player can interact with.
- `Enemy = 'enemy'`: both ordinary enemies and bosses.
- `Item = 'item'`: collectible or usable items.
- `Place = 'place'`: a notable location represented by a point.
- `Codex = 'codex'`: a codex entry, optionally divided into parts.

Example serialized point:

```json
{
  "id": "11111111-0000-4000-8000-000000000000",
  "title": "Example point",
  "type": "npc",
  "position": { "x": 1000, "y": 1500 }
}
```

Non-Place points require a title, except Prison Key and Arrows items. Place points use derived titles except optional LostRoom titles. Creation and editing dialogs place Title immediately above Description (a five-row textarea), followed by URL, after the category-specific controls. Tablet and MirrorTeleporter forms hide Title, Description, and URL, including wiki validation controls. Hidden URL values are cleared and omitted when saving the form; switching back to another subtype shows an empty URL field. Existing Tablet database URLs remain supported until the Tablet is edited. MirrorTeleporter metadata is removed on loading and export. LostRoom forms show optional Title, Description, and URL.

The Traps menu list groups entities by trapType, using the shared trapTitles mapping. All trap subtype groups remain present without active search, including empty groups. Subtype rows show a title, visibility eye and count without expandable member lists. Each subtype eye controls all members, supports Shift-click isolation, and participates in inherited visibility and mixed parent states.

## Category-specific fields

Point entities form a discriminated union on `type`. `MapPointDetails` describes the category and its fields, while `MapPointEntity` combines these with the shared identity, coordinates, and metadata.

| Category | Field                                                                | Values                                                                                                                               |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `title`  | `size: MapTitleSize`, `color: string`                                | `huge`, `big`, `medium`, `small`; a six-digit hexadecimal color.                                                                     |
| `codex`  | `isSavedToLibrary?: boolean`, `part?: number`, `totalParts?: number` | Library status defaults to false; parts must form a valid pair.                                                                      |
| `npc`    | None                                                                 | No category-specific fields yet.                                                                                                     |
| `enemy`  | `isBoss: boolean`, `isElite?: boolean`                               | Both default to `false` when omitted from JSON and are exported explicitly; both cannot be true.                                     |
| `place`  | `placeType: MapPlaceType`                                            | `tablet`, `altar`, `mirror-teleporter`, `lost-room`, `blocker`, `trap`, `chest`, `switch`, `prison-cell`. |
| `item`   | `itemType: MapItemType`                                              | `weapon`, `left-hand`, `armor`, `rune`, `trinket`, `consumable`, `prison-key`, `arrows`.                                             |

Place and item subtypes are required. Older exports must add the appropriate `placeType` or `itemType` to each existing point of these categories; the loader does not guess a subtype. Schema version remains 2. Category-specific fields on points of another category are rejected. Parsing and export preserve these fields, and changes participate in unsaved-change tracking and Sync comparison.

The developer dialog shows Elite on the left and Boss on the right of one row for Enemy. Checking either flag disables the other; both default to false. It shows a Place type selector for Place, and an Item type selector for Item. Place and Item form defaults are `tablet` and `weapon` respectively. Editing initializes these controls from the existing point. Switching categories saves only the fields belonging to the selected category; UUID and coordinates remain intact. Title, Description, and URL are cleared when their visibility rule hides them.

String enum values use hyphens between words (kebab-case). LostRoom is serialized as `lost-room` and resolves to `place/lost-room.png`. Older exports containing `lost_room` must replace it with `lost-room` before loading or Sync. Schema version remains 2; enum member keys are unchanged. The current repository database contains no LostRoom entries requiring migration.

### Codex-specific fields

Codex keeps Title (required), Description, and URL. Its optional boolean isSavedToLibrary defaults to false when omitted and is exported explicitly. part and totalParts are optional positive safe integers: both must be present or both absent, and part must not exceed totalParts. The shared validator enforces this in both developer forms and JSON loading/export. Forms show compact Part and Total parts inputs followed by the Saved to library checkbox in one row (wrapping on narrow screens), display validation errors, and disable Add/Save for invalid pairs. Other point categories reject these fields.

Codex popups append a space and part/totalParts to the title when both values are present, for example Codex entry 2/10. The menu uses optional Group or falls back to title for multipart entries; grouped rows show title plus part/totalParts when present; stored titles remain unchanged.

Codex has its own collapsible menu group with count, search, and map visibility controls. Its icon resolves to point/codex/book-library.png only when isSavedToLibrary is true, otherwise point/codex/book.png. Missing files fall back to a dot using --color-entity-codex. Codex loads wiki text on first popup opening when its URL matches the configured wiki origin. A URL fragment selects the exact section anchor first; missing anchors or empty text retain the local description without further lookups. Without a fragment: with a part pair it finds the matching part/totalParts subsection under Codex Entry and requests its actual section index; otherwise it tries the whole Codex Entry section followed by Codex. Multipart entries do not fall back to other wiki sections if the template match is absent or ambiguous. Missing text or errors retain the local description. Results are cached by page, content mode, URL fragment, and part/totalParts pair. Wiki images are not requested for Codex.

### Place-specific fields

Place details form a second discriminated union, `MapPlaceDetails`, on `placeType`:

| Place type                                                                           | Fields                                    | Values                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tablet`                                                                             | Required `tabletType: MapPlaceTabletType` | `faith`, `damage`, `crit`, `stamina`.                                                                                                                                                                    |
| `altar`                                                                              | Required `altarType: MapPlaceAltarType`   | `runic-altar`, `blessing-altar`, `healing-statue`, `disease-purging-statue`, `teleportation-altar`, `faith-statue`, `altar-of-the-magnanimous`, `strange-altar`, `altar-of-redemption`, `impious-altar`. |
| `altar`                                                                              | Optional `faithCost: number`              | A finite, non-negative number. Zero and fractional values are accepted. Omitted for TeleportationAltar and FaithStatue.                                                                                  |
| `chest`                                                                              | Required `variant: MapChestVariant`       | Integer `1`, `2`, `3`, `4`, or `5`.                                                                                                                                                                      |
| `switch` | Required `switchType: MapPlaceSwitchType` | `lever`, `button`, `blood-donation`. |
| `prison-cell`, `mirror-teleporter`, `lost-room` | None | No additional place fields. |

The creation/editing form shows only the controls for the selected place type. New tablets default to Faith; new altars default to Runic altar, with an empty optional Faith cost. Editing prefills existing values, including zero cost. Clearing Faith cost removes the property instead of storing zero. Changing the place type or point category removes fields that no longer apply. Confirmed changes preserve the UUID and coordinates, clear hidden fields, and retain visible metadata.

The JSON loader requires explicit altar and tablet subtypes and rejects fields belonging to a different place type or point category. Older exports must add the appropriate `altarType` or `tabletType`; no migration defaults are guessed. Schema version remains 2. The repository Teleporter-to-Altar migration is described below. All place fields round-trip through JSON export and participate in unsaved-change tracking and Sync; omitted Faith cost differs from explicit zero.

For example, the place-specific part of an altar point is:

```json
{
  "type": "place",
  "placeType": "altar",
  "altarType": "healing-statue",
  "faithCost": 25
}
```

## Point icons

Point icons are derived from entity parameters; the database has no `iconId` field and the dialog has no icon picker.

| Category | Public image path                                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `enemy`  | `images/entities/point/enemy/boss.png` for bosses; otherwise `<normalized-title>.png` in the same directory, with `enemy.png` as the fallback. |
| `place`  | `images/entities/point/place/<placeType>.png`.                                                                                                 |
| `item`   | `images/entities/point/item/<itemType>.png`.                                                                                                   |
| `codex`  | `images/entities/point/codex/book-library.png` when `isSavedToLibrary` is true; otherwise `images/entities/point/codex/book.png`.              |
| `title`  | Text in the selected size and color; no image.                                                                                                 |
| `npc`    | The category-colored dot; no icon mapping is defined yet.                                                                                      |

Place icons use `placeType`, including `lost-room.png`, except Chests, Blockers, Traps and Switches. Chests use `images/entities/point/place/chest/chest-<variant>.png`; Blockers, Traps and Switches use `images/entities/point/place/blocker/<blockerType>.png`, `images/entities/point/place/trap/<trapType>.png` and `images/entities/point/place/switch/<switchType>.png` respectively. TeleportationAltar uses `images/entities/point/place/altar/teleportation-altar.png`; other altars still use `altar.png`. Tablet subtypes and Faith cost do not change the icon path.

Place and Item filenames must exactly match enum values, using hyphens between words. Regular Enemy titles are trimmed, lowercased, and have whitespace runs replaced by hyphens (for example, Fallen Knight becomes `fallen-knight.png`). The indexed title icon is preferred; when absent, the resolver uses `enemy.png`. Enemy subgroup icons have no title and also use `enemy.png`. NPC icons resolve from public/images/entities/point/npc/<normalized-title>.png: lowercase the title and replace each non-letter/non-number character with a hyphen, without collapsing replacements. Unicode letters and numbers are preserved. For example, Kraumdeith resolves to npc/kraumdeith.png. Missing titles, absent icons and failed image loads retain the NPC dot fallback. Adding files requires restarting the dev server to refresh the Vite index. Elite status does not change icon selection. Enemy icons with isElite set to true have a permanent white drop-shadow glow (3px blur, 65% opacity), including fallback dots; other entities remain unchanged. If the resolved file is absent, the category-colored dot is shown. Image load failures also fall back to the dot. Changing category, subtype, Enemy title, or boss status automatically updates the image and resets any previous load failure for the new URL. Both developer and read-only modes use the same resolver and respect the application base URL without persistent selection highlighting.

Vite indexes available PNG paths below `public/images/entities/point` with a keys-only glob; image files are not imported. Restart the development server after adding or renaming files to refresh the index, and rebuild to publish changes. Existing exports with `iconId` remain loadable: validation ignores the obsolete field, export removes it, and it does not affect Sync comparison. Schema version remains 2.

Map point images and their interaction areas resize on zoom: levels 0–1 use 16px, 2–4 use 24px, 5–7 use 32px. Sizes are shared CSS variables scoped to the Leaflet container in both modes. Marker centers and developer hover bridges follow the resized area; coordinates do not change. Place, Enemy boss, and Codex markers use a circular HTML container with a black background and a 2px border in both modes. Boss borders use the Enemy fallback color (--color-entity-enemy, #f28b82); non-Tablet Place and Codex borders are white. The container follows the same zoom sizes (16/24/32px), including the border. Images stay centered without padding and preserve their aspect ratio. They shrink to fit the available icon space at smaller zoom levels but never grow beyond their intrinsic pixel dimensions. The container and interaction area still follow the zoom size. Missing or failed framed images retain the fallback dot inside the same frame. Place tooltip offsets and developer toolbars follow the container size. Regular enemies, other marker types, and drawer icons retain their existing appearance and sizes. Fallback dots keep their fixed normal size at every zoom level.

Map tiles remain separate in `public/images/map/tiles/{z}/{x}/{y}.png`. Game images remain subject to their owners' rights, as described in the README.

## Coordinates

Store positions in pixels of the original 7400 × 11600 image, independently of the current zoom and viewport size.
The origin `(0, 0)` is the top-left corner; `x` increases to the right and `y` increases downward.

Convert positions to Leaflet coordinates at the rendering boundary using the image's native tile zoom (currently 7).
For the current `CRS.Simple` configuration, the Leaflet coordinate pair is `[-y / 128, x / 128]`.
Do not store geographic latitude/longitude or screen coordinates in entity data.

The model uses plain, JSON-compatible values and readonly types. Editing should replace values rather than mutate existing entities.

## Database and export

The repository database is `src/data/entities.json`, imported when the application is built:

```json
{
  "schemaVersion": 2,
  "entities": []
}
```

`schemaVersion` describes the data format and is independent of the application's package version.
Schema version 2 replaces numeric IDs with UUID v4 strings. Version 1 files are rejected; converting an older export requires assigning a UUID v4 to each entity and changing its schema version to 2. IDs are generated only when entities are created and remain unchanged during editing and export. Loading accepts either letter case and normalizes UUIDs to lowercase before checking uniqueness. Generation requires a secure browser context, such as HTTPS or localhost. UUIDs allow independent creation without a shared counter, but merging concurrent JSON edits still requires review.

Enum keys remain `Npc`, `Enemy`, and `Item`, with `Place` added. Serialized type values are now `npc`, `enemy`, `item`, and `place`. For older exports, replace `Npc`, `Enemy`, and `Item` type values with their lowercase equivalents before loading or synchronizing; other entity fields and schema version 2 remain unchanged.

The map displays the entities supplied in the repository database.

The map loads a validated copy into React state. Map filtering derives a visible subset from that state; exporting always uses the complete working database.

Run `npm run dev`, click **Export JSON** in the Developer tools window to download the current database as `entities.json`.
Production builds (`npm run build`), including those served with `npm run preview`, are read-only and exclude export and Sync controls.
Future entity editing controls must use the same `isDeveloperMode` flag from `src/common/environment.ts` and remain unavailable in production builds.
The export contains the supported schema fields with two-space indentation and a trailing newline, preserving entity IDs, coordinates, and array order.

To update the repository database, replace `src/data/entities.json` with the downloaded file, click **Sync** to verify the contents, review the diff, and commit the change. Rebuild the application to publish the updated database.
The browser download does not write directly to the repository.

Developer mode supports point creation: right-click inside the map image and choose **Add Entity → Add point…**. The native dialog offers NPC, Enemy, Item, and Place types with a compact, read-only coordinate summary; clicked coordinates are rounded to the nearest original-image pixel. Confirming **Add** validates the database, generates a UUID v4 using `crypto.randomUUID()`, and adds the point in memory. The newly created entity is made visible and located even when its category is hidden or another branch is isolated; only its UUID gets a visibility exception, preserving hidden siblings. Canceling, closing the dialog, or pressing `Escape` discards the form without adding an entity.

New points appear in the entity menu and on the map and are included in the next JSON export. Confirming a reload discards working changes and loads the repository database. Importing files through the UI and browser draft storage are not implemented yet.

## Point editing

In developer mode, points use Leaflet HTML markers with a compact icon toolbar: four-direction arrows for **Move**, a pencil for **Edit**, and a trash can in the warning theme color for **Delete**. Buttons retain these action names in their `title` and accessible labels. Production mode displays read-only image markers or category-colored dots. No additional UI or editing dependency is required.

Hovering the point shows a Leaflet tooltip, matching the read-only map; editable markers do not use native browser title tooltips. Move mode unbinds the point tooltip so it cannot cover the map or reopen during dragging. Leaving Move restores normal tooltip behavior.

Hovering the point or focusing its button reveals the toolbar. A transparent, interactive bridge joins the point to the toolbar; leaving the shared hover area hides it unless keyboard focus remains inside or Move is active. The toolbar always opens below the point and aligns inward horizontally, leaving the space above it for the tooltip. Its controls stop mouse, touch, context-menu, double-click, and wheel events from interacting with the map.

**Move** toggles marker dragging. Dragging previews the position without updating the database until release; coordinates are rounded to original-image pixels and constrained to the image bounds. Press **Move** again or **Escape** to exit. Opening another point action menu also exits Move. Exiting during an unfinished drag restores the last committed position without updating the database; completed drags remain in the working database.

**Edit** opens the same native form used for creation, prefilled with the current category and category-specific fields. Coordinates appear as a compact, read-only reference in original-image pixels; change the position with **Move** on the map. **Save** validates and replaces the point while preserving its UUID; Cancel, the close button, and Escape discard the form. Focus returns to the point after closing the dialog.

**Delete** requires confirmation in a native dialog. Confirmation removes the point; cancellation leaves it unchanged. After deletion, focus returns to the map.

All confirmed edits affect only the working database and participate in the global unsaved-changes comparison. Export includes the updated positions, types, and deletions without marking them as synchronized.

## Unsaved changes

`useEntityDatabase` owns the validated baseline snapshot and the working database. The baseline starts with the initial repository data and is updated only after a successful Sync. The map and developer tools window share one derived `hasUnsavedChanges` flag; entities do not have individual dirty flags.

The developer tools window displays **Unsaved changes** or **No unsaved changes**. Exporting the working database leaves the snapshot and flag unchanged, including when the download fails. Rerendering with a changed initial input does not replace the snapshot or working state.

## Repository synchronization

The persistence workflow is: edit in memory → **Export JSON** → manually replace `src/data/entities.json` → **Sync**. Sync stays visible beside Export JSON and is disabled when there are no changes or a request is in progress. During a request it shows **Syncing…**. Editing and export remain available while it runs.

In developer mode, `scripts/entityDatabasePlugin.ts` exposes a GET-only `__dev/entities` endpoint under the configured Vite base URL. Each request reads the fixed repository file from disk, returns its JSON contents, and uses `Cache-Control: no-store`. The browser also uses `cache: 'no-store'`. The endpoint accepts no file path, provides no write operation, and is absent from production builds and the preview server.

The client validates the response and compares it with the latest working state when the request completes, including edits queued during the request. A match replaces only the baseline snapshot and clears the unsaved-changes flag. A mismatch, HTTP or network failure, invalid JSON, or invalid entity data leaves the working database and baseline untouched and displays an explanation. Sync never imports, overwrites, or merges data. Only one request can run at a time; unmounting aborts it.

The Vite plugin suppresses hot updates caused specifically by repository JSON replacement, including invalid intermediate contents, so they cannot reload the editor or update its baseline. The TypeScript checker may still report JSON syntax errors; correcting the file clears those diagnostics. Other source files retain normal HMR behavior. Confirming a browser reload still starts from the repository database and discards the working state.

### Unload warning

In developer mode, a `beforeunload` listener requests the native browser confirmation when closing, reloading, or navigating away from the page while the working database differs from its snapshot. The listener is removed when successful Sync updates the snapshot, edits restore its contents, or the map unmounts. Exporting JSON, a mismatched Sync, or a failed Sync keeps the warning active. Read-only mode does not register the listener.

The warning does not save data. The browser controls the confirmation text and normally requires prior user interaction. It may skip the event, especially when a mobile browser is terminated; it cannot guarantee recovery of in-memory edits. Export JSON to retain changes. These limitations are documented in [MDN: beforeunload](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).

### Point form layout

The point dialog uses a 640px preferred width, limited by the viewport. Category and subtype dropdowns share a three-column row; remaining fields span the full width. Enemy Elite and Boss controls share the Type row and align to the left. Codex Part, Total parts, and Saved to library controls also share the Type row and align to the left, wrapping only if space is insufficient. Title points place Type, Font size, and Color in that row; the color input uses a pointer cursor. Numeric Faith cost fields remain separate from subtype selectors. The custom chest variant control uses the same control height as native selects.

The header keeps Add point or Edit point on the left and the warning-colored Changes stay in memory until exported. notice on the right, before the close button. The footer displays read-only Position coordinates alongside Cancel and Add/Save; on narrow screens it can wrap instead of overflowing. The notice can wrap within a narrow viewport. Form values, validation, and submission behavior are unchanged.

### Edit entity metadata

Developer action menus share one active entity ID within the map. Opening a point menu by pointer hover or keyboard focus suppresses the previous entity's menu and stops its Move mode. Unfinished drags revert to the last committed coordinates; completed drags remain saved. Reopening the menu does not restart Move. Hovering or focusing another entity activates its menu again.

When `VITE_WIKI_API_URL` is configured, forms derive a read-only **Wiki Page** checkbox beside the URL label. It is checked when the entered URL origin starts with the configured API origin. This computed `hasWikiPage` value is never stored in the entity JSON. Matching URLs must include `/wiki/` and a non-empty page name. Forms check page existence through the configured API after 500ms without URL changes; changing the URL or closing the form aborts the request and ignores obsolete responses. Add/Save are disabled during debounce and requests, for missing pages or unusable page paths, and after network/API errors. Validation status text sits in the URL header beside the Wiki Page checkbox. Missing pages use the warning color; request errors and unusable wiki page paths use the error color. Request failures have a Retry action. Unrelated URLs only require the existing absolute-URL validation. Without the endpoint, wiki recognition and remote checks are disabled and URLs remain usable as local links.

Point creation/editing dialogs include a required **Title** field, a five-row **Description** textarea and an optional **URL** field. Editing prefills existing values. A non-empty URL must pass the same absolute-URL validation used by the JSON loader; invalid input has a red border, an accessible error, and disables **Add** or **Save**. Empty URLs are allowed. Confirmed changes are stored in memory and included in export, change tracking, and Sync; cancellation discards them. Clearing an existing value stores an empty string. Untouched absent fields remain omitted to avoid introducing changes when saving an otherwise unchanged entity.

### Entity menu rows

The regular Enemy subgroup is labeled Regular. Drawer content uses the shared small horizontal padding to give the menu more space.

Root groups are ordered Titles, NPCs, Codex, Items, Enemies, Places. Non-empty Enemies and Places start expanded; other roots and expandable subgroups start collapsed. Codex has an optional string group field, preserved on JSON loading/export and rejected for other categories. The form shows Group beside Title, taking one third of the row; form input is trimmed and blank groups are omitted. A non-empty trimmed Group overrides title as the grouping key and label, including for entries without parts. Without Group, multipart entries retain title-based grouping. Group members show title plus part/totalParts when present, sorted numerically by part; entries without parts sort before numbered entries and preserve database order among themselves. Ungrouped entries without parts remain individual title actions. NPCs, Codex, Titles, Bosses and Regular title groups sort by title in ascending case-insensitive natural order. Stored titles, database order and UUID navigation remain unchanged.

The drawer uses shared grid rows to align its edge handle exactly with the header, including changes to title wrapping or version text. The handle remains accessible while the drawer is collapsed.

The drawer displays each entity as a keyboard-accessible text action without background, border, or a separate edit button. UUIDs are omitted. NPCs and Codex have no heading icons. Point icons appear only in subgroup headings, with missing-image fallbacks matching the map. Every click on an entity title locates it again and opens its popup, including after manual navigation or closing the popup. Only the chosen entity is revealed if hidden; hidden siblings remain hidden. Developer editing remains available from map action toolbars.

### Tooltip placement

Point details open in a Leaflet Popup on click; point hover tooltips show only the computed title (including Codex part numbers) without wiki requests or pointer interaction. The title tooltip is hidden for the point with an open popup. Hovering a point icon frame adds a 50%-opacity accent-colored outline. An open point popup uses the fully opaque accent outline, including during hover and after pointer exit. Unframed icons have no popup highlight; disabling Icon BG hides the outline along with the frame, while normal keyboard focus remains visible. The outline does not change the frame border color or icon dimensions and disappears once the pointer leaves and the popup is closed. The popup stays open on pointer exit, map movement, and zoom. Clicking the same point again, another point, the map background, its close button, or pressing Escape closes it. Move, Edit, Delete, and point placement also close point popups. While a point popup is open, only its own developer toolbar may appear; other point toolbars are suppressed until it closes. Icon buttons support keyboard activation. Fallback circle markers use the same click-toggle behavior. Popup content and wiki caches remain separate from hover titles; reopening reuses pending or completed wiki results.

Detailed point popups use the shared dark surface, border, and text colors. A body-sized accent-colored title appears first; a smaller non-empty description follows after a paragraph-sized gap, preserving line breaks. Missing, empty, or whitespace-only descriptions add no block or gap. Long text wraps within the visible map and viewport boundaries. Open tooltips are measured and repositioned on map movement, zoom, resize, and content size changes. They prefer the space above the anchor, fall back to either side near the top edge, and clamp to the visible area; shifted tooltips omit the directional arrow. Oversized content scrolls in an inner content wrapper limited to the available height minus the tooltip padding and borders. The outer tooltip does not scroll, so its directional arrow cannot trigger a scrollbar. When a URL is present, a link follows the title and optional description after a paragraph-sized gap. It displays only the URL hostname (without the scheme, port, or path), alongside an external-link arrow; its title attribute contains the full destination. URLs without a hostname display **External Link**. Links open with `target="_blank"` and `rel="noopener noreferrer"`, and long hostnames wrap within the tooltip. All entity tooltips are unbound during point Move mode and while placing points. Other entity action menus cannot open during these operations. The moving point retains its own controls to stop Move; hovering another entity does not cancel movement. Browsing is restored when the operation ends.

Entity tooltips initially open upward. Point image tooltips, including Place frames, use half the current zoom-dependent icon size plus the shared CSS gap; circle markers use their fixed normal radius. The offset updates through CSS even while a tooltip is open.

## Map visibility filters

Map panning permits extra travel to the right by the drawer width, so content at the image's left edge can be revealed beside the menu. The allowance follows `--drawer-width`, capped at the viewport width minus `--control-size` on narrow screens, and is recalculated on zoom and resize. It is available with the drawer open or closed without automatically moving the map when the menu opens. Initial image centering and the other edge constraints remain intact; images smaller than the viewport retain their original centered position as one end of the horizontal range. Entity tooltips suppress native context menus and prevent right-click events from reaching the map, including its developer creation menu.

The menu is rendered by the independent [tree component](tree.md), using recursive category configuration and entity leaves. Main groups, expandable categories, and individual entity rows have visibility controls. Open, crossed, and mixed eyes represent all-visible, all-hidden, and partially visible subtrees. Mixed eyes use a horizontal mark and warning color. A visible parent hides its entire subtree; a hidden or mixed parent enables it. These actions do not change disclosure state or counts.

useEntityTreeVisibility owns inherited rules keyed by category IDs and UUIDs and derives the complete hidden leaf set. New entities inherit their category preference. Explicit per-entity exceptions follow the UUID through metadata edits; deleted entities no longer contribute to parent states. Empty categories keep active eyes, allowing a preference to be set before their entities exist. Toggling a parent replaces its current descendant exceptions atomically. The visible subset is computed with the shared filterMapEntities helper; useMapEntityFilters remains available for other predicate-based filtering.

Visibility affects map layers only, in both modes. Drawer lists and counts cover the complete working database unless menu title search is active. Search-hidden rows remain in the logical tree for visibility calculations. Browsing a hidden entity reveals only that UUID, preserving hidden siblings, and then opens its popup using the normal map navigation. All categories and entities start visible; settings last until route unmount or reload and are never exported or counted as database edits.

## Menu title search

Subgroup titles and their normal counts use the darker `--color-text-subtle` theme color (`#7c766b`) to distinguish them from main-group headings. Crossed visibility icons use the same color with `--tree-hidden-opacity` (0.75); focus outlines and button backgrounds retain full opacity. Counts changed by title filtering retain their yellow highlight.

Counts inherit their row's font size: main groups (NPCs, Enemies, Places, Items, and Codex) use the larger title size, while subgroups keep the normal body size. All counts align in the same right-hand column with a shared 34px tree count width, approximating three digits at the 18px main-group font size. The width uses pixels rather than font-relative units so the eye-to-count spacing stays consistent between groups and subgroups. Static rows reserve the same gap and arrow space as expandable rows, including empty disclosures with hidden arrows. Summaries have no right or vertical padding, no control-based minimum height, and no hover background. Subgroup summaries retain left indentation; Tree indentation follows nesting depth. The shared control size remains 44px for other controls.

The search field has a placeholder and an accessible name without a visible label. Above the entity groups, it filters only drawer entries by a case-insensitive substring of the displayed title, including derived Tablet, MirrorTeleporter, and LostRoom titles. Surrounding whitespace is ignored. Queries with at least three characters apply after a 300ms debounce; further input restarts the timer. Shortening or clearing the query below three characters removes the text filter immediately and cancels pending searches. While a longer query is being debounced, the previous search result stays visible.

Group and subgroup counts reflect matching menu entries. A count uses the yellow `--color-filtered-count` theme color when it differs from that group's count in the complete current database, including zero matches; unchanged counts keep their normal color. Clearing the search restores normal count colors. All group nodes remain configured; empty disclosures are disabled. Root rows align with each other. Search is local to `EntityMenu` and never changes map layers, category eye states, the working database, unsaved-change tracking, or exported data. Eye buttons still hide/show the entire category, including entities excluded by the text search. Closing the drawer preserves the query; unmounting the menu or reloading the page resets it.

## Developer tool window

Developer controls live in a non-modal **Developer tools** window outside the drawer, shown only in developer mode. It contains the unsaved-change status, Icon BG, Export JSON, Sync, and operation feedback. A separate bottom status bar with a top border shows the working database entity count, including singular and empty states. The count is no longer displayed in the drawer and is hidden with the contents when the window is collapsed. It uses a fixed position and a layer above the drawer and map context menus; native modal dialogs retain their browser top-layer behavior.

Drag the header with the primary pointer button. Pointer capture keeps dragging active outside the header; releasing or canceling the pointer ends the drag. The collapse button toggles content visibility without unmounting it or resetting state. Only the header is constrained to the viewport on movement and window resize; content changes do not reposition the window and the body may extend below the viewport. The window starts collapsed to its header near the top-right corner. While collapsed, its expand button label and border use the warning color whenever the working database has unsaved changes; expanding the window or clearing unsaved changes restores the normal label and border colors. Its position and collapsed state are component state and reset on page reload; no localStorage or global hotkey is used.

## Developer icon backgrounds

The dev window status bar also shows cursor coordinates at its right edge as `X: <number> Y: <number>`, rounded to original-image pixels. They appear only over the map image and are cleared on pointer exit, window blur, or when hovering map controls, popups, and tooltips. A stationary pointer is recalculated when the map moves, zooms, or resizes. MapCursorCoordinates updates a portal in the status bar without rerendering the whole route on pointer movement. Cursor tracking is mounted only in developer mode and is never stored in entity data.

The Icon BG checkbox shares the developer tools status row with the unsaved-change status. Unsaved changes use the yellow warning color. Synchronization mismatches and errors appear in red below the action buttons. The checkbox starts checked and is available only in developer mode. Unchecking it hides the black backgrounds and borders of all framed map icons, including Places, Enemy bosses, and Codex entries. Image sizes, marker centers, hover targets, tooltips, and action toolbars remain unchanged. Regular unframed points and drawer icons are unaffected. This presentation preference lasts until the route unmounts or reloads, does not change the database, and is not exported. Production mode always displays the frames.

Escape subscriptions in the drawer and map editing modes use React Effect Events to read current callbacks without reinstalling listeners or resetting focus when callback props change. Content fitting refreshes after React renders. Mode and map changes retain their effect dependencies and subscription cleanup.

Developer point toolbars read their viewport side through `useSyncExternalStore`, subscribing to Leaflet `moveend`, `zoomend`, and `resize`. The boolean snapshot determines inward alignment and also updates when entity coordinates change, without a synthetic render counter.

Shared control styles live in `src/styles/_controls.scss` and are loaded with namespaced `@use`. The `focus-ring` mixin accepts an optional offset (`null` preserves the existing offset); `control-surface` shares control typography, colors, borders, and radius without imposing layout or interaction states. Theme and runtime dimensions remain CSS custom properties. Leaflet popup highlighting keeps its dedicated inline-style override. Drawer and tooltip transitions respect `prefers-reduced-motion`.

Browser autocomplete is disabled for entity form fields and menu search. In developer creation and edit forms, NPC and regular Enemy titles offer a case-insensitive substring autocomplete from the complete current working database, including hidden map groups. Suggestions match the current category; bosses and other categories are excluded; duplicate titles use the first matching database entry. Selecting an Enemy suggestion copies Title, Description, and URL (absent metadata clears the fields). Selecting an NPC suggestion copies only Title and URL, preserving the current Description; an absent URL clears the URL field. Selection applies without changing position or identity. Suggestions support pointer selection, Arrow keys, Enter, Escape, and dismissal on blur. Escape closes an open suggestion list before closing the dialog. Wiki URL validation still runs after selecting a suggestion. Titles remain freely editable after selecting a suggestion.

The drawer surface uses 90% opacity (95% for hovered controls). Teleporters, Mirror teleporters, Chests, Levers, Buttons, Prison cells, Blood donations, Prison keys, and Arrows appear as static subgroup rows with their icon, visibility control, and count; they have no entity list or disclosure interaction. The hidden disclosure-arrow placeholder preserves count alignment. Their counts still respect menu text filtering and their eye controls toggle map visibility.

Drawer entity lists use a shared lightly tinted background with rounded corners. Each text action uses the subgroup horizontal inset (`--padding-compact`) and small vertical padding. Titles use muted text and brighten on hover without underlining; keyboard focus keeps its visible focus ring. Individual entries have no background or border.

## Blocker places

Blockers use `placeType: 'blocker'` and a required `blockerType: MapPlaceBlockerType`:

| Enum key    | Value / image filename          | Display title |
| ----------- | ------------------------------- | ------------- |
| CrackedWall | cracked-wall / cracked-wall.png | Cracked Wall  |
| FaithLock   | faith-lock / faith-lock.png     | Faith Lock    |
| Door        | door / door.png                 | Door          |
| TreeTrunk   | tree-trunk / tree-trunk.png     | Tree Trunk    |

Faith Lock additionally requires `faithCost: number`, finite and non-negative (zero is valid). Other Blocker subtypes reject faithCost; Altar retains its existing optional cost. Blocker fields on other point categories or Place subtypes are rejected. Schema version remains 2.

Creation and editing forms offer Blocker in Place type, then Blocker type (default Cracked Wall). Faith cost appears and is required only for Faith Lock; switching subtypes removes it from submitted data. Titles are derived from the explicit subtype mapping, while Description and URL remain editable, as with Altars.

The drawer has a counted, collapsible Blockers subgroup with text search and map visibility controls. Its members are grouped by blockerType into static title, eye and count rows, without expandable entity lists. All blocker subtypes remain present without active search, including empty groups. Group visibility and Shift-click isolation affect all logical members. Blocker images are indexed from `public/images/entities/point/place/blocker/`; unavailable files and failed image loads show the standard dot in the distinct `--color-entity-blocker` color (#ef9d55), including the subgroup icon. The Blockers heading uses the Cracked Wall icon (`blocker/cracked-wall.png`) when available. Blockers retain the existing Place frame and zoom sizing. Add PNG files named after subtype enum values and restart the dev server to refresh the asset index.

## Trap places

Traps use `placeType: 'trap'` and a required `trapType: MapPlaceTrapType`. Titles are derived from the explicit subtype mapping; Description and URL remain editable. Schema version remains 2.

| Enum key       | Value / PNG basename | Display title   |
| -------------- | -------------------- | --------------- |
| Spear          | spear                | Spear           |
| Axe            | axe                  | Axe             |
| SpinningBlade  | spinning-blade       | Spinning Blade  |
| Spikes         | spikes               | Spikes          |
| OilSlick       | oil-slick            | Oil Slick       |
| Stalagtight    | stalagtight          | Stalagtight     |
| ExplodingPlant | exploding-plant      | Exploding Plant |
| PoisonPlant    | poison-plant         | Poison Plant    |
| LightningOrb   | lightning-orb        | Lightning Orb   |
| BloodExplosion | blood-explosion      | Blood Explosion |
| BlessingThief  | blessing-thief       | Blessing Thief  |
| DeathPit       | death-pit            | Death Pit       |
| SlumpingFloor  | slumping-floor       | Slumping Floor  |

Keep the spelling Stalagtight: it is the in-game name, not a typo.

Forms show Trap type when Trap is selected and default to Spear. Switching from another Place subtype omits its fields, including Blocker type and Faith cost, from saved Trap data. Trap type is rejected on other point categories or Place subtypes; traps do not accept Faith cost.

The drawer includes a counted, collapsible Traps subgroup with search and visibility controls. Icons are indexed from `public/images/entities/point/place/trap/<trapType>.png`; unavailable or failed images use the standard dot in `--color-entity-trap` (#d978c9), distinct from Blockers and other entities. The Traps heading uses the Spear icon (`trap/spear.png`) when available and the same Trap fallback color otherwise. Slumping Floor uses `trap/slumping-floor.png`, has a derived title Slumping Floor, and hides Title in its form like other traps. Traps retain the existing Place frame, zoom sizing, and popup behavior.

## Chest and Lever places

Chests use `placeType: 'chest'` with a required numeric `variant: 1 | 2 | 3 | 4 | 5`. Missing, fractional, out-of-range, and non-numeric variants are rejected; `variant` is rejected on other Place subtypes and point categories. Schema version remains 2.

The editor defaults new chests to variant 1. Its keyboard-accessible Variant dropdown shows the indexed icon for each option, or its number when the icon is unavailable or fails to load. Changing Place type omits the chest variant from saved data.

Chest icons use `public/images/entities/point/place/chest/chest-<variant>.png`. The Chests heading uses variant 1 (`chest/chest-1.png`) when available, with the same Chest fallback otherwise. Missing or failed icons use the standard dot in `--color-entity-chest` (#d6b879), independent of variant.

Levers use `placeType: 'switch'` and required `switchType: 'lever'`. Their icon is `public/images/entities/point/place/switch/lever.png`; missing or failed images use the standard dot in `--color-entity-lever` (#65c5c5).

Titles are derived as Chest and Lever; Description and URL remain editable. Both types retain Place frames, zoom sizing, and popup behavior, and have a counted, collapsible Chests subgroup and a static Levers row inside Switches with search and visibility controls.

## Button places

Buttons use `placeType: 'switch'` and required `switchType: 'button'`. Their title is derived as Button; Description and URL remain editable. The editor offers Button in Switch type, and the drawer includes a counted, static Buttons row inside Switches with search and visibility controls.

The icon is `public/images/entities/point/place/switch/button.png`. Missing or failed images use the standard dot in `--color-entity-button` (#789ce0), including the subgroup icon. Buttons retain Place frames, zoom sizing, popup behavior, JSON export, and synchronization. Schema version remains 2.

## Prison places

Prison cells use `placeType: 'prison-cell'` without extra fields. Their title is derived as Prison Cell; Description and URL remain editable. The Place type selector offers Prison cell, and Places has a counted, collapsible Prison cells subgroup.

Prison keys use `type: 'item'` and `itemType: 'prison-key'`. They support an optional editable Title, Description, and URL. Absent, empty, or whitespace-only titles display Prison Key in the drawer, popups, accessible marker labels, and search. Other Item subtypes still require a non-empty title, except Arrows, whose title is derived. The Item type selector offers Prison key, and Items has a counted, collapsible Prison keys subgroup. Both subgroups support search and visibility controls.

| Subtype       | Icon path under `public/`                     | Fallback color                         |
| ------------- | --------------------------------------------- | -------------------------------------- |
| `prison-cell` | `images/entities/point/place/prison-cell.png` | `--color-entity-prison-cell` (#a0a8b5) |
| `prison-key`  | `images/entities/point/item/prison-key.png`   | `--color-entity-prison-key` (#c795df)  |

Missing or failed images use the standard dot in the respective fallback color, including subgroup icons. Prison cells retain Place frames; prison keys use normal Item markers. Both retain zoom sizing, popup behavior, JSON export, and synchronization. Schema version remains 2.

Existing repository Prison Key places were converted to items, preserving UUIDs, positions, and metadata and removing stored titles in a subsequent cleanup. Old `placeType: 'prison-key'` exports are rejected; update them before importing.

Prison Key titles may be omitted or stored as strings, including empty strings. Loading and export preserve explicit string values; forms trim titles and omit empty optional titles on saving. Changing Item type updates the required state immediately. All repository Prison Key titles were removed without changing IDs, positions, description, or URL.

## Arrows items

Arrows use `type: 'item'` and `itemType: 'arrows'`. They display the derived title Arrows. The form hides and clears Title when this subtype is selected; the loader and exporter omit any legacy title. Description and URL remain optional and editable.

The icon is `public/images/entities/point/item/arrows.png`. Missing or failed images show the standard dot in `--color-entity-arrows` (#d0aa76) in both map modes and the drawer subgroup. Items includes a counted, collapsible Arrows subgroup with search and visibility controls.

## Title points

A Title is a point (`type: 'title'`) with a required non-empty `title`, required `size: MapTitleSize`, required `color: string`, and optional Description and URL. Its position follows the same original-image coordinate system as other points. Schema version remains 2.

| Size     | Initial CSS font size |
| -------- | --------------------- |
| `huge`   | 32px                  |
| `big`    | 24px                  |
| `medium` | 18px                  |
| `small`  | 14px                  |

Creation defaults to Medium and `DefaultMapTitleColor` (#c5bfb2), initially matching the drawer group heading color. Title color has its own `--color-map-title` variable and each entity stores its chosen value, independently of drawer theme variables. The native browser color picker uses `<input type="color">`; JSON colors must use six-digit `#RRGGBB` notation. Defaults are supplied by the editor; the database validator requires both fields explicitly.

The map renders centered text with the chosen size and color, without an icon frame. Font sizes remain constant in screen pixels across zoom levels. Text uses normal React rendering; HTML is not interpreted. Developer mode retains the point Move, Edit, and Delete actions. Titles has a counted, collapsible group with visibility, search, and locate/open-popup behavior.

The popup loads wiki Description and the primary image on first opening when its URL identifies a configured wiki page. Results are cached using the existing wiki mechanism; loading is disabled when `VITE_WIKI_API_URL` is absent. Missing descriptions, failed requests, unrelated URLs, and disabled wiki loading fall back to the local Description. The URL remains visible at the bottom whenever present, including during loading and after errors, and opens in a new tab.

Point popup highlights follow the source marker popupopen/popupclose lifecycle, including conditional popup removal during Move or overlay suppression. Leaving Move does not restore a highlight unless a popup is opened again; closing one point cannot leave persistent highlights on other points.

## Teleportation altars and mirror teleporters

Repository points formerly stored as `placeType: 'teleporter'` were converted to `placeType: 'altar'` with `altarType: 'teleportation-altar'`, preserving UUIDs, coordinates, and metadata. No old Teleporter values remain. Schema version stays 2; old exports require the same conversion before loading.

The former `MapPlaceType.Teleporter` enum member is now `MapPlaceType.MirrorTeleporter = 'mirror-teleporter'`. New mirror teleporters are a separate category; the migrated entities are teleportation altars, not mirrors. Mirror teleporters retain hidden Title, Description, and URL fields and display Mirror Teleporter. Their image is `public/images/entities/point/place/mirror-teleporter.png`, with the normal Place fallback when absent or failing to load.

The old `place/teleporter.png` asset moved to `public/images/entities/point/place/altar/teleportation-altar.png`. Teleportation Altar markers and the Teleporters drawer heading use that image with the existing Place fallback. Other Altar icons still use `place/altar.png`.

Altars groups members by altarType into static rows with a subtype title, visibility eye and count, without expandable member lists. It excludes TeleportationAltar. The static Teleporters row counts only TeleportationAltar and has its own visibility control. Mirror teleporters has a separate static row; Lost rooms has a separate collapsible list with optional custom titles. These groups are disjoint, so hiding Altars does not hide Teleporters or mirrors, and each point contributes to only one subgroup count.

TeleportationAltar and FaithStatue do not use Faith cost. Their editor hides the field and clears its value when switching to either subtype; returning to another altar leaves it empty. Loading/export omit legacy numeric costs for these subtypes, and the repository cleanup removes them when present. Other altars retain their optional finite, non-negative cost. Description and URL remain editable for all altars.

## Blood Donation places

Blood Donation uses `placeType: 'switch'` and required `switchType: 'blood-donation'`. Its displayed title is Blood Donation; Title is hidden in the form and omitted on loading, saving, and export. Description and URL remain optional and editable. The editor offers Blood Donation in Switch type.

The icon is `public/images/entities/point/place/switch/blood-donation.png`. Missing or failed images use the normal Place dot fallback. The drawer includes a counted, static Blood donations subgroup with search and visibility controls. Place frames, zoom sizing, popup behavior, JSON export, and synchronization work as for other Place entities. Schema version remains 2.

Point images explicitly override Leaflet marker-pane width:auto with width:100%, retaining height:100% and object-fit:scale-down. Non-square icons stay centered within the marker hit box and drag anchor without stretching; small images retain their intrinsic size. This applies to framed and unframed point icons in both map modes.

## Switch migration

MapPlaceType.Switch is serialized as switch. MapPlaceSwitchType contains Lever = lever, Button = button and BloodDonation = blood-donation; switchType is required and rejected on other categories or place types. Repository migration converted 33 levers, 4 buttons and 8 blood donations, preserving IDs, positions, descriptions, URLs and entity order. Schema version remains 2; old exports must move their old placeType into switchType and set placeType to switch before loading or Sync. Removed place types are rejected.

The form offers Switch plus a Switch type selector, defaulting to Lever and preserving the current subtype during editing. Switch titles derive from switchType; Title remains hidden while Description and URL stay editable. The Switches heading uses images/entities/point/place/switch.png, falling back to a dot in --color-entity-switch. Subtype icons use images/entities/point/place/switch/<switchType>.png; existing assets were moved there. Lever and Button retain their previous fallback colors; Blood Donation retains the Place fallback.

Switches is collapsed initially and contains static Levers, Buttons and Blood donations rows, including zero counts. Each row has its subtype icon, title, visibility eye and count without a member list. Child indentation is removed only under Switches so icon/title/eye/count columns align with its heading. Parent and child eyes, mixed states, Shift-click isolation, menu search, export and synchronization use the shared tree and database behavior.
