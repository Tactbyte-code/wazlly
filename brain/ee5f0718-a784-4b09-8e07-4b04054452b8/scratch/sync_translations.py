import json
import os

template_file = r'c:\deployeComp\whatsway\client\src\lib\translations\es.json'
translations_dir = r'c:\deployeComp\whatsway\client\src\lib\translations'

with open(template_file, 'r', encoding='utf-8') as f:
    template_data = json.load(f)

def sync_keys(template, target):
    changed = False
    for key, value in template.items():
        if key not in target:
            target[key] = value
            changed = True
        elif isinstance(value, dict) and isinstance(target.get(key), dict):
            if sync_keys(value, target[key]):
                changed = True
    return changed

for filename in os.listdir(translations_dir):
    if filename.endswith('.json') and filename != 'es.json':
        file_path = os.path.join(translations_dir, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                target_data = json.load(f)
            except json.JSONDecodeError:
                print(f'Error decoding {filename}')
                continue
        
        if sync_keys(template_data, target_data):
            print(f'Updating {filename}')
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(target_data, f, ensure_ascii=False, indent=2)
        else:
            print(f'No changes for {filename}')
