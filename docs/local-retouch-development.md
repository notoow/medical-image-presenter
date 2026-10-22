# notoow local automatic retouch development

Goal: automatically remove protruding axillary hair, acne marks and dark moles while preserving nipples, areolae and breast contours. No manual selection should be required in the final workflow. Original files must remain unchanged. Patient images are never submitted to hosted inference.

## Current implementation (2026-10-22)

- `scripts/retouch_inventory.py`: read requested source folders, pair originals and edited examples by stem, create local contact sheets.
- `scripts/local_retouch.py`: experimental CPU/OpenCV baseline, full-resolution reconstruction, hard protection masks and lossless PNG output. Original dimensions and all pixels outside the edit mask are preserved.
- `scripts/retouch_evaluate.py`: independent approximate visual test ROIs, deliberately not passed to the processing pipeline. These are not expert anatomical segmentation ground truth.
- `scripts/retouch_semantics.py`: local CLIPSeg experiment; explicit public model download is separate from offline patient-image inference. No remote model code is loaded.
- `scripts/retouch_gallery.py`: local side-by-side review page.

Private inventory, source paths, previews, edited outputs, masks and measurements live in git-ignored `private-retouch/`, outside Vite's public directory. Models/venv live in ignored `.tools/`. Do not publish either directory or include them in the web build.

## Evidence so far

30 original images, 23 matching manual references; includes non-portrait material. Seven selected portrait examples used for initial experiments. Do not treat incomplete manual edits as exhaustive ground truth. Some reference dimensions differ from originals, so raw pixel-difference metrics are not valid for those pairs without registration.

v1: over-detected pores and protected some large moles. Rejected.

v2: fewer pore detections, but independent approximate nipple-surrounding ROIs/crease bands revealed edits despite zero changes inside the algorithm's own protection mask. Rejected.

v3: added oriented ridge protection. Improved crease preservation; residual edits remain in two nipple-surrounding evaluation ROIs and one crease band. These ROIs include adjacent skin, so they do not prove the nipple itself changed; they do prevent declaring preservation validated. Some dark marks, pale scars and hair remain. Experimental outputs are not approved results.

CLIPSeg rd64-refined was downloaded and run entirely locally on four examples. Nipple/areola prompts produce useful coarse responses on some photos, but also broad false-positive responses. The armpit-hair prompt incorrectly highlights upper arms; acne/mole maps are not precise lesion masks. Do not use these raw maps to authorize edits. Outputs are in ignored `private-retouch/semantic-v1/`. The model is currently an evaluated experiment, not integrated into the retouch pipeline.

Latest review page: `private-retouch/baseline-v3/index.html`. All seven outputs are lossless full-resolution PNGs, with originals, edit/protection masks, manual-reference comparisons, and metrics. Processing time in this CPU run was approximately 3–9 seconds per photo; model startup and segmentation are separate costs.

Execution environment: Windows, Python 3.12, OpenCV 5.0.0, Pillow, NumPy; CPU-only PyTorch 2.13.0. Isolated `.tools/retouch-venv` uses system PyTorch and adds Transformers 4.57.6. Runtime scripts should run from the repository's actual E: path when junction resolution matters.

## Next verification requirements

1. Evaluate semantic localization separately from inpainting, across frontal/oblique/profile views, without using test annotations as runtime inputs.
2. Quantify nipple/areola coverage and preservation against precise independent annotations; replace approximate boxes with anatomically accurate review masks.
3. Separate hair, dark spots and pale scars; current dark-spot rules do not solve all three.
4. Protect silhouette and low-frequency chest shading. Hair outside the silhouette requires separate reconstruction of the adjacent backdrop, not body-shape modification.
5. Evaluate removal completeness and local texture artifacts at original resolution. Guarding all pixels trivially passes preservation and is not task completion.
6. Test on held-out images/cases before making any universal automatic-quality claim.

Goal remains active; there is no claim of perfect automatic correction.
