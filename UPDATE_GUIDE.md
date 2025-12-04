# Auto-Update Setup Guide

## Overview
The Tauri Updater plugin is now configured. Here's how to complete the setup:

## Steps to Enable Auto-Updates

### 1. Generate Update Keys
Run this command to generate signing keys:
```bash
npm run tauri signer generate
```
This will create:
- A **private key** (keep this SECRET and SAFE!)
- A **public key** (add this to tauri.conf.json)

### 2. Update tauri.conf.json
Replace `YOUR_PUBLIC_KEY_HERE` in `tauri.conf.json` with the public key from step 1.

### 3. Create latest.json for GitHub Releases
When you release a new version, create a `latest.json` file with this format:

```json
{
  "version": "0.2.0",
  "notes": "Bug fixes and new features",
  "pub_date": "2024-12-04T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "SIGNATURE_HERE",
      "url": "https://github.com/Seekers747/DataDustOff/releases/download/v0.2.0/DataDustOff_0.2.0_x64-setup.nsis.zip"
    }
  }
}
```

### 4. Sign Your Updates
When building for release:
```bash
npm run tauri build
```

Then sign the installer:
```bash
npm run tauri signer sign path/to/installer.nsis.zip
```
This generates the signature for latest.json.

### 5. GitHub Release Workflow
For each new version:
1. Update version in `package.json`, `Cargo.toml`, and `tauri.conf.json`
2. Build: `npm run tauri build`
3. Sign the NSIS zip file
4. Create GitHub release with:
   - The signed `.nsis.zip` file
   - The `latest.json` file (with signature)
5. Tag it as `v0.X.X`

### 6. Add Update Check to Your App
The updater is initialized in the backend. You can add a "Check for Updates" button in the UI:

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function checkForUpdates() {
  const update = await check();
  if (update?.available) {
    console.log(`Update to ${update.version} available!`);
    await update.downloadAndInstall();
    await relaunch();
  }
}
```

## Alternative: Simple GitHub Releases (No Signing)
If you don't want the complexity of signing, you can:
1. Remove the updater config from `tauri.conf.json`
2. Just upload new installers to GitHub Releases
3. Tell users to download and install manually

## Testing
- Test locally by hosting a fake `latest.json` on localhost
- Temporarily point the endpoint to your test server
- Verify the update flow works before going to production

## Security Note
**NEVER commit your private key to git!** Add it to `.gitignore`.
