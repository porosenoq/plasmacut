import fs from 'fs';
import path from 'path';

// Minimal DXF parser - reads entities directly from DXF text format
// Handles LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, SPLINE

function parseDxf(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const entities = [];
  let i = 0;

  // Helper to read pairs of (group code, value)
  function readPairs() {
    const pairs = [];
    while (i < lines.length) {
      const code = lines[i]?.trim();
      const value = lines[i + 1]?.trim();
      if (code === undefined || value === undefined) break;
      pairs.push([parseInt(code), value]);
      i += 2;
      if (code === '0' && pairs.length > 1) { i -= 2; break; }
    }
    return pairs;
  }

  // Scan for ENTITIES section
  while (i < lines.length) {
    if (lines[i]?.trim() === '0' && lines[i + 1]?.trim() === 'SECTION') {
      i += 2;
      while (i < lines.length) {
        if (lines[i]?.trim() === '2' && lines[i + 1]?.trim() === 'ENTITIES') {
          i += 2; break;
        }
        i++;
      }
      break;
    }
    i++;
  }

  // Parse entities
  while (i < lines.length) {
    const code = lines[i]?.trim();
    const value = lines[i + 1]?.trim();
    if (!code || !value) { i += 2; continue; }

    if (code === '0' && value === 'ENDSEC') break;

    if (code === '0' && ['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'SPLINE'].includes(value)) {
      const type = value;
      i += 2;
      const props = {};
      const vertices = [];
      let currentVertex = {};

      while (i < lines.length) {
        const c = lines[i]?.trim();
        const v = lines[i + 1]?.trim();
        if (!c || !v) { i += 2; continue; }
        if (c === '0') break;

        const num = parseInt(c);
        const fnum = parseFloat(v);

        if (num === 8) props.layer = v;
        else if (num === 10) props.x1 = fnum;
        else if (num === 20) props.y1 = fnum;
        else if (num === 11) props.x2 = fnum;
        else if (num === 21) props.y2 = fnum;
        else if (num === 40) props.r = fnum;
        else if (num === 50) props.startAngle = fnum;
        else if (num === 51) props.endAngle = fnum;
        else if (num === 70) props.flags = parseInt(v);
        else if (num === 90) props.vertexCount = parseInt(v);

        // LWPOLYLINE vertices
        if (type === 'LWPOLYLINE') {
          if (num === 10) { currentVertex = { x: fnum }; }
          else if (num === 20) { currentVertex.y = fnum; vertices.push({ ...currentVertex }); }
        }

        i += 2;
      }

      props.vertices = vertices;
      entities.push({ type, ...props });
    } else {
      i += 2;
    }
  }

  return entities;
}

function deg2rad(d) { return d * Math.PI / 180; }
function dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }

function arcLength(r, startAngle, endAngle) {
  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;
  return deg2rad(sweep) * Math.abs(r);
}

function polylineLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }
  return total;
}

function entityColor(layer = '') {
  const l = layer.toLowerCase();
  if (/cut|outline|contour|profile/.test(l)) return '#5DCAA5';
  if (/hole|drill|circle|bore/.test(l)) return '#378ADD';
  if (/bend|fold|crease/.test(l)) return '#EF9F27';
  if (/anno|text|dim|note/.test(l)) return '#888780';
  return '#5DCAA5';
}

