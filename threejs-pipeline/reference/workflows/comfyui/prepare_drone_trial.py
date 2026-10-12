"""Prepare derived API workflows; leave supplied exports unchanged."""
import json
import copy
from pathlib import Path

root = Path(__file__).resolve().parent
graph = json.loads((root / 'original/image_flux2_klein_text_to_image.json').read_text())
prompt = ('One original aerial combat drone for a stylized time-travel real-time strategy game. '
          'Compact symmetrical unmanned aircraft, broad swept wings joined to a chunky central fuselage, '
          'two enclosed turbine pods, short tail fins, a small underslung cannon, no propellers. '
          'Dark gunmetal body with broad teal armour panels and a single cyan sensor lens. '
          'Strong readable silhouette, simple manufactured shapes, restrained surface details, '
          'stylized game asset with physically believable materials. Entire isolated object centred, '
          'three-quarter front view from slightly above, wings and tail fully visible with generous margins. '
          'Neutral soft studio lighting, plain white background, no ground plane, no cast shadow, '
          'no text, no logos, no scenery, no people, no presentation sheet, exactly one drone.')
graph['76']['inputs']['value'] = prompt
graph['75:73']['inputs']['noise_seed'] = 410042
graph['9']['inputs']['filename_prefix'] = 'Ashfall/drone_trial/concept'
(root / 'drone_concept.json').write_text(json.dumps(graph, indent=2))

graph = json.loads((root / 'original/3d_pixal3d_trellis2_image_to_model.json').read_text())
# The input filename is assigned after the concept image has been reviewed.
graph['122']['inputs']['image'] = 'ASHFALL_INPUT_REPLACE.png'
graph['94']['inputs']['target_resolution'] = 1024
graph['241']['inputs']['resolution'] = 256
graph['241']['inputs']['smooth_iters'] = 2
graph['186']['inputs']['target_face_count'] = 15000
graph['238']['inputs']['crease_angle'] = 60
graph['260']['inputs']['crease_angle'] = 60
graph['288']['inputs']['value'] = 1024
graph['224']['inputs']['resolution'] = 1024
graph['233']['inputs']['resolution'] = 512
graph['233']['inputs']['samples'] = 16
graph['322']['inputs']['filename_prefix'] = 'Ashfall/drone_trial/pixal3d'
# Only the final export is an output node in the test. Preview nodes preserve their
# pass-through outputs, but are removed by wiring their upstream data directly.
redirect = {node_id: node['inputs'][next(k for k in ('images', 'mask', 'model_3d') if k in node['inputs'])]
            for node_id, node in graph.items()
            if node['class_type'] in ('PreviewImage', 'MaskPreview', 'Preview3DAdvanced')}
for node in graph.values():
    for key, value in node['inputs'].items():
        while isinstance(value, list) and len(value) == 2 and value[0] in redirect:
            value = redirect[value[0]]
        node['inputs'][key] = value
for node_id in redirect:
    del graph[node_id]
# Retain just the ancestors of the final saved mesh, avoiding unused previews.
keep = set()
def ancestors(node_id):
    if node_id in keep:
        return
    keep.add(node_id)
    for value in graph[node_id]['inputs'].values():
        if isinstance(value, list) and len(value) == 2 and value[0] in graph:
            ancestors(value[0])
ancestors('322')
graph = {key: value for key, value in graph.items() if key in keep}
(root / 'drone_pixal3d.json').write_text(json.dumps(graph, indent=2))
trellis = copy.deepcopy(graph)
trellis['316']['inputs']['value'] = True
trellis['312']['inputs']['pad_factor'] = 1.0
trellis['322']['inputs']['filename_prefix'] = 'Ashfall/drone_trial/trellis2'
(root / 'drone_trellis2.json').write_text(json.dumps(trellis, indent=2))
print('Prepared drone concept and reduced-cost Pixal3D / TRELLIS.2 export graphs.')
