#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# desktop-release-build.sh — Build CapTuto.app for release and create DMG
#
# Usage:
#   ./scripts/desktop-release-build.sh [--version X.Y.Z] [--sign] [--notarize]
#
# Outputs:
#   apps/desktop/VibeTuto/.build/release/CapTuto-vX.Y.Z.dmg
# =============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/apps/desktop/VibeTuto"
BUILD_DIR="$DESKTOP_DIR/.build/release"
DERIVED_DATA="$DESKTOP_DIR/.build/DerivedData-Release"
PROJECT_NAME="VibeTuto"
SCHEME_NAME="VibeTuto"
APP_NAME="CapTuto"
TEAM_ID="K28B69CWQ7"

# Defaults
VERSION=""
SIGN=false
NOTARIZE=false

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --sign) SIGN=true; shift ;;
    --notarize) NOTARIZE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# If no version given, read from Info.plist
if [ -z "$VERSION" ]; then
  VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" \
    "$DESKTOP_DIR/Resources/Info.plist")
fi

echo "=== Building $APP_NAME v$VERSION (Release) ==="

# Step 0: Install xcodegen if needed
if ! command -v xcodegen &>/dev/null; then
  echo "Installing xcodegen..."
  brew install xcodegen
fi

# Step 1: Regenerate Xcode project
cd "$DESKTOP_DIR"
xcodegen generate

# Step 2: Build Release configuration
echo "Building Release configuration..."
mkdir -p "$BUILD_DIR"

if [ "$SIGN" = true ]; then
  # List available identities for debugging
  echo "Available codesigning identities:"
  security find-identity -v -p codesigning || true

  CERT_ID="${DEVELOPER_ID_APPLICATION:-}"
  if [ -z "$CERT_ID" ]; then
    # Try Developer ID Application first, then any codesigning identity
    # Use || true to avoid pipefail exit when grep finds no match
    CERT_ID=$(security find-identity -v -p codesigning | \
      { grep "Developer ID Application" || true; } | head -1 | awk '{print $2}')
  fi
  if [ -z "$CERT_ID" ]; then
    CERT_ID=$(security find-identity -v -p codesigning | \
      { grep -v "CSSMERR" || true; } | { grep -v "^$" || true; } | \
      { grep -v "valid identities found" || true; } | head -1 | awk '{print $2}')
  fi
  if [ -z "$CERT_ID" ]; then
    echo "ERROR: No codesigning certificate found"
    echo "For CI, set DEVELOPER_ID_APPLICATION env var or import a certificate"
    exit 1
  fi
  echo "Using certificate: $CERT_ID"

  xcodebuild \
    -project "$PROJECT_NAME.xcodeproj" \
    -scheme "$SCHEME_NAME" \
    -configuration Release \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGN_STYLE=Manual \
    "CODE_SIGN_IDENTITY=$CERT_ID" \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    build
else
  xcodebuild \
    -project "$PROJECT_NAME.xcodeproj" \
    -scheme "$SCHEME_NAME" \
    -configuration Release \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGN_IDENTITY="-" \
    CODE_SIGNING_REQUIRED=NO \
    build
fi

# Step 3: Locate the built .app
APP_PATH=$(find "$DERIVED_DATA" -name "$APP_NAME.app" -type d -maxdepth 6 | head -1)
if [ -z "$APP_PATH" ]; then
  echo "ERROR: Build succeeded but app bundle not found"
  exit 1
fi

# Copy to release dir
rm -rf "$BUILD_DIR/$APP_NAME.app"
cp -R "$APP_PATH" "$BUILD_DIR/$APP_NAME.app"

# Step 4: Re-sign if requested
if [ "$SIGN" = true ]; then
  echo "Signing app bundle..."
  codesign --force --deep --options runtime --sign "$CERT_ID" \
    --entitlements "$DESKTOP_DIR/VibeTuto.entitlements" \
    "$BUILD_DIR/$APP_NAME.app"

  echo "Verifying signature..."
  codesign --verify --deep --strict "$BUILD_DIR/$APP_NAME.app"
fi

# Step 5: Create DMG
DMG_NAME="CapTuto-v${VERSION}.dmg"
DMG_PATH="$BUILD_DIR/$DMG_NAME"
rm -f "$DMG_PATH"

echo "Creating DMG..."

if command -v create-dmg &>/dev/null; then
  create-dmg \
    --volname "CapTuto" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "$APP_NAME.app" 150 185 \
    --app-drop-link 450 185 \
    --no-internet-enable \
    "$DMG_PATH" \
    "$BUILD_DIR/$APP_NAME.app" || {
      echo "create-dmg failed, falling back to hdiutil..."
      hdiutil create -volname "CapTuto" \
        -srcfolder "$BUILD_DIR/$APP_NAME.app" \
        -ov -format UDZO \
        "$DMG_PATH"
    }
else
  hdiutil create -volname "CapTuto" \
    -srcfolder "$BUILD_DIR/$APP_NAME.app" \
    -ov -format UDZO \
    "$DMG_PATH"
fi

# Step 6: Notarize if requested
if [ "$NOTARIZE" = true ]; then
  echo "Submitting for notarization..."
  xcrun notarytool submit "$DMG_PATH" \
    --apple-id "${APPLE_ID}" \
    --password "${APPLE_APP_SPECIFIC_PASSWORD}" \
    --team-id "$TEAM_ID" \
    --wait

  echo "Stapling notarization ticket..."
  xcrun stapler staple "$DMG_PATH"
fi

echo ""
echo "=== Release build complete ==="
echo "DMG: $DMG_PATH"
echo "Size: $(du -h "$DMG_PATH" | cut -f1)"
