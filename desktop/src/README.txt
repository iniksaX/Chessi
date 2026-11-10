Chessi 1.0.0 — chess, 100% offline
==================================

Chessi is a fully self-contained chess app: one HTML file with the engine
(Stockfish 19 lite, WASM), 50 bots of increasing strength, game review with
move classifications, 40 puzzles, local accounts and board themes. No
installer, no accounts, no network — it works with Wi-Fi/data off.

WINDOWS (Chessi-1.0.0-windows-x64.exe  /  Chessi-1.0.0-win-x64.zip)
-------------------------------------------------------------------
  Option A - single file: double-click Chessi-1.0.0-windows-x64.exe.
  The app is embedded inside the .exe; it extracts chessi-1.0.0.html to
  %TEMP%\Chessi\ and opens it in your default browser. Nothing is
  installed, nothing is sent anywhere.

  Option B - portable folder: unzip Chessi-1.0.0-win-x64.zip anywhere,
  keep all files together, double-click Chessi.exe.

  Windows SmartScreen may warn that the app is unsigned/unknown — it is
  built from the open source at https://github.com/iniksaX/Chessi and is
  safe. You can also just open chessi.html directly in any browser.

LINUX (Chessi-1.0.0-x86_64.AppImage  /  Chessi-1.0.0-linux-x64.tar.gz)
----------------------------------------------------------------------
  AppImage:  chmod +x Chessi-1.0.0-x86_64.AppImage
             ./Chessi-1.0.0-x86_64.AppImage
  If FUSE is not available on your system:
             ./Chessi-1.0.0-x86_64.AppImage --appimage-extract-and-run

  tar.gz:    tar -xzf Chessi-1.0.0-linux-x64.tar.gz
             ./Chessi-1.0.0-linux-x64/chessi.sh

  Both launch the app in your default browser (xdg-open). Requires any
  modern browser. --appimage-extract extracts the content without running it.

ANDROID
-------
  chessi-1.0.0.apk (see the same GitHub release) — install directly on
  Android 7.0+ (minSdk 24). Self-signed; Android will warn about the
  unknown developer, which is expected.

VERIFYING YOUR DOWNLOAD
-----------------------
  sha256sum is the only tool you need. Expected hashes are in the release
  notes: https://github.com/iniksaX/Chessi/releases/tag/v1.0.0

LICENSE
-------
  See LICENSE (MIT). Source: https://github.com/iniksaX/Chessi