export function parseDxfFile(filePath) {
  const entities = parseDxf(filePath);

  let totalCutLength = 0;
  let holeCount = 0;
  let openContours = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const svgElements = [];

  function expand(x, y) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  for (const e of entities) {
    const color = entityColor(e.layer);

    if (e.type === 'LINE') {
      const len = dist(e.x1 ?? 0, e.y1 ?? 0, e.x2 ?? 0, e.y2 ?? 0);
      totalCutLength += len;
      expand(e.x1 ?? 0, e.y1 ?? 0);
      expand(e.x2 ?? 0, e.y2 ?? 0);
      svgElements.push({ type: 'line', x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, color });
    }

    else if (e.type === 'CIRCLE') {
      const cx = e.x1 ?? 0, cy = e.y1 ?? 0, r = e.r ?? 1;
      totalCutLength += 2 * Math.PI * r;
      holeCount++;
      expand(cx - r, cy - r);
      expand(cx + r, cy + r);
      svgElements.push({ type: 'circle', cx, cy, r, color: '#378ADD' });
    }

    else if (e.type === 'ARC') {
      const cx = e.x1 ?? 0, cy = e.y1 ?? 0, r = e.r ?? 1;
      const sa = e.startAngle ?? 0, ea = e.endAngle ?? 90;
      totalCutLength += arcLength(r, sa, ea);
      expand(cx - r, cy - r);
      expand(cx + r, cy + r);
      svgElements.push({ type: 'arc', cx, cy, r, startAngle: sa, endAngle: ea, color });
    }

    else if (e.type === 'LWPOLYLINE') {
      const pts = e.vertices;
      if (pts.length >= 2) {
        const len = polylineLength(pts);
        totalCutLength += len;
        const closed = !!(e.flags & 1);
        if (!closed) openContours++;
        pts.forEach(p => expand(p.x, p.y));
        svgElements.push({ type: 'polyline', points: pts, closed, color });
      }
    }
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  // Generate SVG
  const SVG_SIZE = 400;
  const margin = 20;
  const scaleX = bboxW > 0 ? (SVG_SIZE - 2 * margin) / bboxW : 1;
  const scaleY = bboxH > 0 ? (SVG_SIZE - 2 * margin) / bboxH : 1;
  const scale = Math.min(scaleX, scaleY);

  const tx = (x) => margin + (x - minX) * scale;
  const ty = (y) => SVG_SIZE - margin - (y - minY) * scale;

  let svgBody = '';

  for (const el of svgElements) {
    if (el.type === 'line') {
      svgBody += `<line x1="${tx(el.x1).toFixed(2)}" y1="${ty(el.y1).toFixed(2)}" x2="${tx(el.x2).toFixed(2)}" y2="${ty(el.y2).toFixed(2)}" stroke="${el.color}" stroke-width="1.2" fill="none"/>`;
    }
    else if (el.type === 'circle') {
      svgBody += `<circle cx="${tx(el.cx).toFixed(2)}" cy="${ty(el.cy).toFixed(2)}" r="${(el.r * scale).toFixed(2)}" stroke="${el.color}" stroke-width="1.2" fill="none"/>`;
    }
    else if (el.type === 'arc') {
      const sa = deg2rad(el.startAngle);
      const ea = deg2rad(el.endAngle);
      const x1 = tx(el.cx + el.r * Math.cos(sa));
      const y1 = ty(el.cy + el.r * Math.sin(sa));
      const x2 = tx(el.cx + el.r * Math.cos(ea));
      const y2 = ty(el.cy + el.r * Math.sin(ea));
      let sweep = el.endAngle - el.startAngle;
      if (sweep < 0) sweep += 360;
      const large = sweep > 180 ? 1 : 0;
      const r = el.r * scale;
      svgBody += `<path d="M${x1.toFixed(2)},${y1.toFixed(2)} A${r.toFixed(2)},${r.toFixed(2)} 0 ${large},0 ${x2.toFixed(2)},${y2.toFixed(2)}" stroke="${el.color}" stroke-width="1.2" fill="none"/>`;
    }
    else if (el.type === 'polyline') {
      const pts = el.points;
      if (pts.length < 2) continue;
      let d = `M${tx(pts[0].x).toFixed(2)},${ty(pts[0].y).toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L${tx(pts[i].x).toFixed(2)},${ty(pts[i].y).toFixed(2)}`;
      }
      if (el.closed) d += ' Z';
      svgBody += `<path d="${d}" stroke="${el.color}" stroke-width="1.2" fill="none"/>`;
    }
  }

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_SIZE}" height="${SVG_SIZE}" style="background:#0f1117"><rect width="${SVG_SIZE}" height="${SVG_SIZE}" fill="#0f1117"/>${svgBody}</svg>`;

  return {
    bbox_w: +bboxW.toFixed(2),
    bbox_h: +bboxH.toFixed(2),
    cut_length: +totalCutLength.toFixed(2),
    entity_count: entities.length,
    hole_count: holeCount,
    open_contours: openContours,
    svg_content: svgContent,
  };
}
