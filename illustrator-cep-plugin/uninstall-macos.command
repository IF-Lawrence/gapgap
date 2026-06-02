#!/bin/bash
set -e

EXTENSION_ID="com.gapgap.illustrator.cep"
TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXTENSION_ID"

echo "Uninstalling GapGap..."
rm -rf "$TARGET_DIR"

echo ""
echo "GapGap removed. Restart Illustrator if it is currently open."
echo ""
read -n 1 -s -r -p "Press any key to close this window."
echo ""
