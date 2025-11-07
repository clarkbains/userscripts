# GitHub Action Reference Linker

A Tampermonkey userscript that automatically converts GitHub Action references (like `actions/checkout@v4` or `org/repo/path@branch`) into clickable links on GitHub.

## What It Does

- **Diffs & PRs**: Converts action references to clickable links that preserve syntax highlighting
- **File Viewer**: Makes action references clickable in readonly file viewers
- **Smart Detection**: Works across fragmented text and preserves original colors
- **Non-Intrusive**: Skips editable areas so you can paste code without interference

## Quick Install

### 1. Install Tampermonkey
Install the [Tampermonkey extension](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) for Chrome.

### 2. Install the Userscript
**[Click here to install](https://raw.githubusercontent.com/clarkbains/userscripts/master/action-linker.js)** - Tampermonkey will prompt you to install it.

Or manually:
1. Click the Tampermonkey icon → Dashboard
2. Click the **+** tab (Create a new script)
3. Paste the script from [action-linker.js](https://raw.githubusercontent.com/clarkbains/userscripts/master/action-linker.js)
4. Save (Ctrl+S or Cmd+S)

### 3. Test It Out

Navigate to any GitHub file or PR, paste this example workflow, and click on the action references:

```yaml
name: Example Workflow
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: docker/build-push-action@v5
      - uses: your-org/custom-action/.github/actions/deploy@main
```

Click on any reference like `actions/checkout@v4` and it will open `https://github.com/actions/checkout/tree/v4`!

## Features

✅ Works in file viewer, diffs, PRs, and comments  
✅ Handles fragmented text (when GitHub splits references across elements)  
✅ Preserves syntax highlighting colors  
✅ Smart cursor: Shows pointer when hovering over clickable references  
✅ Auto-updates from GitHub repository  

## Pattern Support

Matches patterns like:
- `org/repo@branch`
- `org/repo/path/to/action@v1.2.3`
- `actions/checkout@8f4b7f84` (with commit SHA)

---

**Tip**: The script auto-updates daily. Bump the version in the repo to push updates to all users!
