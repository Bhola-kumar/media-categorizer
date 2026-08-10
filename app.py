import os
import sys
import time
import mimetypes
import shutil
import subprocess
import json
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file, Response

app = Flask(__name__, template_folder='templates', static_folder='static')

# Undo history stack
undo_stack = []

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff'}
VIDEO_EXTENSIONS = {'.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.wmv', '.m4v'}
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'}

def get_media_type(filename):
    ext = Path(filename).suffix.lower()
    if ext in IMAGE_EXTENSIONS:
        return 'image'
    elif ext in VIDEO_EXTENSIONS:
        return 'video'
    elif ext in AUDIO_EXTENSIONS:
        return 'audio'
    return None

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/quick-folders', methods=['GET'])
def get_quick_folders():
    """Returns a list of common Windows system folders on the user's hard drive."""
    home = Path.home()
    candidates = [
        {'name': 'Downloads', 'path': str(home / 'Downloads')},
        {'name': 'Pictures', 'path': str(home / 'Pictures')},
        {'name': 'Desktop', 'path': str(home / 'Desktop')},
        {'name': 'Documents', 'path': str(home / 'Documents')},
        {'name': 'Workspace', 'path': str(Path.cwd())}
    ]
    valid_folders = [c for c in candidates if os.path.exists(c['path'])]
    return jsonify({'folders': valid_folders})

@app.route('/api/open-folder-dialog', methods=['POST'])
def open_folder_dialog():
    """Opens native Windows folder selector window directly on top of desktop."""
    try:
        script_path = os.path.join(os.path.dirname(__file__), 'select_folder.py')
        res = subprocess.run([sys.executable, script_path], capture_output=True, text=True, timeout=60)
        if res.returncode == 0 and res.stdout.strip():
            stdout_lines = [line.strip() for line in res.stdout.splitlines() if line.strip()]
            if stdout_lines:
                last_line = stdout_lines[-1]
                try:
                    data = json.loads(last_line)
                    if data.get('success') and data.get('path'):
                        return jsonify({'success': True, 'path': os.path.abspath(data['path'])})
                except json.JSONDecodeError:
                    # Some helpers may return the selected path directly
                    if os.path.isdir(last_line):
                        return jsonify({'success': True, 'path': os.path.abspath(last_line)})
    except Exception as e:
        print(f"Folder dialog error: {e}")

    return jsonify({'success': False, 'message': 'No folder selected or dialog cancelled'})

def resolve_full_folder_path(folder_input):
    """Smartly resolves a folder input (whether relative or folder name) to a full absolute path."""
    if not folder_input:
        return None

    clean_path = folder_input.strip()

    # 1. Direct path check
    if os.path.exists(clean_path) and os.path.isdir(clean_path):
        return os.path.abspath(clean_path)

    # 2. Search common user directories for matching folder name
    folder_name = os.path.basename(clean_path.rstrip('/\\'))
    home = Path.home()
    
    search_roots = [
        home / 'Downloads',
        home / 'Pictures',
        home / 'Desktop',
        home / 'Documents',
        home,
        Path.cwd(),
        Path('C:/'),
        Path('D:/')
    ]

    for root in search_roots:
        try:
            if root.exists():
                candidate = root / folder_name
                if candidate.exists() and candidate.is_dir():
                    return str(candidate.resolve())
        except Exception:
            continue

    # 3. Fallback: resolve as relative path to CWD or Home
    try:
        candidate = Path.cwd() / clean_path
        return str(candidate.resolve())
    except Exception:
        return os.path.abspath(clean_path)

@app.route('/api/resolve-path', methods=['POST'])
def resolve_path_endpoint():
    data = request.json or {}
    folder_input = data.get('folder_path', '').strip()
    resolved = resolve_full_folder_path(folder_input)
    if resolved:
        return jsonify({'success': True, 'resolved_path': resolved})
    return jsonify({'success': False, 'message': f'Could not resolve full path for: {folder_input}'})

@app.route('/api/scan-folder', methods=['POST'])
def scan_folder():
    data = request.json or {}
    raw_folder_path = data.get('folder_path', '').strip()

    if not raw_folder_path:
        return jsonify({'error': 'Folder path is required.'}), 400

    resolved_path = resolve_full_folder_path(raw_folder_path)

    if not resolved_path:
        return jsonify({
            'error': f'Folder "{raw_folder_path}" could not be found. Please enter or paste the full path (e.g. C:\\Users\\...\\{raw_folder_path} or D:\\{raw_folder_path}).'
        }), 404

    abs_folder = os.path.abspath(resolved_path)
    media_files = []
    
    try:
        entries = os.scandir(abs_folder)
        for entry in entries:
            if entry.is_file():
                media_type = get_media_type(entry.name)
                if media_type:
                    stat = entry.stat()
                    mime_type, _ = mimetypes.guess_type(entry.name)
                    media_files.append({
                        'id': entry.name,
                        'name': entry.name,
                        'path': entry.path,
                        'size': stat.st_size,
                        'formatted_size': format_size(stat.st_size),
                        'media_type': media_type,
                        'mime_type': mime_type or f'{media_type}/*',
                        'extension': Path(entry.name).suffix.lower(),
                        'modified_time': stat.st_mtime,
                        'modified_formatted': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stat.st_mtime))
                    })
    except Exception as e:
        return jsonify({'error': f'Failed to read directory: {str(e)}'}), 500

    media_files.sort(key=lambda x: x['name'].lower())

    summary = {
        'total_count': len(media_files),
        'image_count': sum(1 for f in media_files if f['media_type'] == 'image'),
        'video_count': sum(1 for f in media_files if f['media_type'] == 'video'),
        'audio_count': sum(1 for f in media_files if f['media_type'] == 'audio'),
        'total_size': format_size(sum(f['size'] for f in media_files))
    }

    return jsonify({
        'folder_path': abs_folder,
        'folder_name': os.path.basename(abs_folder) or abs_folder,
        'summary': summary,
        'files': media_files
    })

