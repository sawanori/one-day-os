#!/bin/bash
# Phase Tagging Automation Script
# Usage: ./scripts/tag-phase.sh <phase-number> <start|complete>
#
# Examples:
#   ./scripts/tag-phase.sh 0 start
#   ./scripts/tag-phase.sh 1 complete

PHASE=$1
STATUS=$2

# Validation
if [ -z "$PHASE" ] || [ -z "$STATUS" ]; then
  echo "❌ Error: Missing arguments"
  echo ""
  echo "Usage: ./scripts/tag-phase.sh <phase-number> <start|complete>"
  echo ""
  echo "Examples:"
  echo "  ./scripts/tag-phase.sh 0 start"
  echo "  ./scripts/tag-phase.sh 1 complete"
  exit 1
fi

if [ "$STATUS" != "start" ] && [ "$STATUS" != "complete" ]; then
  echo "❌ Error: Status must be 'start' or 'complete'"
  exit 1
fi

# Phase names
get_phase_name() {
  case $1 in
    0) echo "Security Fixes and Infrastructure" ;;
    1) echo "Asset Preparation" ;;
    2) echo "Anti-Vision Bleed" ;;
    3) echo "Death Animation" ;;
    4) echo "Lens Zoom" ;;
    5) echo "Notification Actions" ;;
    6) echo "IdentityEngine v2" ;;
    7) echo "Integration Testing" ;;
    *) echo "Unknown Phase" ;;
  esac
}

TAG_NAME="phase-${PHASE}-${STATUS}"
PHASE_NAME=$(get_phase_name $PHASE)
TAG_MESSAGE="Phase ${PHASE}: ${PHASE_NAME} - ${STATUS^^}"

echo "🏷️  Creating git tag..."
echo "   Tag: $TAG_NAME"
echo "   Message: $TAG_MESSAGE"
echo ""

# Create tag
git tag $TAG_NAME -m "$TAG_MESSAGE"

if [ $? -eq 0 ]; then
  echo "✅ Tag created: $TAG_NAME"
  echo ""
  echo "📌 To push tag to remote:"
  echo "   git push origin $TAG_NAME"
else
  echo "❌ Failed to create tag"
  exit 1
fi
