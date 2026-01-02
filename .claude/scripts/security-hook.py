#!/usr/bin/env python3
# ABOUTME: PreToolUse hook that blocks bash commands that could exfiltrate secrets
# ABOUTME: Protects against prompt injection attacks targeting GH_TOKEN and other secrets

import json
import re
import sys

# List of sensitive environment variable names to protect
# Note: Only these tokens are in CC Web env (minimal token surface)
SENSITIVE_VARS = [
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "BROWSERLESS_TOKEN",
    "CODESIGN_MCP_TOKEN",
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
    # Bare commands or with any arguments/pipes
    (r'\benv\b(?!\s+\S+=)', "'env' command blocked - leaks all secrets"),
    (r'\bprintenv\b', "'printenv' command blocked - leaks all secrets"),

    # Shell built-ins that dump environment variables
    (r'(?:^|\s|;|&&|\|\||`)set(?:\s*$|\s*[;&|]|\s*\))', "'set' command blocked - dumps all variables"),
    (r'(?:^|\s|;|&&|\|\||`)export(?:\s*$|\s*[;&|]|\s*\))', "Bare 'export' blocked - lists exported vars"),
    (r'\bdeclare\s+-p\b', "'declare -p' blocked - dumps all variables"),
    (r'\bcompgen\s+-v\b', "'compgen -v' blocked - lists all variable names"),
    (r'(?:^|\s|;|&&|\|\||`)typeset(?:\s*$|\s*[;&|]|\s*\))', "'typeset' blocked - dumps all variables"),

    # Subshell environment dumps
    (r'\b(bash|sh|zsh|ksh)\s+(-c\s+)?["\']?(set|export|declare|typeset|compgen)', "Subshell env dump blocked"),

    # Procfs environment access - leaks ALL secrets
    (r'/proc/[^/]*/environ', "Access to /proc/*/environ is blocked - leaks all secrets"),

    # Common exfiltration patterns
    (rf'(curl|wget|nc|netcat).*\$\{{?({SENSITIVE_VAR_PATTERN})', "Exfiltration attempt blocked"),
    (r'(curl|wget|nc|netcat).*\$[A-Z_]*(_TOKEN|_KEY|_SECRET)', "Exfiltration attempt blocked"),

    # base64 encoding of secrets (common obfuscation)
    (rf'base64.*\$\{{?({SENSITIVE_VAR_PATTERN})', "Secret encoding attempt blocked"),
    (rf'\$\{{?({SENSITIVE_VAR_PATTERN}).*\|\s*base64', "Secret encoding attempt blocked"),

    # Reading gh config file (contains token) - block ALL file readers
    (r'(cat|less|more|head|tail|view|vim|vi|nano|emacs)[\s\'\"]+.*\.config/gh/', "Reading gh config is blocked - contains token"),
    (r'(awk|sed|grep|xargs|xxd|od|strings|hexdump).*\.config/gh/', "Reading gh config is blocked - contains token"),
    (r'\bdd\b.*\.config/gh/', "'dd' on gh config blocked - contains token"),
    (r'(cp|mv|ln).*\.config/gh/.*\s+\S', "Copying gh config is blocked - contains token"),
    (r'base64\s+.*\.config/gh/', "Encoding gh config is blocked - contains token"),
    (r'[<>].*\.config/gh/', "File redirection with gh config blocked - contains token"),

    # Language-level environment access
    (r'\bpython[23]?\b.*\bos\.environ\b', "Python os.environ access blocked - leaks secrets"),
    (r'\bpython[23]?\b.*\bos\.getenv\b', "Python os.getenv blocked - can leak secrets"),
    (r'\bnode\b.*\bprocess\.env\b', "Node process.env access blocked - leaks secrets"),
    (r'\bruby\b.*\bENV\b', "Ruby ENV access blocked - leaks secrets"),
    (r'\bperl\b.*%ENV\b', "Perl %ENV access blocked - leaks secrets"),
    (r'\bphp\b.*\bgetenv\b', "PHP getenv() access blocked - leaks secrets"),
    (r'\bphp\b.*\$_ENV\b', "PHP $_ENV access blocked - leaks secrets"),

    # Advanced bypass attempts
    (r'\$\{![^}]+\}', "Indirect variable expansion blocked - could access secrets"),
    (r'\bexec\s+\d+[<>]', "File descriptor manipulation blocked - could read secrets"),
    (r'source\s+.*\.config/gh/', "Sourcing gh config blocked - contains token"),
    (r'\.\s+.*\.config/gh/', "Dot-sourcing gh config blocked - contains token"),
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
