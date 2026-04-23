# Medical Image Presenter Planning

## Product Goal

Create a hospital-friendly, local-first web app for preparing and presenting
clinical before/after image cases. The app should feel like a lightweight PPT
deck: upload photos, align them consistently, tune image appearance in batches,
and move through pages with keyboard shortcuts on a 16:9 monitor.

## Core Assumptions

- Primary display target: horizontal 16:9 monitor.
- Many source photos are portrait-oriented.
- Medical images may be sensitive, so the first version should process files
  locally in the browser without server upload.
- Original images should remain untouched. The app stores presentation settings,
  transforms, and filters separately.
- Default sorting should be file name order because hospital case images are
  often named intentionally.

## Initial Information Architecture

```text
medical-image-presenter/
  index.html
  src/
    app.js
    styles.css
  public/
    logos/
      README.md
    sample-images/
      README.md
  docs/
    planning.md
```

## Cover Slide

The cover should support:

- Presentation title.
- Subtitle or case category.
- Hospital name.
- Presenter/doctor name.
- Presentation date.
- Hospital logo.

Logo handling:

- `public/logos/` exists for committed/default hospital logos.
- The app also supports selecting a logo file directly from the browser.
- Future version can support hospital templates and saved logo presets.

## Image Import

The app should support uploading multiple images at once.

Accepted image formats:

- JPG/JPEG
- PNG
- WebP
- GIF where browser-supported

Future consideration:

- Folder upload via `webkitdirectory` for Chrome/Edge.
- Reading EXIF capture date when available.
- Keeping a saved project file with image references and presentation settings.

## Sorting Strategy

Sorting should be selectable, not hard-coded.

Recommended default:

- File name ascending.

Supported initial options:

- File name ascending.
- Modified date ascending.
- Modified date descending.
- Manual order in a future version.

Future automatic pairing:

- Detect `before`, `after`, `pre`, `post`, `전`, `후` in file names.
- Group files by shared case ID.
- Warn when pairing is ambiguous instead of guessing silently.

## Page Layout Strategy

The app should support multiple page types because hospitals present cases in
different styles.

Initial layouts:

- Single image page.
- 2-up comparison page.
- 3-up comparison page.

Recommended default:

- 2-up comparison page for before/after workflows.

Future layouts:

- 2x2 grid.
- 3x2 contact sheet.
- Section title page.
- Mixed custom slide builder.

## Portrait Photo Background

Because most monitors are horizontal 16:9 and many clinical photos are vertical,
the slide should not fall back to a flat black background.

Recommended behavior:

- The same image is rendered behind the main image.
- Background image uses `object-fit: cover`.
- Apply Gaussian blur and slight dark overlay.
- Foreground image remains sharp.
- Toggle background fill with the `Enter` key.

Controls:

- `Enter`: toggle blurred background fill.
- UI button: Background Fill On/Off.
- Keep this separate from foreground image fit/fill.

## Image Fit, Fill, and Zoom

Presentation shortcuts:

- `F`: fit image inside available slide area.
- `Shift + F`: fill image area.
- `+`: zoom in.
- `-`: zoom out.
- `0`: reset zoom.

Design principle:

- Fit/fill affects the sharp foreground image.
- Background fill affects only the blurred background layer.

## Batch Image Adjustments

Initial batch controls:

- Brightness.
- Contrast.
- Saturation.
- Hue.

Future controls:

- Temperature.
- Exposure-like adjustment.
- Gamma.
- Black/white toggle.
- Per-slide override on top of global batch settings.

Important behavior:

- Do not overwrite originals.
- Store filter settings separately.
- Provide a reset button.

## Anatomical Reference Alignment

The alignment feature should be built in phases.

Phase 1: manual reference points

- User clicks two anatomical reference points on each image.
- App aligns position, scale, and rotation based on those two points.
- Show guide lines and optional overlay preview.

Phase 2: assisted detection

- Detect likely reference points using computer vision.
- User confirms or corrects detected points.
- Never silently auto-align without visible correction controls.

Phase 3: reusable case presets

- Save alignment transforms per image.
- Export/import project files.

Why manual first:

- It is more predictable for clinical use.
- It avoids privacy and accuracy risks from premature AI automation.
- It gives the user control when photos vary in pose, crop, lighting, or angle.

## Privacy And Safety

- Keep processing local by default.
- Do not send files to external APIs unless the user explicitly enables that in
  a future version.
- Make it clear when files are only previewed in browser memory.
- Consider a "clear session" button for shared hospital computers.

## MVP Milestones

1. Static local prototype with cover, upload, sort, layouts, filters, and
   keyboard navigation.
2. Save/load presentation state.
3. Manual slide reordering.
4. Manual two-point anatomical alignment.
5. Overlay comparison mode.
6. Export to HTML package or PDF.
7. Optional desktop packaging.

## Open Decisions

- Should the default layout be 2-up or single image?
- Should sorting prefer file name or EXIF capture date when available?
- Should the app use browser-only storage or saved project files first?
- Should the presentation support patient/case labels on screen, or keep labels
  hidden for privacy?
