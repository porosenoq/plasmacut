import os
import math
import tempfile
from flask import Flask, request, jsonify
import ezdxf
from ezdxf.enums import ACI
import ezdxf.bbox

app = Flask(__name__)
UPLOAD_DIR = os.environ.get('UPLOAD_DIR', '/uploads')


def entity_color(layer_name: str) -> str:
    ln = layer_name.lower()
    if any(k in ln for k in ['cut', 'outline', 'contour', 'profile']):
        return '#5DCAA5'
    if any(k in ln for k in ['hole', 'drill', 'circle', 'bore']):
        return '#378ADD'
    if any(k in ln for k in ['bend', 'fold', 'crease']):
        return '#EF9F27'
    if any(k in ln for k in ['anno', 'text', 'dim', 'note']):
        return '#888780'
    return '#5DCAA5'


def arc_length(radius: float, start_angle: float, end_angle: float) -> float:
    if end_angle < start_angle:
        end_angle += 360
    return math.radians(end_angle - start_angle) * abs(radius)


def polyline_length(points) -> float:
    total = 0.0
    pts = list(points)
    for i in range(1, len(pts)):
        dx = pts[i][0] - pts[i-1][0]
        dy = pts[i][1] - pts[i-1][1]
        total += math.sqrt(dx*dx + dy*dy)
    return total


def entity_to_svg_element(entity, color: str, scale: float, ox: float, oy: float, canvas_h: float) -> str:
    def tx(x): return (x - ox) * scale
    def ty(y): return canvas_h - (y - oy) * scale

    dxf_type = entity.dxftype()

    if dxf_type == 'LINE':
        x1, y1 = tx(entity.dxf.start.x), ty(entity.dxf.start.y)
        x2, y2 = tx(entity.dxf.end.x), ty(entity.dxf.end.y)
        return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" stroke-width="1.2" fill="none"/>'

    if dxf_type == 'CIRCLE':
        cx, cy = tx(entity.dxf.center.x), ty(entity.dxf.center.y)
        r = entity.dxf.radius * scale
        return f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" stroke="{color}" stroke-width="1.2" fill="none"/>'

    if dxf_type == 'ARC':
        cx, cy_raw = entity.dxf.center.x, entity.dxf.center.y
        r = entity.dxf.radius * scale
        sa = math.radians(entity.dxf.start_angle)
        ea = math.radians(entity.dxf.end_angle)
        x1 = tx(cx + entity.dxf.radius * math.cos(sa))
        y1 = ty(cy_raw + entity.dxf.radius * math.sin(sa))
        x2 = tx(cx + entity.dxf.radius * math.cos(ea))
        y2 = ty(cy_raw + entity.dxf.radius * math.sin(ea))
        end_angle = entity.dxf.end_angle
        start_angle = entity.dxf.start_angle
        if end_angle < start_angle:
            end_angle += 360
        large = 1 if (end_angle - start_angle) > 180 else 0
        return f'<path d="M{x1:.2f},{y1:.2f} A{r:.2f},{r:.2f} 0 {large},0 {x2:.2f},{y2:.2f}" stroke="{color}" stroke-width="1.2" fill="none"/>'

    if dxf_type in ('LWPOLYLINE', 'POLYLINE'):
        try:
            if dxf_type == 'LWPOLYLINE':
                pts = list(entity.get_points('xy'))
            else:
                pts = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
            if len(pts) < 2:
                return ''
            d = f'M{tx(pts[0][0]):.2f},{ty(pts[0][1]):.2f}'
            for p in pts[1:]:
                d += f' L{tx(p[0]):.2f},{ty(p[1]):.2f}'
            if entity.is_closed:
                d += ' Z'
            return f'<path d="{d}" stroke="{color}" stroke-width="1.2" fill="none"/>'
        except Exception:
            return ''

    if dxf_type == 'SPLINE':
        try:
            pts = list(entity.flattening(0.01))
            if len(pts) < 2:
                return ''
            d = f'M{tx(pts[0][0]):.2f},{ty(pts[0][1]):.2f}'
            for p in pts[1:]:
                d += f' L{tx(p[0]):.2f},{ty(p[1]):.2f}'
            return f'<path d="{d}" stroke="{color}" stroke-width="1.2" fill="none"/>'
        except Exception:
            return ''

    if dxf_type == 'ELLIPSE':
        try:
            pts = list(entity.flattening(0.01))
            if len(pts) < 2:
                return ''
            d = f'M{tx(pts[0][0]):.2f},{ty(pts[0][1]):.2f}'
            for p in pts[1:]:
                d += f' L{tx(p[0]):.2f},{ty(p[1]):.2f}'
            return f'<path d="{d}" stroke="{color}" stroke-width="1.2" fill="none"/>'
        except Exception:
            return ''

    return ''


