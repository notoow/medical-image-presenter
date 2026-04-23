# GitHub Pages Setup

This app is configured for GitHub Pages through GitHub Actions.

## One-time GitHub Settings

After pushing this project to GitHub:

1. Open the repository on GitHub.
2. Go to `Settings` > `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to the `main` branch.
5. Open the `Actions` tab and wait for `Deploy GitHub Pages` to finish.

The final site URL will usually look like:

```text
https://YOUR_GITHUB_USERNAME.github.io/medical-image-presenter/
```

If the repository name is different, GitHub will use that repository name in
the URL.

## Local Commands

Install dependencies:

```powershell
.\install.ps1
```

Run locally:

```powershell
.\dev.ps1
```

Build locally:

```powershell
$env:Path = "$PWD\.tools\node;$env:Path"
.\.tools\node\npm.cmd run build
```

## Privacy Note

GitHub Pages serves the app code publicly if the repository or Pages site is
public. The selected clinical photos are still loaded from the local browser and
are not uploaded by this app.

Do not commit real patient photos, logos, or confidential hospital materials to
the repository unless the repository visibility and permissions are appropriate.
