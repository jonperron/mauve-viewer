# 1. Move rendering modules

- [x] Move `annotations.ts` to `src/viewer/rendering/`
- [x] Move `feature-tooltip.ts` to `src/viewer/rendering/`
- [x] Move `similarity-profile-renderer.ts` to `src/viewer/rendering/`
- [x] Move `ungapped-match-renderer.ts` to `src/viewer/rendering/`
- [x] Move `unaligned-regions.ts` to `src/viewer/rendering/`
- [x] Extract `panel-renderer.ts` from `alignment-viewer.ts`
- [x] Extract `connecting-lines.ts` from `alignment-viewer.ts`
- [x] Extract `panel-update.ts` from `alignment-viewer.ts`

# 2. Move interaction modules

- [x] Move `cursor.ts` to `src/viewer/interaction/`
- [x] Move `region-selection.ts` to `src/viewer/interaction/`
- [x] Move `track-controls.ts` to `src/viewer/interaction/`
- [x] Move `sequence-navigator.ts` to `src/viewer/interaction/`
- [x] Move `shortcuts-help.ts` to `src/viewer/interaction/`

# 3. Update imports

- [x] Update all import paths in moved files
- [x] Update import paths in `alignment-viewer.ts`
- [x] Update import paths in test files

# 4. Update specs

- [x] Update module paths in `xmfa-viewer` spec
