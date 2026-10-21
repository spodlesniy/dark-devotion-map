# Independent tree component

The recursive component in src/components/Tree.tsx remains independent of entities, Leaflet, search, and map filtering. The drawer now uses it through a separate entity adapter and visibility hook.

## Node configuration

TreeNode is defined in src/types/TreeNode.ts. Node IDs must be globally unique and stable across configuration updates. Nodes must form a finite tree without cycles.

| Field | Behavior |
| --- | --- |
| id | Stable string identity for visibility and React reconciliation. |
| title | Displayed label. |
| icon | Optional React content; no icon catalogue is assumed. |
| showIcon | Defaults to true; false hides a supplied icon. |
| showVisibility | Defaults to true; false hides the eye control without changing visibility calculations. |
| count | Supplied number; defaults to zero when omitted. Counts are not calculated or aggregated. |
| showCount | Defaults to true; false hides the count. |
| countChanged | Optional presentation flag highlighting a supplied count. |
| hidden | Hides a row for presentation, without removing it from visibility calculations. |
| collapsible | False keeps a branch as a static row while its logical descendants still participate in visibility. |
| alwaysExpanded | Keeps children visible under a static heading, with no disclosure action. Overrides collapsible: false. |
| defaultExpanded | Initializes a branch as expanded; defaults to false and does not override user changes. |
| expansionRequest | Optional string token requesting expansion on mount or when the token changes. Removing it preserves current disclosure. Reusing an unchanged token preserves manual collapse. |
| disabled | Prevents disclosure and closes a branch; its eye remains usable. |
| onActivate | Optional action rendered as a clickable title; receives no domain data. |
| children | Optional readonly array of child nodes. Non-empty arrays create expandable branches by default; missing or empty arrays create static leaves. |

Branches start collapsed unless defaultExpanded is true. This setting initializes expansion once; later renders preserve user changes. Counts alone never prevent expanding a branch that has configured children; callers can explicitly disable disclosure. The entity adapter disables zero-match branches. Disabled branches retain their closed state after re-enabling. Summary clicks update disclosure state directly; Enter and Space activation still work. Titles and counts do not determine identity. Descendant tree components remain mounted when their branch is collapsed, preserving nested disclosure state. Optional custom title renderers mount only for shown rows; collapsed ancestors and search-hidden rows retain plain text without mounting expensive presentation components. Disclosure placeholders keep leaf rows aligned with branches.

## Visibility

Shift-clicking an eye isolates that node and all logical descendants across the full tree, including search-hidden and non-rendered members. Ordinary clicks retain their toggle behavior. Isolation replaces previous visibility exceptions and preserves disclosure. The optional onShowOnly callback receives the computed hidden IDs and selected node; without it, onVisibilityChange receives the result. The tree tracks Shift through capture-phase keyboard listeners, resets feedback on blur/visibility changes, and changes the eye tooltip and hover/focus styling while Shift is held. Eye buttons use color and background feedback without an outline or outer shadow, including keyboard focus.

Visibility belongs to leaf IDs. Branch visibility is derived from every descendant leaf, including descendants whose controls are hidden or whose branches are collapsed:

| Descendant leaves | Parent eye | Activation |
| --- | --- | --- |
| All visible | Visible | Hide every leaf in the subtree. |
| Some visible | Mixed (indeterminate) | Show every leaf in the subtree. |
| None visible | Hidden | Show every leaf in the subtree. |

Mixed eyes use a horizontal pupil mark and the warning theme color; hidden eyes are crossed and dimmed. Controls expose their state through aria-pressed, including mixed, and have accessible action names. Activating an eye does not expand or collapse its branch. Enter and Space activate the eye; disclosures use native details/summary keyboard behavior. The component uses nested lists, not an ARIA tree widget with custom arrow-key navigation.

Only the chosen subtree changes. Siblings retain their settings. Input sets and node configuration are never mutated; toggles create a new set. Unknown IDs and branch IDs in the hidden set do not affect derived visibility. All current leaves are visible by default; newly added leaf IDs are also visible unless included in the hidden set. State follows stable IDs across reordering and title/count changes.

## Component API

