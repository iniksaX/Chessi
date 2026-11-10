#!/bin/bash
# Chessi — launch the offline chess app in the system web browser.
HERE="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
URL="file://$HERE/chessi.html"
for cmd in xdg-open sensible-browser x-www-browser gnome-open kde-open firefox-esr firefox chromium chromium-browser google-chrome-stable google-chrome epiphany midori; do
    if command -v "$cmd" >/dev/null 2>&1; then
        exec "$cmd" "$URL"
    fi
done
echo "Chessi: no web browser found." >&2
echo "Open this file manually in any browser:" >&2
echo "  $HERE/chessi.html" >&2
exit 1
