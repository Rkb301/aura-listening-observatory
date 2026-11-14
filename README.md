# AURA — The Listening Observatory (local music desktop prerelease)

> **Status: v0.8 native desktop prerelease.** The real Spotify account authorization, library APIs, local Soloist pairing and audible music streaming were verified on the Acer Ubuntu 22.04 computer on November 13, 2026. The same project targets Windows but Windows playback remains untested. AURA now has a native Linux AppImage plus the original PWA; the Windows portable package is cross-built, but not runtime-tested on Windows. For current v0.8 features and checks, see `RELEASE-0.8.md`.

AURA is a personal, local-first Spotify companion with an original dark interface. The app itself is a loopback-only Node.js 22 HTTP server and dependency-free web frontend. Spotify **audio still streams over the internet from Spotify**; this is not an offline client and does not download or intercept audio.

## What is implemented

- Spotify authorization-code + **PKCE** login; no Spotify account password, client secret or token exposed to the UI.
- Spotify Client ID entered through local Settings and saved to `~/.aura-music/config.json`.
- Automatic access-token refresh, and login-session persistence in `~/.aura-music/tokens.json` (private local file, mode 0600 on POSIX).
- Spotify account/profile, liked tracks, playlists, albums, catalogue search (2026 10-results/page cap), paginated collection loading.
- Open album/playlist views. Playlist track details display only when Spotify permits access, typically owned or collaborative playlists.
- Add/remove saved library items through **2026 generic `/me/library` endpoints**, create/rename playlists, add/remove tracks from playlists.
- Spawn the separately downloaded official Soloist binary through Settings, with a user-provided API key optionally remembered in ~/.aura-music/soloist-key (owner-only local file), or connect to an existing loopback Soloist WebSocket.
- Soloist live state and queue, play URI/resume, pause, skip, seek, volume, shuffle, repeat, add to queue, device activation; output through your operating system's sound device.
- Other Spotify Connect devices list and playback transfer where the Web API permits it.
- Responsive dark UI, original artwork backgrounds, installable PWA shell, keyboard shortcuts.
- AURA Observatory, immersive Listening Chamber and Cinema Mode, live queue peek, Discovery, Sequence, artwork-led Archive, Made for You mix pins, top artists/tracks, saved podcasts/episodes/audiobooks, sleep timer and a standalone-window launcher for Acer.
- No runtime build step or npm dependencies, no telemetry. For UI source edits run `npm run build:web` to regenerate the bundled frontend from `src/`.

## Requirements

- **Node.js 22 or newer** on Windows x86-64 or Ubuntu/Linux x86-64; macOS not tested/targeted for this release.
- Your own **Spotify Premium** account (including Spotify Premium Platinum).
- Personal developer app at <https://developer.spotify.com/dashboard> with a **Client ID**.
- Separately downloaded official **Spotify Soloist** binary for your operating system and personal Soloist API key from Spotify for Developers. Download: <https://developer.spotify.com/documentation/soloist/reference/downloads-and-updates>
- An official Spotify app on your phone or computer for Soloist's **first Spotify Connect pairing** (on the same local network).
- Internet for Spotify authentication, metadata and music streaming.

## Start it — Windows

1. Extract the ZIP.
2. Install Node.js 22+ from <https://nodejs.org/> if needed.
3. Double-click **`scripts/start-windows.cmd`**, or open **Command Prompt** in the extracted project folder:

   ```cmd
   node server.mjs
   ```

4. Open <http://127.0.0.1:4373> in Edge, Chrome or Chromium. Keep the terminal open.

## Start it — Ubuntu/Linux

```bash
cd /path/to/aura-spotify-poc
node --version  # must be >= 22
./scripts/start-linux.sh
# or: node server.mjs
```

Open <http://127.0.0.1:4373> in Chromium or Chrome. Keep the terminal open.

Node package managers are **not** required for runtime. `npm test` works without installing any dependencies.

## Spotify setup (required for real library and search)