- nodes: readonly TreeNode[] supplies the tree configuration.
- renderTitle?: (title: string) => ReactNode optionally supplies title presentation, independently of domain data. The menu supplies ScrollingText; generic Tree defaults to plain text. Collapsed and hidden rows skip this renderer.
- label: string supplies the accessible name for the root list.
- hiddenIds?: ReadonlySet<string> enables controlled visibility; the caller must update it after callbacks.
- defaultHiddenIds?: ReadonlySet<string> initializes uncontrolled visibility once. Later changes to this prop do not reset current state.
- onVisibilityChange?: (hiddenIds: ReadonlySet<string>, node: TreeNode) => void reports the complete next hidden-ID set and activated node in either mode.

Without hiddenIds, the component owns visibility in memory. With hiddenIds, the supplied set is authoritative; callbacks alone do not update the display. Do not switch between controlled and uncontrolled ownership during a mounted component's lifetime. State is not persisted to browser storage.

The pure helpers in src/helpers/treeVisibility.ts collect leaf IDs, derive visibility, and toggle a subtree. They contain no rendering or domain-specific logic.

## Entity integration

Tests in tests/components/Tree.spec.tsx and tests/helpers/treeVisibility.spec.ts cover recursive visibility, subtree operations, immutable updates, controlled and uncontrolled ownership, optional presentation, counts, keyboard activation, and disclosure state.

The recursive configuration in src/helpers/entityGroups.ts defines stable group IDs, titles, icons, child groups, matching predicates, optional icon/eye/count display flags, and whether lists are expandable. Each group predicate selects members from its parent. Sibling predicates must partition the parent membership without overlaps; the default configuration is tested against the complete repository database to ensure every entity occurs exactly once. New category nodes require configuration only, not rendering changes.

SearchInput owns the raw input text, trims and lowercases queries, and reports an applied query after a 300ms pause when at least three characters are entered. Non-empty shorter input clears the applied query immediately. Empty input invokes the optional onClear callback; EntityMenu connects it to menu reset. Without onClear, SearchInput reports an empty applied query as before. Pending timers are cancelled on input changes and unmount; parent updates do not restart the timer. Raw typing updates stay inside SearchInput, so EntityMenu and its tree do not rerender for each keystroke. useEntityMenuSearch only selects entities for the applied query; it owns neither input state nor debounce. EntityMenu memoizes the complete tree by the entities array reference. Search queries and visibility changes reuse that tree; immutable database updates rebuild it using the module-level entityGroups configuration. The pure applyEntityTreeSearch function separately projects the full tree using matching entity IDs. It marks unmatched leaves hidden, aggregates matching counts through every level, sets countChanged against original counts, and disables zero-match branches. It retains all nodes, IDs, entity references, and presentation configuration without mutating the full tree. EntityGroup, EntityGrouping, and EntityTreeNode expose showWhenNoMatches. During active search, a zero-match branch is hidden unless this option is true; undefined and false both hide it. All first-level menu categories explicitly set it to true, keeping their zero-count headings visible. Configured subcategories and generated groups default to false. Without an active query, empty branches stay visible as before. Hidden branches remain mounted and participate in hierarchical map visibility; their descendants and inherited rules are not removed. EntityGroup and EntityTreeNode expose expandOnSearch, defaulting to true for configured categories, including roots and their nested branches. EntityGrouping defaults this flag to false for dynamically generated groups; either default can be overridden. For a non-empty applied query, matching counts at any depth trigger a generic expansionRequest only on opted-in branches. Unmatched branches receive no request. The generic Tree handles expansion tokens without knowing about search. Non-empty input below three characters removes requests without resetting disclosure; a subsequent query can request expansion again. Completely emptying the field instead resets the menu to its initial state. Grouped lists keep their current disclosure while their containing categories open. EntityMenu memoizes this projection by the full tree, matching entities, and applied query; its remaining adapter supplies React icons and navigation callbacks only. Tree receives ready-to-render flags and remains independent of search. Configuration is static; changing its source takes effect on reload or module replacement, rather than through search state.

