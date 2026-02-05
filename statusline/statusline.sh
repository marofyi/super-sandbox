#!/bin/bash

# Claude Code Status Line
# Displays: Current Dir | Git Branch | Dev Port | Context Usage

INPUT=$(cat)

# Extract values from JSON input
CURRENT_DIR=$(echo "$INPUT" | jq -r '.workspace.current_dir')

# Get git branch
cd "$CURRENT_DIR" 2>/dev/null || true
GIT_BRANCH=$(git --no-optional-locks rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# Directory basename
DIR_NAME="${CURRENT_DIR##*/}"

# Check for dev server port
DEV_PORT=$(cat "$CURRENT_DIR/.claude/.dev-port" 2>/dev/null)

# Calculate context usage (auto-compact triggers at ~75%)
AUTO_COMPACT_THRESHOLD=70
CONTEXT_SIZE=$(echo "$INPUT" | jq -r '.context_window.context_window_size')
USAGE=$(echo "$INPUT" | jq '.context_window.current_usage')
if [ "$USAGE" != "null" ] && [ "$CONTEXT_SIZE" != "null" ] && [ "$CONTEXT_SIZE" != "0" ]; then
    CURRENT_TOKENS=$(echo "$USAGE" | jq '.input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens')
    PERCENT_USED=$((CURRENT_TOKENS * 100 / CONTEXT_SIZE))

    if [ "$PERCENT_USED" -ge "$AUTO_COMPACT_THRESHOLD" ]; then
        CONTEXT_STR="🔴 ${PERCENT_USED}%"
    elif [ "$PERCENT_USED" -ge 50 ]; then
        CONTEXT_STR="🟡 ${PERCENT_USED}%"
    else
        CONTEXT_STR="🟢 ${PERCENT_USED}%"
    fi
else
    CONTEXT_STR="🟢 0%"
fi

# Build output
OUTPUT="📁 $DIR_NAME"

if [ -n "$GIT_BRANCH" ]; then
    OUTPUT="$OUTPUT | 🌿 $GIT_BRANCH"
fi

if [ -n "$DEV_PORT" ]; then
    OUTPUT="$OUTPUT | 🔌 localhost:$DEV_PORT"
fi

OUTPUT="$OUTPUT | $CONTEXT_STR"

printf "%s" "$OUTPUT"