@app.route('/api/categories', methods=['POST'])
def list_categories():
    data = request.json or {}
    target_base = data.get('target_base_path', '').strip()
    
    if not target_base:
        return jsonify({'categories': [], 'target_base_path': ''})

    resolved_base = resolve_full_folder_path(target_base) or target_base
    abs_parent = os.path.abspath(resolved_base)

    if not os.path.exists(abs_parent):
        try:
            os.makedirs(abs_parent, exist_ok=True)
        except Exception:
            pass

    categories = []

    try:
        for item in os.listdir(abs_parent):
            item_path = os.path.join(abs_parent, item)
            if os.path.isdir(item_path) and not item.startswith('.'):
                sub_entries = os.listdir(item_path)
                image_cnt = 0
                video_cnt = 0
                audio_cnt = 0
                total_bytes = 0

                for sub_item in sub_entries:
                    sub_path = os.path.join(item_path, sub_item)
                    if os.path.isfile(sub_path):
                        mtype = get_media_type(sub_item)
                        if mtype:
                            if mtype == 'image': image_cnt += 1
                            elif mtype == 'video': video_cnt += 1
                            elif mtype == 'audio': audio_cnt += 1
                            total_bytes += os.path.getsize(sub_path)

                categories.append({
                    'name': item,
                    'path': item_path,
                    'image_count': image_cnt,
                    'video_count': video_cnt,
                    'audio_count': audio_cnt,
                    'total_files': image_cnt + video_cnt + audio_cnt,
                    'formatted_size': format_size(total_bytes)
                })
    except Exception as e:
        print(f"Error scanning categories: {e}")

    categories.sort(key=lambda x: x['name'].lower())
    return jsonify({
        'target_base_path': abs_parent,
        'categories': categories
    })

@app.route('/api/create-category', methods=['POST'])
def create_category():
    data = request.json or {}
    parent_folder = data.get('parent_folder', '').strip()
    category_name = data.get('category_name', '').strip()

    if not parent_folder:
        return jsonify({'error': 'Target base directory is required.'}), 400

    resolved_parent = resolve_full_folder_path(parent_folder) or os.path.abspath(parent_folder)

    if not os.path.exists(resolved_parent):
        try:
            os.makedirs(resolved_parent, exist_ok=True)
        except Exception as e:
            return jsonify({'error': f'Target base directory could not be created: {str(e)}'}), 400

    if not category_name:
        return jsonify({'error': 'Category folder name is required.'}), 400

    clean_name = "".join([c for c in category_name if c.isalnum() or c in (' ', '_', '-')]).strip()
    if not clean_name:
        return jsonify({'error': 'Invalid category name.'}), 400

    target_path = os.path.join(resolved_parent, clean_name)
    try:
        os.makedirs(target_path, exist_ok=True)
        return jsonify({
            'success': True,
            'category': {
                'name': clean_name,
                'path': os.path.abspath(target_path),
                'image_count': 0,
                'video_count': 0,
                'audio_count': 0,
                'total_files': 0,
                'formatted_size': '0 B'
            }
        })
    except Exception as e:
        return jsonify({'error': f'Failed to create directory: {str(e)}'}), 500

@app.route('/api/delete-file', methods=['POST'])
def delete_file():
    data = request.json or {}
    file_path = data.get('file_path', '').strip()

    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File to delete does not exist.'}), 404

    try:
        parent_dir = os.path.dirname(file_path)
        trash_dir = os.path.join(parent_dir, '.trash')
        os.makedirs(trash_dir, exist_ok=True)

        filename = os.path.basename(file_path)
        dst_trash_path = os.path.join(trash_dir, filename)

        if os.path.exists(dst_trash_path):
            name_stem = Path(filename).stem
            ext = Path(filename).suffix
            dst_trash_path = os.path.join(trash_dir, f"{name_stem}_{int(time.time())}{ext}")

        shutil.move(file_path, dst_trash_path)
        undo_stack.append({
            'action': 'delete',
            'src': file_path,
            'dst': dst_trash_path,
            'timestamp': time.time()
        })

        return jsonify({
            'success': True,
            'message': f'Deleted file "{filename}" (Moved to .trash)',
            'undo_available': True
        })
    except Exception as e:
        return jsonify({'error': f'Failed to delete file: {str(e)}'}), 500

