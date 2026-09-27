# Apes on Keys figure: prototype development and WIP media

The complete figure project now belongs to `a-ok-shop/use-cases/apes-on-keys-figurine/`.
The approved R03 clay and current face paint are the latest appearance study. R01/R02 are rejected historical iterations. This is not a manufacturing release; eyelet engineering and fabrication validation are still pending.

## Open from anywhere

- [Branded painted orbit (1080 × 1080)](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/apes-on-keys-figurine/r03/2026-09-27/AOK_WIP_Painted_Orbit.mp4)
- [Synchronized clay/paint comparison (1920 × 1080)](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/apes-on-keys-figurine/r03/2026-09-27/AOK_WIP_Clay_to_Paint.mp4)
- [Sales media package: three videos, two posters, caption](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/apes-on-keys-figurine/r03/2026-09-27/AOK_WIP_Sales_Collateral.zip)
- [Complete project archive, including all iterations and Blender backups (~1.53 GB)](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/apes-on-keys-figurine/r03/2026-09-27/AOK_Figure_Project_2026-09-27.zip)
- [Current painted Blender animation](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/apes-on-keys-figurine/r03/2026-09-27/R03_painted_globular_animation.blend)
- [Clay Blender animation](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/apes-on-keys-figurine/r03/2026-09-27/R03_clay_globular_animation.blend)

The web review lives at `/use-cases/apes-on-keys-figurine/` on a deployment containing this change. Its HTML lives in `public/use-cases/apes-on-keys-figurine/index.html`; every image, video, and download references Blob directly. You can also open that HTML locally without restoring the large assets.

## Storage and project layout

`ASSETS.json` records public Vercel Blob URLs, byte sizes, SHA-256 checksums, and the archive download. `ARCHIVE_CONTENTS.json` records every file in the project snapshot. The store is **a-ok-shop-figure-assets**, connected to the existing **a-ok-shop** Vercel project. These are public shareable downloads, under `apes-on-keys-figurine/r03/2026-09-27/`.

- `aok-reconstruction-r03/`: approved clay, paint studies, camera scripts, QA, review pages, and WIP collateral.
- `aok-keychain/` and `aok-keychain-r02/`: rejected earlier iterations, retained for provenance.
- `Reviewed_Prototype_Handoff/`: printer brief and original handoff work; current status above takes precedence.
- `references/`: original concept sheet and proportion feedback.
- `scripts/restore_assets.py`: download, verify, and restore missing project files.
- Large binary files and `.remote-cache/` are Git-ignored; the complete source directory is excluded from Vercel deployment bundles. Only the small remote review HTML ships with the storefront.

The archive is a snapshot of the migrated working package, including all original renders, sources, exports, ZIPs, and Blender backups. Later migration utilities and download metadata live in Git. Local binaries are retained as a working copy.

## Continue on another machine

Use Python 3.11 or newer, then from the repository root:

```sh
python3 use-cases/apes-on-keys-figurine/scripts/restore_assets.py
```

The restore verifies the full archive and every restored file against SHA-256. Existing files are preserved. Allow approximately 5.1 GB of temporary disk space for the compressed download and extracted assets. Open `aok-reconstruction-r03/outputs/R03_painted_globular_animation.blend` in Blender 4.5 or compatible. For the video edit, keep its relative `../outputs/` movie paths intact.

To serve all original local reviews after restoration:

```sh
cd use-cases/apes-on-keys-figurine/aok-reconstruction-r03
python3 serve_review.py
```

## Tooling stays local

Blender, Python virtual environments, Hunyuan3D source, and model caches were intentionally not uploaded or committed. On the original Mac they remain under `/Users/ld/Downloads/AOK_Apes_on_Keys_4in_Keychain_Codex_Package/tooling/`; the project has a Git-ignored `tooling` symlink there. Original Downloads project paths also forward to this directory through symlinks, preserving existing local links.

For inference on another machine, install the required tooling separately and set `AOK_TOOLING_DIR` to its directory. Existing mesh review and rendering do not require running inference again. The lettering/video layout uses Arial and Arial Black; install these fonts or choose replacements when editing on a system without them.

## Publish updates

`python3 scripts/publish_assets.py` uploads the selected current assets using the Vercel CLI and a `BLOB_READ_WRITE_TOKEN` supplied through the process environment. It resumes entries already recorded with the same checksum and refuses to overwrite existing Blob paths. Use `scripts/archive_project.py` with a new dated filename and a new release prefix for revised assets, then rebuild the remote review HTML with `python3 scripts/build_remote_review.py`.

No credentials are stored in this directory or its archive. Remote storage is independent of the localhost review server.