@app.route('/parse', methods=['POST'])
def parse_dxf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    f = request.files['file']
    file_id = request.form.get('file_id', 'unknown')

    with tempfile.NamedTemporaryFile(suffix='.dxf', delete=False) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name

    try:
        doc = ezdxf.readfile(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        return jsonify({'error': f'Failed to read DXF: {str(e)}'}), 422

    msp = doc.modelspace()

    CUTTABLE = {'LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE', 'SPLINE', 'ELLIPSE'}

    cut_entities = []
    total_cut_length = 0.0
    hole_count = 0
    open_contours = 0

    for entity in msp:
        t = entity.dxftype()
        if t not in CUTTABLE:
            continue

        layer = entity.dxf.layer if entity.dxf.hasattr('layer') else '0'
        color = entity_color(layer)

        if t == 'LINE':
            dx = entity.dxf.end.x - entity.dxf.start.x
            dy = entity.dxf.end.y - entity.dxf.start.y
            length = math.sqrt(dx*dx + dy*dy)
            total_cut_length += length
            cut_entities.append({'type': t, 'entity': entity, 'color': color})

        elif t == 'CIRCLE':
            length = 2 * math.pi * entity.dxf.radius
            total_cut_length += length
            hole_count += 1
            cut_entities.append({'type': t, 'entity': entity, 'color': '#378ADD'})

        elif t == 'ARC':
            length = arc_length(entity.dxf.radius, entity.dxf.start_angle, entity.dxf.end_angle)
            total_cut_length += length
            cut_entities.append({'type': t, 'entity': entity, 'color': color})

        elif t == 'LWPOLYLINE':
            pts = list(entity.get_points('xy'))
            length = polyline_length(pts)
            if not entity.is_closed:
                open_contours += 1
            total_cut_length += length
            cut_entities.append({'type': t, 'entity': entity, 'color': color})

        elif t == 'POLYLINE':
            pts = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
            length = polyline_length(pts)
            total_cut_length += length
            cut_entities.append({'type': t, 'entity': entity, 'color': color})

        elif t in ('SPLINE', 'ELLIPSE'):
            try:
                pts = list(entity.flattening(0.1))
                length = polyline_length(pts)
                total_cut_length += length
                cut_entities.append({'type': t, 'entity': entity, 'color': color})
            except Exception:
                pass

    extmin = doc.header.get('$EXTMIN', None)
    extmax = doc.header.get('$EXTMAX', None)

    if extmin and extmax:
        min_x, min_y = extmin[0], extmin[1]
        max_x, max_y = extmax[0], extmax[1]
    else:
        all_x, all_y = [], []
        for ce in cut_entities:
            e = ce['entity']
            t = e.dxftype()
            if t == 'LINE':
                all_x += [e.dxf.start.x, e.dxf.end.x]
                all_y += [e.dxf.start.y, e.dxf.end.y]
            elif t in ('CIRCLE', 'ARC'):
                all_x += [e.dxf.center.x - e.dxf.radius, e.dxf.center.x + e.dxf.radius]
                all_y += [e.dxf.center.y - e.dxf.radius, e.dxf.center.y + e.dxf.radius]
        min_x = min(all_x) if all_x else 0
        max_x = max(all_x) if all_x else 100
        min_y = min(all_y) if all_y else 0
        max_y = max(all_y) if all_y else 100

    bbox_w = max_x - min_x
    bbox_h = max_y - min_y

    SVG_SIZE = 400
    margin = 20
    scale_x = (SVG_SIZE - 2 * margin) / bbox_w if bbox_w > 0 else 1
    scale_y = (SVG_SIZE - 2 * margin) / bbox_h if bbox_h > 0 else 1
    scale = min(scale_x, scale_y)
    canvas_h = SVG_SIZE

    ox = min_x - margin / scale
    oy = min_y - margin / scale

    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{SVG_SIZE}" height="{SVG_SIZE}" style="background:#0f1117">'
        f'<rect width="{SVG_SIZE}" height="{SVG_SIZE}" fill="#0f1117"/>'
    ]

    for ce in cut_entities:
        el = entity_to_svg_element(ce['entity'], ce['color'], scale, ox, oy, canvas_h)
        if el:
            svg_lines.append(el)

    svg_lines.append('</svg>')
    svg_content = '\n'.join(svg_lines)

    svg_filename = f'{file_id}.svg'
    svg_path = os.path.join(UPLOAD_DIR, svg_filename)
    with open(svg_path, 'w') as svg_file:
        svg_file.write(svg_content)

    os.unlink(tmp_path)

    return jsonify({
        'bbox_w': round(bbox_w, 2),
        'bbox_h': round(bbox_h, 2),
        'cut_length': round(total_cut_length, 2),
        'entity_count': len(cut_entities),
        'hole_count': hole_count,
        'open_contours': open_contours,
        'svg_path': svg_path,
        'svg_content': svg_content,
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'dxf-parser'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
