# AURA v0.8 — Safe Playlist Editing, Search Consistency, Spoken Worlds

**Release date:** 14 November 2026
**Status:** Development prerelease; full Windows runtime validation and 1.0 sign-off are outstanding.

## What changed

### Spotify playlist removal safety
- Spotify's current `DELETE /playlists/{id}/items` takes item URIs rather than a specific row index. Deleting one URI may remove multiple copies of the same track within a playlist.
- AURA now explicitly warns that matching copies may be removed, including ones on unseen pages, and requires affirmative confirmation before sending a request.
- The backend rejects removal requests lacking an authorized-type track/episode URI, a nonempty Spotify playlist snapshot ID, and an explicit `confirm_all_occurrences: true` acknowledgement. The only forwarded Spotify JSON fields are `items` and `snapshot_id`.
- Removal controls are hidden when the playlist snapshot/editing capability is absent. All mutation tests use an isolated server and fake/unauthenticated Spotify state; real playlists were not changed.

### Search reliability
- Each new Spotify search uses a distinct generation ID and AbortController. A stale result can never replace a newer search or category even if the server ignores cancellation.
- Loading more uses the actual returned item count for the next offset. Duplicate simultaneous "load more" actions are ignored during in-flight requests.
- Chromium QA performs two simulated network searches that finish in reverse order and verifies the *newer* query is the only one shown.

### Spoken Worlds
- Saved episodes display accurate percent and remaining minutes **only** if Spotify returns a `resume_point`; fully played episodes can show their real completion status.
- Shows and audiobooks now have explicit official Spotify handoff controls instead of potentially unsupported "Listen" actions.
- Valid saved episode URIs retain AURA playback controls. This does **not** claim that every episode is playable on a specific device.
- The `user-read-playback-position` permission is included in **future Spotify OAuth authorizations**. Existing saved authorization tokens have not been changed or revoked; users may not see progress until Spotify grants that scope in a future sign-in.
- AURA does not write progress to Spotify, stream-rip, download licensed audio, or claim native audiobook chapter navigation.

## Tests and integrity
- `npm test`: **39/39 passing**, including new playlist-delete safety tests and spoken-audio content tests.
- Chromium walkthrough: passed on Acer, including real saved collections, AURA chamber, search race-condition simulation, Spotify handoffs, 29 valid saved episode playback actions, mobile scrolling and no horizontal overflow.
- `npm run build:web`: passed, with updated service-worker cache version.
- Linux AppImage and Windows x64 portable ZIP are cross-platform prerelease artifacts; the Windows executable has **not** been tested on an actual Windows machine.
- Spotify auth, Soloist key, locally paired audio bridge and live user playlists have not been modified in these builds. Development runs did not restart the active AURA service or audio bridge.
- Native signing and `asar` hardening, 1.0 soak tests and Windows end-to-end playback remain acceptance blockers.

## Reproducible workflow

```bash
cd ~/rProjects/extradomo/aura
npm test
npm run build:web
npm run test:browser
npm run desktop:package:linux
npm run desktop:package:windows:zip
```

Installed Linux native launch: `~/.local/opt/AURA/AURA.AppImage`.
Linux installer: `./scripts/install-aura-linux.sh`.
Packaged files: `releases/native/AURA-0.8.0.AppImage` and `releases/native/AURA-0.8.0-win.zip`.

## Remaining for 1.0
1. Actual Windows Spotify/Soloist login, speaker audio and native window/media-control verification.
2. Spotify playlist editing permission conflict handling and safer mutation confirmation patterns.
3. Spoken-audio progress beyond display: native episode seek/resume behavior, if supported by the licensed playback engine, with verified tests.
4. Multi-hour Linux soak, system reboot/suspend/wake reliability.
5. Packaging integrity, code signing where feasible, cross-platform install/uninstall behavior and final user acceptance.

Review `ACCEPTANCE-1.0.md` and `SECURITY.md` before labeling any build as 1.0.

## Post-release R4 safety fix (14 November 2026)
- Prevent automatic 401 replay of Spotify POST/PUT/DELETE, including playlist mutations; retain safe GET token-refresh retry. This avoids unintended repeated writes on ambiguous authorization failures.
- Two mocked regression tests added; 42/42 tests, web build and Chromium QA passed. Development source only; live Acer backend was not restarted.

