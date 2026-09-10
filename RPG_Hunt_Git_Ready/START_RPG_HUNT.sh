#!/bin/sh
DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$DIR/index.html"
elif command -v sensible-browser >/dev/null 2>&1; then
  sensible-browser "$DIR/index.html"
else
  echo "Bitte index.html in einem modernen Browser öffnen."
fi
