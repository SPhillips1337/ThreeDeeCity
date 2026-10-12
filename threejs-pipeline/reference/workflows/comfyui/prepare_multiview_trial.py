"""Derive a bounded multiview test; preserve the supplied turnaround-sheet recipe."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
graph = json.loads((root/'original/3d_pixal3d_multi_views.json').read_text())
for index, view in enumerate(('front','left','back','right')):
    node_id = str(900 + index)
    graph[node_id] = {'class_type':'LoadImage','inputs':{'image':'AshfallDroneMV_'+view+'.png'}}
    graph['324']['inputs'][view] = [node_id,0]
graph['94']['inputs']['target_resolution'] = 1024
graph['241']['inputs'].update(resolution=256,smooth_iters=2)
graph['186']['inputs']['target_face_count'] = 15000
for node_id in ('238','260'):
    graph[node_id]['inputs']['crease_angle'] = 60
graph['288']['inputs']['value'] = 1024
graph['224']['inputs']['resolution'] = 1024
graph['233']['inputs'].update(resolution=512,samples=16)
graph['372']['inputs']['filename_prefix'] = 'Ashfall/drone_multiview_trial/pixal3d'
redirect = {key:node['inputs'][next(k for k in ('images','mask','model_3d') if k in node['inputs'])]
            for key,node in graph.items() if node['class_type'] in ('PreviewImage','MaskPreview','Preview3DAdvanced')}
for node in graph.values():
    for key,value in node['inputs'].items():
        while isinstance(value,list) and len(value)==2 and value[0] in redirect:
            value = redirect[value[0]]
        node['inputs'][key] = value
for key in redirect:
    del graph[key]
keep = set()
def ancestors(key):
    if key in keep:
        return
    keep.add(key)
    for value in graph[key]['inputs'].values():
        if isinstance(value,list) and len(value)==2 and value[0] in graph:
            ancestors(value[0])
ancestors('372')
graph = {key:value for key,value in graph.items() if key in keep}
(root/'drone_multiview.json').write_text(json.dumps(graph,indent=2))
print('Prepared calibrated four-view test, retaining the original export unchanged.')
