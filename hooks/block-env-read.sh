#!/bin/bash
# Claude Code Hook: Block reading .env files
# This prevents accidentally sending API keys to cloud LLM services
#
# Exit codes:
#   0 = Allow the read
#   2 = Block the read (shows error to Claude)

# Read JSON input from stdin
INPUT=$(cat)

# Extract file_path from tool_input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# Check if the file path contains .env (matches .env, .env.local, .env.production, etc.)
if echo "$FILE_PATH" | grep -qE '\.env($|\.)'; then
  echo "BLOCKED: Reading .env files is not allowed to prevent API key exposure." >&2
  echo "File: $FILE_PATH" >&2
  exit 2
fi

# Allow all other reads
exit 0
