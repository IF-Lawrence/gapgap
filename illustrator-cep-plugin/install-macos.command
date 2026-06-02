#!/bin/bash
set -e

EXTENSION_ID="com.gapgap.illustrator.cep"
EXTENSION_NAME="GapGap"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_ROOT="$HOME/Library/Application Support/Adobe/CEP/extensions"
TARGET_DIR="$TARGET_ROOT/$EXTENSION_ID"

echo "Installing $EXTENSION_NAME for Adobe Illustrator..."
mkdir -p "$TARGET_ROOT"

if [ -L "$TARGET_DIR" ] || [ -d "$TARGET_DIR" ]; then
  rm -rf "$TARGET_DIR"
fi

cp -R "$SOURCE_DIR" "$TARGET_DIR"
rm -f "$TARGET_DIR/install-macos.command"

for version in 9 10 11 12 13; do
  defaults write "com.adobe.CSXS.$version" PlayerDebugMode 1
done
killall cfprefsd >/dev/null 2>&1 || true

echo ""
echo "$EXTENSION_NAME installed."
echo "Restart Illustrator, then open Window > Extensions > $EXTENSION_NAME."
echo ""
read -n 1 -s -r -p "Press any key to close this window."
echo ""
