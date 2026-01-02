#!/usr/bin/env python3
# ABOUTME: PreToolUse hook that blocks bash commands that could exfiltrate secrets
# ABOUTME: Protects against prompt injection attacks targeting GH_TOKEN and other secrets

import json
import re
import sys

# List of sensitive environment variable names to protect
SENSITIVE_VARS = [
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "VERCEL_TOKEN",
    "BROWSERLESS_TOKEN",
    "CODESIGN_MCP_TOKEN",
    # Add pattern for any variable ending in _TOKEN, _KEY, _SECRET, _PASSWORD
]

# Build regex pattern for all sensitive vars
SENSITIVE_VAR_PATTERN = "|".join(SENSITIVE_VARS)

# Patterns that could leak sensitive environment variables
BLOCKED_PATTERNS = [
    # Direct token/key/secret references (covers all sensitive vars)
    (rf'\$({SENSITIVE_VAR_PATTERN})\b', "Direct access to sensitive variable is blocked"),
    (rf'\$\{{({SENSITIVE_VAR_PATTERN})\}}', "Direct access to sensitive variable is blocked"),

    # Generic patterns for any secret-looking variable
    (r'\$[A-Z_]*(_TOKEN|_KEY|_SECRET|_PASSWORD)\b', "Access to secret variable is blocked"),
    (r'\$\{[A-Z_]*(_TOKEN|_KEY|_SECRET|_PASSWORD)\}', "Access to secret variable is blocked"),

    # gh CLI commands that reveal tokens
    (r'\bgh\s+auth\s+token\b', "gh auth token is blocked - it reveals the auth token"),
    (r'\bgh\s+auth\s+status\s+.*--show-token', "gh auth status --show-token is blocked"),

    # Environment dumps - these leak ALL secrets
    (r'^\s*env\s*$', "Bare 'env' command blocked - leaks all secrets"),
    (r'^\s*printenv\s*$', "Bare 'printenv' command blocked - leaks all secrets"),
    (r'\bprintenv\s+\S*(_TOKEN|_KEY|_SECRET|_PASSWORD)', "printenv for secrets is blocked"),

    # Procfs environment access - leaks ALL secrets
    (r'/proc/[^/]*/environ', "Access to /proc/*/environ is blocked - leaks all secrets"),

    # Common exfiltration patterns
    (rf'(curl|wget|nc|netcat).*\$\{{?({SENSITIVE_VAR_PATTERN})', "Exfiltration attempt blocked"),
    (r'(curl|wget|nc|netcat).*\$[A-Z_]*(_TOKEN|_KEY|_SECRET)', "Exfiltration attempt blocked"),

    # base64 encoding of secrets (common obfuscation)
    (rf'base64.*\$\{{?({SENSITIVE_VAR_PATTERN})', "Secret encoding attempt blocked"),
    (rf'\$\{{?({SENSITIVE_VAR_PATTERN}).*\|\s*base64', "Secret encoding attempt blocked"),

    # Reading gh config file (contains token)
    (r'cat.*\.config/gh/hosts\.yml', "Reading gh config is blocked - contains token"),
    (r'cat.*\.config/gh/config\.yml', "Reading gh config is blocked - may contain secrets"),
]

# Additional suspicious patterns that warrant extra scrutiny
SUSPICIOUS_PATTERNS = [
    # These aren't blocked but could be used for attacks
    (r'\beval\b.*\$', "eval with variables - ensure this is intentional"),
    (r'\$\(.*\$\{?[A-Z_]+\}?.*\)', "Command substitution with env var - verify safety"),
]


def check_command(command: str) -> tuple[bool, str]:
    """
    Check if a command contains blocked patterns.
    Returns (blocked: bool, reason: str)
    """
    for pattern, reason in BLOCKED_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True, reason
    return False, ""


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        # If we can't parse input, allow through (fail open for usability)
        # but log the error
        print(f"Warning: Could not parse hook input: {e}", file=sys.stderr)
        sys.exit(0)

    # Extract the command from Bash tool input
    command = input_data.get("tool_input", {}).get("command", "")

    if not command:
        # No command to check, allow through
        sys.exit(0)

    # Check for blocked patterns
    blocked, reason = check_command(command)

    if blocked:
        # Output JSON with deny decision
        response = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"SECURITY: {reason}. This command pattern could leak secrets and has been blocked by the security hook."
            }
        }
        print(json.dumps(response))
        sys.exit(0)

    # Check for suspicious patterns (warn but allow)
    for pattern, warning in SUSPICIOUS_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            print(f"Security notice: {warning}", file=sys.stderr)

    # Allow the command
    sys.exit(0)


if __name__ == "__main__":
    main()