@app.route('/api/categorize', methods=['POST'])
def categorize_file():
    data = request.json or {}
    source_path = data.get('source_path', '').strip()
    category_path = data.get('category_path', '').strip()
    action = data.get('action', 'move')

    if not os.path.exists(source_path):
        return jsonify({'error': 'Source file does not exist.'}), 404

    if not os.path.exists(category_path) or not os.path.isdir(category_path):
        return jsonify({'error': 'Target category directory does not exist.'}), 404

    filename = os.path.basename(source_path)
    target_file_path = os.path.join(category_path, filename)

    if os.path.exists(target_file_path):
        name_stem = Path(filename).stem
        ext = Path(filename).suffix
        counter = 1
        while os.path.exists(target_file_path):
            target_file_path = os.path.join(category_path, f"{name_stem}_{counter}{ext}")
            counter += 1

    try:
        if action == 'move':
            shutil.move(source_path, target_file_path)
            undo_stack.append({
                'action': 'move',
                'src': source_path,
                'dst': target_file_path,
                'timestamp': time.time()
            })
        else:
            shutil.copy2(source_path, target_file_path)
            undo_stack.append({
                'action': 'copy',
                'dst': target_file_path,
                'timestamp': time.time()
            })

        return jsonify({
            'success': True,
            'action': action,
            'source_path': source_path,
            'new_path': target_file_path,
            'filename': os.path.basename(target_file_path),
            'undo_available': len(undo_stack) > 0
        })
    except Exception as e:
        return jsonify({'error': f'Failed to {action} file: {str(e)}'}), 500

@app.route('/api/batch-categorize', methods=['POST'])
def batch_categorize():
    data = request.json or {}
    source_paths = data.get('source_paths', [])
    category_path = data.get('category_path', '').strip()
    action = data.get('action', 'move')

    if not source_paths or not category_path:
        return jsonify({'error': 'Source paths and category path are required.'}), 400

    results = []
    success_count = 0

    for src in source_paths:
        if os.path.exists(src):
            filename = os.path.basename(src)
            dst = os.path.join(category_path, filename)

            if os.path.exists(dst):
                name_stem = Path(filename).stem
                ext = Path(filename).suffix
                counter = 1
                while os.path.exists(dst):
                    dst = os.path.join(category_path, f"{name_stem}_{counter}{ext}")
                    counter += 1

            try:
                if action == 'move':
                    shutil.move(src, dst)
                    undo_stack.append({'action': 'move', 'src': src, 'dst': dst, 'timestamp': time.time()})
                else:
                    shutil.copy2(src, dst)
                    undo_stack.append({'action': 'copy', 'dst': dst, 'timestamp': time.time()})

                success_count += 1
                results.append({'src': src, 'dst': dst, 'status': 'success'})
            except Exception as e:
                results.append({'src': src, 'error': str(e), 'status': 'failed'})

    return jsonify({
        'success': True,
        'processed': success_count,
        'total': len(source_paths),
        'results': results,
        'undo_available': len(undo_stack) > 0
    })

@app.route('/api/undo', methods=['POST'])
def undo_last_action():
    if not undo_stack:
        return jsonify({'error': 'Nothing to undo.'}), 400

    last_op = undo_stack.pop()
    action = last_op.get('action')

    try:
        if action in ('move', 'delete'):
            dst = last_op['dst']
            src = last_op['src']
            if os.path.exists(dst):
                os.makedirs(os.path.dirname(src), exist_ok=True)
                shutil.move(dst, src)
                msg = f'Restored file {os.path.basename(src)}'
                return jsonify({
                    'success': True,
                    'message': msg,
                    'restored_path': src
                })
        elif action == 'copy':
            dst = last_op['dst']
            if os.path.exists(dst):
                os.remove(dst)
                return jsonify({
                    'success': True,
                    'message': f'Removed copied file {os.path.basename(dst)}'
                })
    except Exception as e:
        return jsonify({'error': f'Failed to undo action: {str(e)}'}), 500

    return jsonify({'error': 'Invalid undo operation state.'}), 400

@app.route('/api/media')
def stream_media():
    file_path = request.args.get('path', '').strip()
    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = 'application/octet-stream'

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get('Range', None)

    if not range_header:
        return send_file(file_path, mimetype=mime_type)

    byte_str = range_header.replace('bytes=', '')
    parts = byte_str.split('-')
    start = int(parts[0]) if parts[0] else 0
    end = int(parts[1]) if parts[1] else file_size - 1

    if start >= file_size:
        return Response(status=416)

    length = end - start + 1

    with open(file_path, 'rb') as f:
        f.seek(start)
        data = f.read(length)

    res = Response(data, 206, mimetype=mime_type, direct_passthrough=True)
    res.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
    res.headers.add('Accept-Ranges', 'bytes')
    res.headers.add('Content-Length', str(length))
    return res

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
