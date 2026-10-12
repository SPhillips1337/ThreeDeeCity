"""Small local ComfyUI API client. Submits once; polling never resubmits a job."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request
import uuid

def request(base, route, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + route, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode()) from error

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--base', default='http://192.168.5.157:8188')
    p.add_argument('action', choices=['submit', 'poll'])
    p.add_argument('file', type=Path)
    args = p.parse_args()
    if args.action == 'submit':
        queue = request(args.base, '/queue')
        if queue['queue_running'] or queue['queue_pending']:
            raise RuntimeError('ComfyUI is busy; no job was submitted.')
        graph = json.loads(args.file.read_text())
        result = request(args.base, '/prompt', {'prompt': graph, 'client_id': str(uuid.uuid4())})
        if result.get('node_errors'):
            raise RuntimeError(json.dumps(result))
        result['base'] = args.base
        result['workflow_sha256'] = hashlib.sha256(args.file.read_bytes()).hexdigest()
        args.file.with_suffix('.job.json').write_text(json.dumps(result, indent=2))
        print(json.dumps(result))
    else:
        job = json.loads(args.file.read_text())
        history = request(job['base'], '/history/' + job['prompt_id'])
        item = history.get(job['prompt_id'])
        if item:
            args.file.with_suffix('.history.json').write_text(json.dumps(item, indent=2))
            print(json.dumps({'prompt_id': job['prompt_id'], 'status': item.get('status'), 'outputs': item.get('outputs')}))
        else:
            queue = request(job['base'], '/queue')
            print(json.dumps({'pending': job['prompt_id'], 'running': [entry[1] for entry in queue['queue_running']], 'queued': [entry[1] for entry in queue['queue_pending']]}))

if __name__ == '__main__':
    main()
