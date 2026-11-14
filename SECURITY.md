# AURA Security & Privacy

AURA is a personal, local-first Spotify companion. It is not an official Spotify client, and its desktop packages are currently **unsigned development builds**.

## Security boundaries
- Node API listens only on `127.0.0.1:4373` (no public or LAN bind).
- HTTP server enforces Origin/Host restrictions and a per-session CSRF token on all state-changing requests.
- Spotify sign-in uses official OAuth PKCE, with system-browser navigation and strict state verification. No Spotify password is collected by AURA.
- Soloist API key, OAuth refresh/access tokens, pinned mixes, playback cache and logs are kept outside the source repo in `~/.aura-music`; sensitive files use restrictive user-only permissions. AURA does not publish these.
- Native Electron uses sandboxed renderer, context isolation, disabled Node integration and strict localhost navigation / official Spotify external-link allowlisting. Other links are not opened by the native shell.
- Linux MPRIS media-control adapter registers only on the user's D-Bus session. It exposes track metadata/controls to the local desktop and maps commands through AURA's localhost API with CSRF; it never stores tokens.
- Linux audio service uses user-level PipeWire/PulseAudio routing; it never modifies system-wide audio configuration or ROS installation.
- Source-only Git commits and release zips deliberately exclude proprietary Soloist binaries, private credentials, audio and locally recorded diagnostic samples.

## Privacy and access
The Spotify account is genuine and retains the underlying data and Spotify recommendations. User-created playlists and library modifications require explicit UI action/confirmation. Saved-pins backups contain playlist names and Spotify URIs only, not tokens or downloaded music.

## Known limitations before v1.0
- Credentials are local restricted plaintext, **not OS-keychain encrypted**, and same-user software with filesystem access may read them.
- Electron package currently uses `asar:false` and is unsigned. Before distributing widely, reconsider archive and file integrity hardening and code signing.
- Linux MPRIS exposes playback controls on the user D-Bus (normal desktop music-player behavior). Other applications running as the same user can control playback.
- Windows binaries have only been cross-built on Linux; Windows runtime setup/permissions and Soloist native playback need direct validation.
- Spotify's proprietary algorithms, social features, licensed lyrics and some editorial content cannot be reproduced by unrestricted Spotify developer APIs. Never claim their native availability in AURA.
- Periodic health monitoring is read-only and does not perform coding, account mutations or silent playback changes.

## Reporting or fixing
Use `npm test`, `npm run test:browser`, and `bash scripts/doctor-linux.sh`. Do not attach or paste `~/.aura-music/soloist-key`, `~/.aura-music/tokens.json`, or any third-party credentials to bug reports. For account compromise, use Spotify's official security controls and revoke affected access tokens.

This file documents current local implementation only; it is not an independent security audit.