Tests in tests/components/SearchInput.spec.tsx cover debounce, normalization, immediate clearing, cleanup, callback updates, and parent render isolation. Tests in tests/helpers/applyEntityTreeSearch.spec.ts cover immutable projection, nested counts, empty and static categories, reset, and visibility independence. Menu integration tests also cover active search during title edits, additions, and deletions, preserving the raw query and expansion of surviving matching groups. Leaflet integration tests verify that search leaves actual map layers intact, group eyes hide all members, locating a hidden grouped member reveals only that entity and opens its popup at the correct position, and non-empty short input preserves map visibility.

src/helpers/entityTree.ts builds category nodes and entity leaves from the complete working database. applyEntityTreeSearch derives presentation flags and displayed counts from menu search results. EntityMenu adapts these projected nodes into generic TreeNode values and supplies PointAppearance icons and navigation callbacks. Hidden search rows remain in the logical tree, so eye states and subtree toggles always cover the full database. Supplied counts include hidden map entities; changed search counts use the warning color. Static categories retain their logical entity children without rendering a list. Lost rooms is collapsible and shows each entity by its optional title or Lost room fallback, with individual navigation and visibility controls. Hovering a menu row highlights its full width with the shared control hover color, including the title, visibility eye, count, and disclosure space. Boss entity titles stay on one line with ellipsis; their rows reserve the shared count-column width so visibility eyes align with category eyes. Menu titles use ScrollingText to reveal overflow on hover or keyboard focus. Generic navigation buttons retain native title text only when no custom renderer is provided. Tree disclosure elements expose data-node-id for scoped presentation rules.

The Reset button beside search clears the applied query and changes the keys of SearchInput and Tree, remounting only those local components to clear raw input, cancel pending debounce, and restore default disclosure. Emptying the input invokes the same reset but remounts only Tree; SearchInput clears its own value and cancels pending debounce while keeping DOM identity and keyboard focus. EntityMenu calls onResetVisibility; the route connects it to useEntityTreeVisibility.resetVisibility, which clears inherited rules and per-entity exceptions. All entities return to their initial visible state. The database, unsaved status, map position, and developer settings are untouched. Tests cover pending debounce cancellation, repeated reset, original disclosure, actual Leaflet layer restoration, and preservation of edited metadata and unsaved status.

useEntityTreeVisibility stores inherited visibility rules keyed by group IDs or entity UUIDs. New entities inherit their current category rule by default. The developer creation action adds a visible exception for the newly created UUID using the validated next database snapshot before React rerenders, so hidden categories and active isolation cannot hide the new marker. Existing siblings retain their visibility rules. Explicit entity exceptions follow their UUID after edits. Parent toggles clear current descendant overrides in one state update. Derived leaf IDs control map filtering through the shared filterMapEntities helper; the generic useMapEntityFilters predicate hook remains available for other independent filters.

Locating a hidden entity adds a visible exception for only that UUID, preserving hidden siblings and producing mixed ancestor states as appropriate. Navigation then uses the existing map location and popup behavior. Visibility remains in route memory, outside the exported database and unsaved-change tracking. Empty category leaf IDs preserve visibility preferences before entities are added. Enemies and Places start expanded when non-empty; other main groups and expandable subgroups start collapsed; zero-match branches cannot expand, while non-empty configured branches remain available regardless of descendant visibility.

Tests in tests/helpers/entityTree.spec.ts, tests/hooks/useEntityTreeVisibility.spec.tsx, and tests/components/EntityMenu.spec.tsx cover taxonomy coverage, deeper configurations, inherited rules, creation/editing/deletion, menu search, static rows, counts, parent/leaf toggles, and navigation. Existing map browsing tests verify repeated positioning and popup opening.

The menu search and Reset row is sticky at the top of the drawer content scrollport. An opaque theme background and local stacking layer keep scrolling rows from showing through the controls. The drawer header stays outside this scrolling region.

Direct ungrouped Codex rows remove horizontal title-button padding and reserve the count column on the right, aligning their titles and visibility eyes with adjacent Codex group headings. These rules target only immediate Codex leaves; nested member lists and other background-highlighted lists retain their spacing.

NPCs group by exact displayed title, with alphabetically sorted title groups. EntityGrouping.ungroupSingle presents a one-member NPC group as a direct entity action with its own visibility eye and no count or disclosure. The logical group remains in the domain tree, preserving inherited visibility when membership grows or shrinks. Scoped NPC spacing aligns direct actions with adjacent group headings. Each group starts collapsed, shows a visibility eye and count, and contains title-only member navigation in database order. Group visibility and Shift-click isolation apply to every instance; member rows have no individual eyes.

