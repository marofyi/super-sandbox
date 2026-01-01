#!/bin/bash
# ABOUTME: Creates a data: URL from an HTML file
# ABOUTME: Output can be pasted directly into browser address bar

FILE="${1:-viewer-v5.html}"
ENCODED=$(cat "$FILE" | base64 -w0)
echo "data:text/html;base64,$ENCODED"