1. Log in to <https://developer.spotify.com/dashboard> and create a Development Mode Spotify app (or use an authorized existing personal app).
2. In your app settings, add the following exact Redirect URI:

   ```text
   http://127.0.0.1:4373/auth/callback
   ```

   **Use 127.0.0.1 and port 4373 exactly**, not localhost, or the callback will not match. Spotify permits HTTP only for loopback IP redirects.
3. Copy the app's **Client ID** (do not copy its client secret).
4. Start AURA and open **Settings → Spotify account**.
5. Paste the Client ID and select **Save Client ID**.
6. Select **Sign in with Spotify**. Spotify's website will authorize the requested scopes, then return to AURA.
7. Your real playlists, saved tracks, albums and profile should now load. Development Mode permissions and scopes still apply.

To sign out, use **Settings → Disconnect account**. This deletes the stored OAuth token; it does not revoke Spotify access from Spotify's account settings. For complete revocation, remove app access in your Spotify account's Apps page.

## Soloist setup (required for real AURA playback)

1. Obtain **your own** Soloist API key at the Spotify for Developers Dashboard. Download the official binary from <https://developer.spotify.com/documentation/soloist/reference/downloads-and-updates>. **Do not distribute the binary or key with AURA.** Builds expire 90 days after their build date.
2. Extract `soloist` (Linux) or `soloist.exe` (Windows). Make sure your user can execute it.
3. In AURA **Settings → Spotify Soloist**, provide the full executable path and API key. Select **Start Soloist**. AURA starts it with loopback-only `--ws 127.0.0.1:0` and its own state/cache directories. If you choose to remember the key, it is saved locally and reused automatically on a later launch.
4. In your usual official Spotify app (phone or desktop), find **AURA Music** in the Spotify Connect device picker and pair it. Your normal Spotify app need not remain open after pairing.
5. Return to AURA, press **Use AURA Music**, search a track and select Play. You should hear streaming audio on the device's default audio output.

**Already running Soloist yourself?** Instead launch it in a terminal with its own key and `--ws 127.0.0.1:9090` and enter `ws://127.0.0.1:9090/` under **Connect existing engine**. Do not bind to `0.0.0.0` or expose Soloist's WebSocket to your LAN or internet.

If Soloist needs updating, get a new official build before the old one's 90-day expiry. AURA does not redistribute the binary or bypass Spotify's expiry policy. The Acer has a separately obtained official binary under the ignored `vendor/` directory.

### Manual Soloist start (optional)

Linux:

```bash
./soloist --device-name "AURA Music" --api-key 'YOUR_PERSONAL_SOLOIST_API_KEY' --ws 127.0.0.1:9090
```

Windows Command Prompt:

```cmd
soloist.exe --device-name "AURA Music" --api-key "YOUR_PERSONAL_SOLOIST_API_KEY" --ws 127.0.0.1:9090
```

Entering secrets into CLI arguments may expose them to the local process list or shell history. For a personally operated computer, keep your key private; do not publish screenshots or logs containing it. The app's Settings avoids writing the key to disk.

## Shortcuts

- `Ctrl+K` / `Cmd+K`: focus search
- `Space`: play/pause (unless a text field is focused)
- `Alt+Right`: next track
- `Alt+Left`: previous track

## Install as standalone app (PWA)

In Chrome/Chromium/Edge, use the browser's **Install app** action (or use Settings → Install app if a prompt is available). AURA opens without browser tabs in its own window. **This is not an Electron/Tauri native binary yet**; Node.js and the localhost process must continue running in the background for Spotify features to work.

## Limits that are not papered over

- **Spotify does not provide a public API for its entire user interface or proprietary Home/AI recommendations.** You cannot promise a 100% functionally identical Spotify replacement, even on Premium Platinum.
- Development Mode rules introduced February 2026 cap access; playlist-item retrieval is restricted to playlists you own or collaborate on, and catalogue Search is limited to 10 results per request. Spotify may return 403 for some endpoints or content.
- Lyrics, AI DJ, Spotify social features, Smart Shuffle state mutation, synchronized playback/visuals, Spotify's actual Home recommendations, official offline Spotify downloads, and lossless quality selection are **not implemented** in this POC.
- Soloist can output lossless depending on Spotify account, playback settings and actual audio hardware, but AURA currently does **not** verify the negotiated audio format.
- Spotify Soloist is an official local playback engine; Spotify's APIs and platform terms still apply. This prototype is for personal learning/testing, **not** a certified third-party Spotify replacement.
- Spotify may not authorize a developer app if platform eligibility or policies change.

