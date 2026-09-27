"""Generate a standalone review page whose media and download URLs use Blob."""
from pathlib import Path
import json, re, html
ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
manifest = json.loads((ROOT / 'ASSETS.json').read_text())
assets = {item['path']: item['url'] for item in manifest['assets']}
source = (ROOT / 'aok-reconstruction-r03/PAINTED_ORBIT_REVIEW.html').read_text()

def replace(match):
    attr, path = match.groups()
    if path == 'ORBIT_REVIEW.html':
        path = 'outputs/AOK_R03_Clay_Globular_Orbit.mp4'
    key = 'aok-reconstruction-r03/' + path
    if key not in assets:
        raise ValueError('Missing uploaded asset: ' + key)
    return f'{attr}="{html.escape(assets[key], quote=True)}"'

page = re.sub(r'(href|src|poster)="([^"]+)"', replace, source)
archive = html.escape(manifest['archive']['url'], quote=True)
page = page.replace('<main>', '<meta name="robots" content="noindex"><main>', 1)
page = page.replace('</main>', f'<div class="links"><a href="{archive}">Download complete figure project</a><a href="https://github.com/lucasdickey/a-ok-shop/tree/codex/apes-on-keys-figurine-assets/use-cases/apes-on-keys-figurine">Source and restore instructions</a></div></main>')
target = REPO / 'public/use-cases/apes-on-keys-figurine/index.html'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(page)
print(target)
