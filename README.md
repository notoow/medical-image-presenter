# Medical Image Presenter

Local-first presentation tool for clinical before/after case photos.

This first prototype is intentionally static: open `index.html` in a browser and
load images from the local computer. Images are rendered in the browser only and
are not uploaded to a server.

## Current prototype

- Cover slide with title, subtitle, hospital name, presenter, and logo.
- Multiple image upload.
- Sort by file name or modified date.
- Single, 2-up, and 3-up page layouts.
- 16:9 presentation viewport.
- Blurred background fill for portrait photos and letterboxed images.
- Batch brightness, contrast, saturation, and hue controls.
- Presentation-style keyboard shortcuts.

## Run Locally

Install the project-local Node/npm runtime and dependencies:

```powershell
.\install.ps1
```

Start the development server:

```powershell
.\dev.ps1
```

Install project-local Git:

```powershell
.\install-git.ps1
```

Run Git commands through the project-local Git wrapper:

```powershell
.\git.ps1 status
```

## GitHub Pages

This project includes a GitHub Actions workflow for GitHub Pages deployment.

After pushing to GitHub, set the repository's Pages source to `GitHub Actions`
in `Settings` > `Pages`, then push to the `main` branch.

See `docs/github-pages.md` for the full setup checklist.

## Keyboard shortcuts

- `ArrowLeft`: previous page
- `ArrowRight` / `Space`: next page
- `Enter`: toggle blurred background fill
- `F`: fit image to slide
- `Shift + F`: fill image area
- `+` / `-`: zoom
- `0`: reset zoom
- `C`: cover slide

## Suggested next steps

See `docs/planning.md` for the full product plan and implementation roadmap.
