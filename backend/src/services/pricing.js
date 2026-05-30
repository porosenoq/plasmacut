export const MATERIALS = {
  'mild_steel':      { label: 'Mild steel',      basePrice: 1.2,  density: 7.85, laserMax: 20, plasmaMax: 50 },
  'stainless_steel': { label: 'Stainless steel', basePrice: 3.8,  density: 8.0,  laserMax: 12, plasmaMax: 30 },
  'aluminium':       { label: 'Aluminium',        basePrice: 2.9,  density: 2.7,  laserMax: 15, plasmaMax: 20 },
  'brass':           { label: 'Brass',            basePrice: 6.5,  density: 8.5,  laserMax: 8,  plasmaMax: 15 },
  'acrylic':         { label: 'Acrylic',          basePrice: 1.8,  density: 1.18, laserMax: 25, plasmaMax: null },
};

export const THICKNESSES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

const LASER_SPEED_MPS = {
  1: 0.05, 2: 0.038, 3: 0.028, 4: 0.022, 5: 0.016,
  6: 0.012, 8: 0.009, 10: 0.007, 12: 0.005, 15: 0.004, 20: 0.003,
};

const PLASMA_SPEED_MULT = 1.8;
const LASER_MACHINE_RATE = 1.80;
const PLASMA_MACHINE_RATE = 0.90;

export function calculateQuote({ material, thicknessMm, method, cutLengthMm, bboxWmm, bboxHmm, quantity }) {
  const mat = MATERIALS[material];
  if (!mat) throw new Error(`Unknown material: ${material}`);

  if (method === 'plasma' && mat.plasmaMax === null) {
    throw new Error(`${mat.label} cannot be plasma cut`);
  }
  if (method === 'laser' && thicknessMm > mat.laserMax) {
    throw new Error(`${mat.label} at ${thicknessMm}mm exceeds laser max of ${mat.laserMax}mm`);
  }
  if (method === 'plasma' && thicknessMm > mat.plasmaMax) {
    throw new Error(`${mat.label} at ${thicknessMm}mm exceeds plasma max of ${mat.plasmaMax}mm`);
  }

  const areaM2 = (bboxWmm / 1000) * (bboxHmm / 1000);
  const volumeM3 = areaM2 * (thicknessMm / 1000);
  const weightKg = volumeM3 * mat.density * 1000;
  const materialCost = weightKg * mat.basePrice * 12;

  const cutLengthM = cutLengthMm / 1000;
  const speedMps = LASER_SPEED_MPS[thicknessMm] || 0.003;
  const machineRate = method === 'laser' ? LASER_MACHINE_RATE : PLASMA_MACHINE_RATE;
  const speedActual = method === 'plasma' ? speedMps * PLASMA_SPEED_MULT : speedMps;
  const cutTimeSeconds = cutLengthM / speedActual;
  const cutCost = (cutTimeSeconds / 60) * machineRate;

  const setupFee = 5.00;
  const unitPrice = materialCost + cutCost + setupFee;
  const quantityDiscount = quantity >= 50 ? 0.85 : quantity >= 20 ? 0.90 : quantity >= 10 ? 0.95 : 1.0;
  const totalPrice = unitPrice * quantity * quantityDiscount;

  return {
    unit_material_cost: +materialCost.toFixed(2),
    unit_cutting_cost: +cutCost.toFixed(2),
    setup_fee: setupFee,
    unit_price: +unitPrice.toFixed(2),
    total_price: +totalPrice.toFixed(2),
    quantity_discount: quantityDiscount < 1 ? `${((1 - quantityDiscount) * 100).toFixed(0)}%` : null,
    cut_time_seconds: Math.round(cutTimeSeconds),
    weight_kg: +weightKg.toFixed(3),
  };
}