## Desktop health identity guard (14 November 2026)
- Desktop shell now checks the expected AURA backend health fields, rather than trusting any JSON HTTP 200 response on port 4373. Supports older AURA versions during upgrades.
- Regression test added: 43/43 Node tests, Chromium QA and web build passed. Source-only; not yet deployed to the live Acer backend or installed native shell.

## R4 error recovery and R10 archive hardening (14 November 2026)
- Spotify write errors now provide specific, nonsecret recovery guidance for 401, 403, 409, 429 and temporary 5xx without automatic write replay. 44/44 Node tests passed.
- Electron builder now uses `asar:true`; Linux AppImage built successfully and bundled source/resources verified. Windows cross-package is unsigned and does not establish Windows runtime compatibility. Linux virtual-display launch is not an end-to-end audio test.

## Live Acer 0.8 deployment (14 November 2026)
- Supervised restart deployed backend 0.8.0. Spotify auth and Soloist pairing survived; audio bridge and MPRIS remained active.
- Real playback smoke passed pause/resume/seek/volume (5/5); ANTIFRAGILE playing at 32% was restored and independently confirmed. Shuffle was not tested in this single-track context.
- Completed Windows ZIP passed integrity check but is **not** verified on Windows. No claim of Windows audio or native signing.

## Repeat control fix and live loop test (14 November 2026)
- Fixed repeat button issuing two conflicting Soloist commands per click. Each off/context/track transition now issues only the necessary command.
- Actual ANTIFRAGILE loop boundary tested on live Soloist: song remained playing and position wrapped to start. A new `play(uri)` may reset repeat mode; set repeat-track after starting the song. Restored playing at volume 32 with repeat-track enabled.
- 45/45 Node tests, web build and Chromium QA passed. Existing tabs may need refresh for new UI code.

## R11 diagnostic and durable repeat fix (14 November 2026)
- Added `npm run test:soak:local`, read-only, with `AURA_SOAK_SECONDS` and `AURA_SOAK_INTERVAL_MS`. 60-second live run passed all 13 samples.
- Repeat button fix now resides in `src/app-core.js`, the canonical UI source; generated `public/app.js` rebuilt so subsequent web builds preserve it. 45/45 Node tests and browser QA passed.

## R11 soak result correctness (14 November 2026)
- Read-only soak now marks a sample healthy only when backend, Spotify/Soloist, song, repeat-one and volume all match. Failures return nonzero, with first failure preserved; pure helper has four regression tests. 49/49 Node tests, browser QA and a live 11/11 sample check passed. No playback interruption.

## R11 web bundle drift protection (14 November 2026)
- `npm run check:web` validates generated UI JS/CSS against canonical `src/` without modifying files. New tests guard against stale generated assets and keep repeat regression focused on canonical source. 51/51 Node tests passed. No live playback disruption.
- Chromium integration PASS and source-only secret scan PASS for this milestone.

## R9 repeat-mode visibility (14 November 2026)
- Repeat-one now has a visible `1` on both player and Listening Chamber controls, separate from context repeat. Both expose mode-aware accessibility labels and pressed state. Chromium validates these semantics without changing playback. 51/51 Node tests and web integrity checks passed.

## R11 outage reporting (14 November 2026)
- Soak output now counts failure reasons, current/longest failure streak and observed recoveries. 53/53 tests, Chromium QA, web integrity and 13/13 live samples passed; not multi-hour evidence.

## Direct product update — Jump palette (14 November 2026)
- New visible **Jump** control in the header opens a cinematic searchable destination palette. Ctrl/Cmd+P opens it; type to filter, arrows to select, Enter to navigate, Escape to dismiss. Supports mouse/touch and mobile widths.
- All 12 AURA destinations are accessible without scrolling the sidebar. Existing Ctrl/Cmd+K Spotify search is unchanged. This feature does not alter playback or Spotify account data.
- This is an additive prerelease feature, not evidence of 1.0 cross-platform acceptance.

## Spoken Worlds library workflow update (14 November 2026)
- Podcasts, saved episodes and audiobooks now have in-page title/creator filtering and title sorting.
- Saved episodes additionally support longest-first and Continue Listening First, using Spotify's returned resume-point metadata only. Search applies to loaded items, with explicit loaded-result counts; use Load more to expand coverage.
- Responsive search/sort controls and empty-result guidance added. No fabricated episode progress or unsupported audiobook playback controls.
