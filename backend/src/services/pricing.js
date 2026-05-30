export const MATERIALS = {
  'mild_steel':      { label: 'Mild steel',      basePrice: 1.63, density: 7.85, laserMax: 20, plasmaMax: 50 },
  'stainless_steel': { label: 'Stainless steel', basePrice: 4.20, density: 8.0,  laserMax: 12, plasmaMax: 30 },
  'aluminium':       { label: 'Aluminium',        basePrice: 3.50, density: 2.7,  laserMax: 15, plasmaMax: 20 },
  'brass':           { label: 'Brass',            basePrice: 7.80, density: 8.5,  laserMax: 8,  plasmaMax: 15 },
  'acrylic':         { label: 'Acrylic',          basePrice: 2.20, density: 1.18, laserMax: 25, plasmaMax: null },
};

export const THICKNESSES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

// Plasma speeds at each thickness (m/s) — calibrated to local market
const PLASMA_SPEED_MPS = {
  1: 0.083, 2: 0.067, 3: 0.050, 4: 0.040, 5: 0.033,
  6: 0.025, 8: 0.017, 10: 0.013, 12: 0.010, 15: 0.007, 20: 0.005,
};

// Laser is ~40% slower than plasma
const LASER_SPEED_MULT = 0.60;

// Machine rates €/min — calibrated from local market data
const PLASMA_MACHINE_RATE = 5.76;
const LASER_MACHINE_RATE  = 8.50; // laser costs more per minute

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

  // Material cost: weight × price per kg
  const areaM2    = (bboxWmm / 1000) * (bboxHmm / 1000);
  const volumeM3  = areaM2 * (thicknessMm / 1000);
  const weightKg  = volumeM3 * mat.density * 1000;
  const materialCost = weightKg * mat.basePrice;

  // Cutting cost: machine time × rate
  const cutLengthM   = cutLengthMm / 1000;
  const plasmaSpeed  = PLASMA_SPEED_MPS[thicknessMm] || 0.005;
  const speed        = method === 'laser' ? plasmaSpeed * LASER_SPEED_MULT : plasmaSpeed;
  const machineRate  = method === 'laser' ? LASER_MACHINE_RATE : PLASMA_MACHINE_RATE;
  const cutTimeSec   = cutLengthM / speed;
  const cutCost      = (cutTimeSec / 60) * machineRate;

  // Small fixed setup fee
  const setupFee = 0.38;

  const unitPrice = materialCost + cutCost + setupFee;

  // Quantity discounts
  const quantityDiscount = quantity >= 50 ? 0.85 : quantity >= 20 ? 0.90 : quantity >= 10 ? 0.95 : 1.0;
  const totalPrice = unitPrice * quantity * quantityDiscount;

  return {
    unit_material_cost: +materialCost.toFixed(2),
    unit_cutting_cost:  +cutCost.toFixed(2),
    setup_fee:          setupFee,
    unit_price:         +unitPrice.toFixed(2),
    total_price:        +totalPrice.toFixed(2),
    quantity_discount:  quantityDiscount < 1 ? `${((1 - quantityDiscount) * 100).toFixed(0)}%` : null,
    cut_time_seconds:   Math.round(cutTimeSec),
    weight_kg:          +weightKg.toFixed(3),
  };
}