## Architecture and security

```text
[Installable PWA UI]     --same-origin HTTP--> [Node.js local server on 127.0.0.1:4373]
                                                  |          |
                                       Spotify Web API     Auth Code + PKCE
                                                  |
                                        Spotify cloud
                                                  |
                                  Soloist WebSocket (loopback only)
                                                  |
                                      Spotify Soloist process
                                                  |
                                      Windows WASAPI / Linux PipeWire
```

The browser **never directly connects to Soloist's unauthenticated WebSocket**. AURA uses a Node.js-only WebSocket client and relays state to the browser using Server-Sent Events (SSE). Commands require a per-process CSRF token, an exact loopback Host, an origin check and a JSON body. Only known Soloist commands and loopback-only endpoints are accepted. The Spotify API proxy is a fixed route allowlist, not a generic arbitrary URL proxy.

OAuth tokens are stored as a restricted local JSON file under the user's home folder; **this is not an OS-keychain-backed encrypted vault**. Other processes running as your same OS user may be able to read them. Remove `~/.aura-music/tokens.json` to manually clear them when AURA is not running. Stored session state belongs to Soloist's own data directory. The optional Soloist API key is stored as restricted local plaintext under `~/.aura-music/soloist-key` (mode 0600), never served to the browser. Use **Settings → Forget saved key** to delete it.

AURA stores no music files, does not modify/decrypt streams, and sends no analytics.

## Validation

```bash
npm test
node --check server.mjs
node --check lib/spotify.mjs
node --check lib/soloist.mjs
node --check public/app.js
```

Tests validate OAuth URL generation, command validation, Soloist event reduction, HTTP routing, basic CSRF protection and login prerequisites. **Live checks still require your own Spotify Premium account, downloaded Soloist binary, pairing and real sound hardware; an audible playback test was completed on Acer Ubuntu.** Run the acceptance checklist below on your own device.

## Real-device acceptance checklist

- [ ] OAuth login succeeds; username appears in Settings.
- [ ] Liked tracks, playlists and albums show accurate real account content; pagination works.
- [ ] Search shows actual catalogue results, at most 10 per page.
- [ ] Soloist starts, appears in official Spotify's Connect picker and authenticates.
- [ ] Search a song → Play; confirm audio in your headphones/speakers.
- [ ] Verify play/pause/next/previous/seek/volume/shuffle/repeat, queue and playback progress.
- [ ] Save and remove an item from library; see changes in official Spotify.
- [ ] Create playlist, add song, remove song, rename playlist; see changes in official Spotify.
- [ ] Test installable app on Windows and Ubuntu, standalone window and reconnect after restart.
- [ ] If seeking lossless output, verify Spotify/Soloist audio settings and actual DAC or operating-system output; this app doesn't claim quality telemetry.

## Future production path

A native Electron desktop wrapper now exists on Linux, and a portable Windows build is generated but has not been tested on Windows. Remaining production work includes OS-keychain encryption, code signing, hardened packaging, complete playlist permission handling, verified Windows audio and extended stability tests. Refer to the current 1.0 acceptance checklist rather than treating older v0.2 plans as completed.

Official references:

- <https://developer.spotify.com/documentation/soloist>
- <https://developer.spotify.com/documentation/soloist/reference/websocket-api>
- <https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow>
- <https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide>

## Reliability and monitoring (Acer Linux)

AURA is supervised by the user services `aura.service` and `aura-audio.service`. `aura-health.timer` checks their state every ten minutes while the laptop is running, without changing playback. Diagnostic history lives under `~/.aura-music/health/history.jsonl` (private, 0600). Inspect with `tail -n 5 ~/.aura-music/health/history.jsonl`. Stop monitoring with `systemctl --user disable --now aura-health.timer`.

