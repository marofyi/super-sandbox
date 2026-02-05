#!/usr/bin/env python3
"""
Hook to protect iCloud Drive from ALL Claude Code access.
Protects: ~/Library/Mobile Documents/com~apple~CloudDocs/

This is a PreToolUse hook that intercepts Bash, Read, and Glob tools before execution
and blocks any operations that would access iCloud Drive (read or write).

Behavior:
- In normal mode: prompts user for confirmation ("ask")
- In bypass mode: uses exit code 2 to hard-block (most reliable method)
"""

import json
import sys
import os
import re

# =============================================================================
# CONFIGURATION
# =============================================================================
# In normal permission modes, use "ask" to prompt or "deny" to block.
# In bypass mode, we always hard-block using exit code 2 (cannot be bypassed).
NORMAL_MODE_ACTION = "ask"  # Options: "ask" or "deny"
# =============================================================================

# iCloud Drive paths on macOS
HOME = os.path.expanduser("~")
ICLOUD_PATHS = [
    "Library/Mobile Documents/com~apple~CloudDocs",
    "Library/Mobile Documents",
    "iCloud Drive",  # Symlink some users have
    "CloudDocs",     # Catch partial matches
]

# Absolute path prefixes for iCloud (for Read/Glob tool checking)
ICLOUD_ABSOLUTE_PATHS = [
    os.path.join(HOME, "Library/Mobile Documents"),
    "/Users/*/Library/Mobile Documents",
]

# Patterns that indicate file reading operations in Bash
READ_PATTERNS = [
    r'\bcat\b',          # cat command
    r'\bhead\b',         # head command
    r'\btail\b',         # tail command
    r'\bless\b',         # less pager
    r'\bmore\b',         # more pager
    r'\bbat\b',          # bat (cat alternative)
    r'\bgrep\b',         # grep
    r'\brg\b',           # ripgrep
    r'\bag\b',           # silver searcher
    r'\back\b',          # ack
    r'\bfind\b',         # find command
    r'\bfd\b',           # fd (find alternative)
    r'\bls\b',           # ls command
    r'\bexa\b',          # exa (ls alternative)
    r'\blsd\b',          # lsd (ls alternative)
    r'\btree\b',         # tree command
    r'\bstat\b',         # stat command
    r'\bfile\b',         # file command
    r'\bwc\b',           # word count
    r'\bdu\b',           # disk usage
    r'\bopen\b',         # open command (macOS)
    r'\bcode\b',         # VS Code
    r'\bvim\b',          # vim
    r'\bnvim\b',         # neovim
    r'\bnano\b',         # nano
    r'\bsed\b',          # sed (can read)
    r'\bawk\b',          # awk (can read)
    r'\bperl\b',         # perl (can read)
    r'\bpython\b',       # python (can read)
    r'\bruby\b',         # ruby (can read)
    r'\bnode\b',         # node (can read)
    r'\bxargs\b',        # xargs (often used with find)
    r'\bdiff\b',         # diff command
    r'\bmd5\b',          # md5 checksum
    r'\bshasum\b',       # shasum checksum
    r'\bxxd\b',          # hex dump
    r'\bhexdump\b',      # hex dump
    r'\bod\b',           # octal dump
    r'\bstrings\b',      # strings command
    r'\bjq\b',           # jq (JSON processing)
    r'\byq\b',           # yq (YAML processing)
    r'<\s*[~/]',         # Input redirection from file
]

# Patterns that indicate file deletion or destructive operations
DESTRUCTIVE_PATTERNS = [
    r'\brm\b',           # rm command
    r'\brmdir\b',        # rmdir command
    r'\bunlink\b',       # unlink command
    r'\btrash\b',        # macOS trash command
    r'\bsrm\b',          # secure rm
    r'\bshred\b',        # shred files
    r'\bwipe\b',         # wipe files
    r'>\s*/dev/null',    # Redirect to /dev/null (when mv target)
]

# Patterns that could modify/overwrite files destructively
MODIFY_PATTERNS = [
    r'\bmv\b',           # mv could overwrite or move away
    r'>\s*~',            # Redirect overwriting home files
    r'>\s*/',            # Redirect overwriting absolute paths
]


def contains_icloud_reference(text: str) -> bool:
    """Check if text references iCloud Drive paths."""
    text_lower = text.lower()

    for icloud_path in ICLOUD_PATHS:
        # Check various formats the path might appear in
        if icloud_path.lower() in text_lower:
            return True
        # Handle escaped spaces (common in shell commands)
        escaped = icloud_path.replace(" ", "\\ ")
        if escaped.lower() in text_lower:
            return True
        # Handle quoted paths
        if icloud_path.replace(" ", " ") in text:  # Original with spaces
            return True

    # Also check for the literal tilde path
    if "~/library/mobile documents" in text_lower:
        return True
    if "~/icloud" in text_lower:
        return True

    return False