## Dynamic grouping

EntityGroup.sortChildren optionally compares its immediate child nodes; EntityGrouping.sortChildren optionally compares grouped member nodes. Both default to no sorting. Comparators receive title and optional entity data. Sorting copies child arrays and preserves stable order for equal values without mutating the database. NPCs, Codex, Titles, Bosses and Regular title groups use an English case-insensitive natural title comparator. Other category ordering remains unchanged.

An EntityGroup may define grouping instead of explicit child category nodes. The adapter groups the complete member list by grouping.getKey(entity), then adapts each group into another ordinary tree node. groupByKey in src/helpers/groupByKey.ts is a domain-independent grouping utility accepting any item type and string keys. Input arrays are not mutated; groups preserve first-seen key order and entity order within each group. Optional keys seed an explicit order and retain empty groups; previously unknown keys are appended.

Grouping options are getKey, optional getTitle and getIcon callbacks, optional keys, showIcon/showVisibility/showCount flags, collapsible (default true), alwaysExpanded/defaultExpanded, expandOnSearch, showWhenNoMatches, and showEntityVisibility. Group controls default to visible; entity visibility controls default to visible unless explicitly disabled. Generated IDs use the parent ID plus :group: and the URI-encoded group key, preserving visibility settings when members change. Keys must be stable and unique within the parent. Explicit child category configuration takes precedence if both children and grouping are supplied.

Tablets use tabletType as the key, all MapPlaceTabletType values as the ordered key list, and the existing tablet appearance mapping for displayed Faith, Damage, Crit, and Stamina titles. Each type has an eye and count, including zero. Type groups start collapsed: clicking their title toggles the member list without navigating the map. Their children show only clickable entity titles without eyes or counts. Tablet entity titles remain subtype-derived, so multiple entries can have the same label; each entry still locates its own UUID and position and opens its normal popup. The enclosing Tablets node retains its existing disclosure.

Regular enemies use their title as the group key and sort title groups alphabetically. Each title group starts collapsed and has an eye and count. Members show only clickable titles, with no individual eyes or counts; activation locates that particular entity and opens its popup. Bosses retain their ungrouped entity list. Visibility rules apply to all matching members, including newly added enemies with the same title, and locating a hidden member reveals only that UUID.

Altars use altar subtype values as group keys and the explicit altarTitles mapping for display. Groups follow first-seen subtype order and show static title, eye and count rows without expandable member lists. Logical entity descendants remain available for search and inherited visibility. Teleportation altars remain exclusively in the separate Teleporters category.

Grouping uses the complete working database before menu search. Search updates counts and entity-row presentation without changing group membership or visibility. Existing subtree rules apply to generated groups, including inherited preferences for new tablets and updated membership after subtype edits. Revealing one hidden entity may make its group mixed even though its individual eye is omitted; the group's mixed eye enables all members.

Traps use trapType values as group keys and trapTitles for display. Enum order seeds all subtype groups, including empty ones. Each group is a static title, visibility eye and count row without expandable member lists. Search and Shift-click isolation retain full logical membership.

Blockers use blockerType as group keys and blockerTitles for display. Enum order seeds all subtype rows, including empty types. Rows show only the title, visibility eye and count; logical descendants support search, inherited visibility and Shift-click isolation without rendering member lists.

Codex grouping.matches selects entries with a non-empty trimmed group or both part and totalParts; other entries remain direct leaves. An explicit group overrides the unchanged title as the group key and label. Groups start collapsed and members show title plus part/totalParts when present. Group members sort by numeric part, with unnumbered members first and database order retained for duplicate or absent part values. Group counts, inherited visibility, Shift-click isolation and search use original entity IDs and titles; individual member eyes are omitted.

Switches is a Place category with explicit Lever, Button and BloodDonation child categories. Child rows are static, show subtype icons and counts, and keep logical entity descendants for visibility and search. Only the immediate Switches child list removes left indentation, aligning icons, titles, eyes and counts with the parent heading.
