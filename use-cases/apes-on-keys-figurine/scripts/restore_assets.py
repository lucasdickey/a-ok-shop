"""Restore the figure package from its public Blob archive; standard Python only."""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, os, shutil, tempfile, urllib.request, zipfile

ROOT = Path(__file__).resolve().parents[1]

def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, default=ROOT)
    args = parser.parse_args()
    destination = args.destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ROOT / 'ASSETS.json').read_text())
    archive = manifest['archive']
    inventory = json.loads((ROOT / 'ARCHIVE_CONTENTS.json').read_text())
    with tempfile.TemporaryDirectory(prefix='aok-restore-') as temp:
        download = Path(temp) / 'project.zip'
        print('Downloading complete figure archive...', flush=True)
        with urllib.request.urlopen(archive['url'], timeout=120) as response, download.open('wb') as output:
            shutil.copyfileobj(response, output)
        if download.stat().st_size != archive['bytes'] or sha256(download) != archive['sha256']:
            raise SystemExit('Archive checksum mismatch. No files restored.')
        restored = 0
        with zipfile.ZipFile(download) as source:
            # Only manifest-listed regular files; never trust archive paths or follow symlinks.
            for item in inventory:
                path = PurePosixPath(item['path'])
                if path.is_absolute() or '..' in path.parts:
                    raise SystemExit('Unsafe path in inventory')
                target = destination.joinpath(*path.parts)
                if not target.resolve().is_relative_to(destination):
                    raise SystemExit('Path escapes destination')
                if target.exists() or target.is_symlink():
                    continue  # Preserve existing local work, including modified scripts.
                target.parent.mkdir(parents=True, exist_ok=True)
                staging = Path(temp) / 'next-file'
                with source.open(item['path']) as input_file, staging.open('wb') as output:
                    shutil.copyfileobj(input_file, output)
                if staging.stat().st_size != item['bytes'] or sha256(staging) != item['sha256']:
                    raise SystemExit('File checksum mismatch: ' + item['path'])
                shutil.move(str(staging), str(target))
                restored += 1
        print(f'Restored and verified {restored} missing files in {destination}. Existing files were preserved.')

if __name__ == '__main__':
    main()