def has_destructive_pattern(command: str) -> bool:
    """Check if command contains destructive patterns."""
    for pattern in DESTRUCTIVE_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True
    return False


def has_modify_pattern(command: str) -> bool:
    """Check if command contains modification patterns."""
    for pattern in MODIFY_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True
    return False


def has_read_pattern(command: str) -> bool:
    """Check if command contains read patterns."""
    for pattern in READ_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True
    return False


def is_icloud_path(path: str) -> bool:
    """Check if an absolute path is within iCloud Drive."""
    if not path:
        return False

    # Expand ~ to home directory
    expanded_path = os.path.expanduser(path)

    # Check against absolute iCloud paths
    icloud_base = os.path.join(HOME, "Library/Mobile Documents")
    if expanded_path.startswith(icloud_base):
        return True

    # Also check the text for iCloud references (handles various formats)
    return contains_icloud_reference(path)


def is_dangerous_icloud_operation(command: str) -> tuple[bool, str]:
    """
    Analyze Bash command for any iCloud Drive operations.
    Returns (is_dangerous, reason).
    """
    if not contains_icloud_reference(command):
        return False, ""

    # Check for destructive commands (always block)
    if has_destructive_pattern(command):
        return True, "deletion or destructive operation"

    # Check for mv commands that could move files out of iCloud
    # or overwrite iCloud files
    if has_modify_pattern(command):
        # mv is dangerous if iCloud is source (moving away) or target (overwriting)
        if re.search(r'\bmv\b', command, re.IGNORECASE):
            return True, "move operation that could relocate or overwrite files"

    # Check for read operations (block all reads too)
    if has_read_pattern(command):
        return True, "read operation"

    # Block any other command that references iCloud (catch-all for safety)
    return True, "operation referencing iCloud Drive"


def block_access(reason: str, is_bypass_mode: bool):
    """Block access with appropriate response based on mode."""
    block_message = (
        f"BLOCKED: Cannot perform {reason} in iCloud Drive. "
        f"Protected path: ~/Library/Mobile Documents/com~apple~CloudDocs/. "
        f"Perform this operation manually if needed."
    )

    if is_bypass_mode:
        # In bypass mode, use exit code 2 to hard-block
        # This is the most reliable method - stderr is shown to Claude
        print(block_message, file=sys.stderr)
        sys.exit(2)
    else:
        # In normal mode, use JSON response with configured action
        if NORMAL_MODE_ACTION == "ask":
            message = (
                f"iCloud Drive protection: This would perform a {reason}. "
                f"Are you sure you want to allow this?"
            )
        else:
            message = block_message

        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": NORMAL_MODE_ACTION,
                "permissionDecisionReason": message
            }
        }
        print(json.dumps(output))
        sys.exit(0)


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # If we can't parse input, allow the command (fail open for usability)
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Check the current permission mode
    permission_mode = input_data.get("permission_mode", "default")
    is_bypass_mode = permission_mode == "bypassPermissions"

    # Handle Bash tool
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        if not command:
            sys.exit(0)

        is_dangerous, reason = is_dangerous_icloud_operation(command)
        if is_dangerous:
            block_access(reason, is_bypass_mode)

    # Handle Read tool
    elif tool_name == "Read":
        file_path = tool_input.get("file_path", "")
        if is_icloud_path(file_path):
            block_access("file read", is_bypass_mode)

    # Handle Glob tool
    elif tool_name == "Glob":
        # Check both path and pattern for iCloud references
        glob_path = tool_input.get("path", "")
        glob_pattern = tool_input.get("pattern", "")

        if is_icloud_path(glob_path) or contains_icloud_reference(glob_pattern):
            block_access("file search", is_bypass_mode)

    # Handle Grep tool
    elif tool_name == "Grep":
        grep_path = tool_input.get("path", "")
        if is_icloud_path(grep_path):
            block_access("content search", is_bypass_mode)

    # Handle Write tool
    elif tool_name == "Write":
        file_path = tool_input.get("file_path", "")
        if is_icloud_path(file_path):
            block_access("file write", is_bypass_mode)

    # Handle Edit tool
    elif tool_name == "Edit":
        file_path = tool_input.get("file_path", "")
        if is_icloud_path(file_path):
            block_access("file edit", is_bypass_mode)

    # Allow all other tools/commands
    sys.exit(0)


if __name__ == "__main__":
    main()