Spotify GET requests now retry only brief rate limits or temporary server errors; playlists and other account-modifying requests are never automatically replayed. Local recovery tests do not log secret tokens. The unattended local monitor does not write code; direct development occurs without Codex, with an hourly ChatGPT development task attempting further bounded sessions when the connected computer and tools are available.

## Native desktop applications (v0.8 prerelease)

The same AURA source supports an Electron desktop shell for Windows/Linux. On the Acer:

```bash
cd ~/rProjects/extradomo/aura
npm run desktop:package:linux
./scripts/install-aura-linux.sh
```

The Linux AppImage is in `releases/native/AURA-0.8.0.AppImage`, installed to `~/.local/opt/AURA/AURA.AppImage`, and appears as **AURA** in the Applications menu. The portable Windows archive `releases/native/AURA-0.8.0-win.zip` was cross-built but has not been tested on actual Windows hardware. These builds are unsigned and rely on a separately obtained official Spotify Soloist executable and user-provided credentials.

AURA's own mix shortcuts can be moved between Windows/Linux with **Made for You → Export pins / Import pins**. The JSON backup intentionally excludes all authentication credentials and saved audio.

This is a development prerelease, not Spotify's official app. Spotify's developer APIs do not expose all proprietary features, and no offline Spotify downloads are included.

## Native Linux media controls (v0.7)

AURA registers a separate `org.mpris.MediaPlayer2.aura` entry on the user's Linux D-Bus using the system Python Gio runtime, without disturbing Spotify's own player. This enables standard play/pause, next/previous, seek, shuffle and volume integration with compatible Linux desktop media controls.

`aura-mpris.service` runs unprivileged and independently of `aura-audio.service`. Check its status with `systemctl --user status aura-mpris.service` and player metadata with `playerctl -p aura metadata title`. It is installed by `scripts/install-aura-linux.sh` when Gio and user systemd are available. The MPRIS helper handles temporary null Soloist states during a backend restart.

The Electron shell also has an optional tray with a visible Open AURA action, Play/Pause, Next and explicit Quit when the desktop environment supports tray icons. Exact tray visibility depends on the desktop shell.

The saved library can now sort by Spotify-added dates, and album/playlist pages support filtering their loaded tracks. These filters don't claim to cover unloaded Spotify pages.

## v0.8 playlist and spoken-audio notes

Removing a Spotify playlist item uses an explicit confirmation because the API can remove **all copies** of a matching URI, not a single row. AURA requires the current snapshot ID. No tests mutate your real playlists.

The Spoken Worlds shelf shows saved episode resume progress **only when Spotify returns it**. The additional playback-position scope is requested on future Spotify sign-ins; existing saved tokens are not reauthorized automatically. Podcasts/shows and audiobooks link to Spotify where the native playback path is unverified.

Spotify search cancels superseded searches, and the UI ignores stale responses even when cancellation is ignored by the server. This is covered by a Chromium test.

### Packaging security note (0.8 development)

Native builds use Electron ASAR to bundle application source rather than leaving an unpacked source tree. ASAR is an archive, **not encryption or a signature**. User Spotify tokens, Soloist keys, audio files and settings are never meant to be included in native packages. Windows builds are currently unsigned and must be verified on real Windows hardware before 1.0 acceptance. Do not treat a successful Linux cross-build as Windows validation.

### Read-only live playback soak (Linux)

With the AURA backend already running, ANTIFRAGILE playing at 32% and repeat-one enabled, run `AURA_SOAK_SECONDS=3600 npm run test:soak:local`. The sampler polls `/api/health` and `/api/soloist/state` every five seconds and checks Spotify authentication, Soloist connectivity, playback status, expected track, repeat-one and volume. It does not change playback or inspect credentials. It exits nonzero on any unhealthy sample and prints aggregate counts only. A short 60-second pass is **not** equivalent to a multi-hour soak, suspend/wake or reboot validation.

Soak output includes `failureReasons`, `longestFailureStreak`, `currentFailureStreak` and `recoveries`. Streaks count samples rather than exact outage seconds; brief failures between samples can be missed. Monitoring never repairs or changes playback.
