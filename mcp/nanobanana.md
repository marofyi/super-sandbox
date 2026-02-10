# Nanobanana MCP - Image Generation

Nanobanana is a Gemini CLI extension that provides powerful image generation, editing, and manipulation tools using Google's Gemini models.

## Tools Available (7)

| Tool | Description |
|------|-------------|
| `generate_image` | Text-to-image with styles, variations, batching |
| `edit_image` | Natural language image editing |
| `restore_image` | Photo restoration and enhancement |
| `generate_icon` | App icons, favicons in multiple sizes |
| `generate_pattern` | Seamless patterns and textures |
| `generate_story` | Sequential image narratives (2-8 images) |
| `generate_diagram` | Flowcharts, architecture, wireframes |

## Setup

### 1. Get a Gemini API Key (Free)

1. Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

### 2. Add to Claude Code Settings

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "nanobanana": {
      "command": "npx",
      "args": ["-y", "github:gemini-cli-extensions/nanobanana/mcp-server"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 3. Restart Claude Code

The tools will be available immediately.

## Model Selection

**Default:** `gemini-2.5-flash-image` (fast, efficient)

**Pro quality:** Set environment variable:
```bash
export NANOBANANA_MODEL=gemini-3-pro-image-preview
```

Or add to the MCP config:
```json
"env": {
  "GEMINI_API_KEY": "your-key",
  "NANOBANANA_MODEL": "gemini-3-pro-image-preview"
}
```

## Usage Examples

### Generate Images

```
Create a watercolor painting of a fox in a snowy forest
```

With variations:
```
Generate 4 versions of a mountain landscape in different styles: watercolor, oil painting, sketch, photorealistic
```

### Edit Images

```
Edit sunset.png: add dramatic clouds to the sky
```

### Generate Icons

```
Create app icons for a coffee shop app in sizes 64, 128, 256, 512
```

### Create Diagrams

```
Generate a flowchart showing user authentication flow with OAuth
```

### Generate Stories

```
Create a 5-step visual tutorial showing how to make pour-over coffee
```

## Output

Images are saved to `./nanobanana-output/` with auto-generated filenames based on your prompt.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No API key found" | Check `GEMINI_API_KEY` is set |
| "Model not available" | Use default model or check API access |
| Images not saving | Check write permissions in current directory |

## Source

- GitHub: [gemini-cli-extensions/nanobanana](https://github.com/gemini-cli-extensions/nanobanana)
- License: Apache 2.0

---

[Back to README](../README.md) | [SETUP.md](../SETUP.md)
