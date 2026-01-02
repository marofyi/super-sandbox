#!/usr/bin/env python3
# ABOUTME: PreToolUse hook that blocks bash commands that could exfiltrate secrets
# ABOUTME: Protects against prompt injection attacks targeting GH_TOKEN and other secrets

import json
import re
import sys

# Patterns that could leak sensitive environment variables
BLOCKED_PATTERNS = [
    # Direct token references
    (r'\$GH_TOKEN\b', "Direct access to GH_TOKEN is blocked"),
    (r'\$\{GH_TOKEN\}', "Direct access to GH_TOKEN is blocked"),
    (r'\$GITHUB_TOKEN\b', "Direct access to GITHUB_TOKEN is blocked"),
    (r'\$\{GITHUB_TOKEN\}', "Direct access to GITHUB_TOKEN is blocked"),

    # gh CLI commands that reveal tokens
    (r'\bgh\s+auth\s+token\b', "gh auth token is blocked - it reveals the auth token"),
    (r'\bgh\s+auth\s+status\s+.*--show-token', "gh auth status --show-token is blocked"),

    # Environment dumps (but allow filtered/safe versions)
    (r'^\s*env\s*$', "Bare 'env' command blocked - could leak secrets"),
    (r'^\s*printenv\s*$', "Bare 'printenv' command blocked - could leak secrets"),
    (r'\bprintenv\s+(GH_TOKEN|GITHUB_TOKEN)', "printenv for tokens is blocked"),

    # Procfs environment access
    (r'/proc/[^/]*/environ', "Access to /proc/*/environ is blocked - could leak secrets"),

    # Common exfiltration patterns with tokens
    (r'(curl|wget|nc|netcat).*\$\{?(GH_TOKEN|GITHUB_TOKEN)', "Exfiltration attempt blocked"),

    # base64 encoding of tokens (common obfuscation)
    (r'base64.*\$\{?(GH_TOKEN|GITHUB_TOKEN)', "Token encoding attempt blocked"),
    (r'\$\{?(GH_TOKEN|GITHUB_TOKEN).*\|\s*base64', "Token encoding attempt blocked"),
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
