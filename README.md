# Userscripts Collection

A collection of Tampermonkey userscripts to enhance your GitHub experience.

## Setup Instructions

### Installing Tampermonkey

1. Install the [Tampermonkey extension](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) for Chrome
2. Click the Tampermonkey icon in your browser toolbar to verify installation

### Chrome Configuration (Required for Tampermonkey 5.3+)

Chrome requires enabling **one** of the following options:

**Option 1: "Allow User Scripts" Toggle (Chrome/Edge 138+)**
1. Right-click the Tampermonkey icon
2. Select **"Manage Extension"**
3. Enable the **"Allow User Scripts"** toggle

**Option 2: Developer Mode (All Chrome/Edge versions)**
1. Navigate to `chrome://extensions` in a new tab
2. Enable **"Developer Mode"** by clicking the toggle at the top right

> **Why?** Google requires this two-step authorization to ensure users make informed decisions when running userscript extensions. See [Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php#Q209) for details.

### Installing a Script
Click on the "Raw Script" link below. You should be redirected to an installation page

---

## Available Userscripts

### GitHub Action Reference Linker

**[Raw Script](https://raw.githubusercontent.com/clarkbains/userscripts/master/action-linker.user.js)**

Automatically converts GitHub Action references into clickable links across GitHub.

**What it does:**
- Converts patterns like `actions/checkout@v4` into clickable links
- Works in file viewers, diffs, PRs, and comments
- Preserves syntax highlighting and colors
- Shows pointer cursor when hovering over clickable references

**Example - Try this after installing:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: docker/build-push-action@v5
      - uses: your-org/custom-action/.github/actions/deploy@main
```

Click on `actions/checkout@v4` → Opens `https://github.com/actions/checkout/tree/v4`

**Supported patterns:**
- `org/repo@branch`
- `org/repo/path/to/action@v1.2.3`
- `actions/checkout@8f4b7f84` (commit SHA)

---

## Updates

All scripts are configured to auto-update from this repository. Tampermonkey checks for updates daily.

## Troubleshooting

- **Script not working?** 
  - Verify Tampermonkey is enabled (icon should show script count)
  - Check that **Developer Mode** is enabled at `chrome://extensions`
- **Need to reload?** Refresh the GitHub page after installing
- **Check logs**: Open browser console (F12) to see script activity
