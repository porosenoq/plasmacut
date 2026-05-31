export const MATERIALS = {
  'mild_steel':      { label: 'Mild steel',      basePrice: 1.59, density: 7.85, laserMax: 20, plasmaMax: 50 },
  'stainless_steel': { label: 'Stainless steel', basePrice: 4.10, density: 8.0,  laserMax: 12, plasmaMax: 30 },
  'aluminium':       { label: 'Aluminium',        basePrice: 3.40, density: 2.7,  laserMax: 15, plasmaMax: 20 },
  'brass':           { label: 'Brass',            basePrice: 7.60, density: 8.5,  laserMax: 8,  plasmaMax: 15 },
  'acrylic':         { label: 'Acrylic',          basePrice: 2.10, density: 1.18, laserMax: 25, plasmaMax: null },
};

export const THICKNESSES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

// Plasma speeds (m/s) per thickness — calibrated to supplier rates
const PLASMA_SPEED_MPS = {
  1: 0.083, 2: 0.067, 3: 0.050, 4: 0.040, 5: 0.033,
  6: 0.025, 8: 0.017, 10: 0.013, 12: 0.010, 15: 0.007, 20: 0.005,
};

// Laser is ~60% the speed of plasma
const LASER_SPEED_MULT = 0.60;

// Machine rates €/min — matched to supplier base pricing
const PLASMA_MACHINE_RATE = 5.28;
const LASER_MACHINE_RATE  = 8.00;

// Your reseller margin on top of supplier cost (15%)
const RESELLER_MARGIN = 0.15;

// VAT rate
const VAT_RATE = 0.20;

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

  // --- Supplier base cost (what you pay them) ---
  const areaM2       = (bboxWmm / 1000) * (bboxHmm / 1000);
  const volumeM3     = areaM2 * (thicknessMm / 1000);
  const weightKg     = volumeM3 * mat.density * 1000;
  const materialCost = weightKg * mat.basePrice;

  const cutLengthM  = cutLengthMm / 1000;
  const plasmaSpeed = PLASMA_SPEED_MPS[thicknessMm] || 0.005;
  const speed       = method === 'laser' ? plasmaSpeed * LASER_SPEED_MULT : plasmaSpeed;
  const machineRate = method === 'laser' ? LASER_MACHINE_RATE : PLASMA_MACHINE_RATE;
  const cutTimeSec  = cutLengthM / speed;
  const cutCost     = (cutTimeSec / 60) * machineRate;

  const setupFee    = 0.16;

  const supplierUnitCost = materialCost + cutCost + setupFee;

  // --- Your selling price ---
  const unitPriceExVat = supplierUnitCost * (1 + RESELLER_MARGIN);

  // Quantity discounts
  const qtyDiscount = quantity >= 50 ? 0.85 : quantity >= 20 ? 0.90 : quantity >= 10 ? 0.95 : 1.0;

  const totalExVat = unitPriceExVat * quantity * qtyDiscount;
  const vatAmount  = totalExVat * VAT_RATE;
  const totalIncVat = totalExVat + vatAmount;

  return {
    // Cost breakdown
    unit_material_cost:   +materialCost.toFixed(2),
    unit_cutting_cost:    +cutCost.toFixed(2),
    setup_fee:            +setupFee.toFixed(2),
    supplier_unit_cost:   +supplierUnitCost.toFixed(2),

    // Your selling price
    reseller_margin_pct:  `${(RESELLER_MARGIN * 100).toFixed(0)}%`,
    unit_price:           +unitPriceExVat.toFixed(2),
    quantity_discount:    qtyDiscount < 1 ? `${((1 - qtyDiscount) * 100).toFixed(0)}%` : null,

    // Totals
    total_ex_vat:         +totalExVat.toFixed(2),
    vat_rate:             `${(VAT_RATE * 100).toFixed(0)}%`,
    vat_amount:           +vatAmount.toFixed(2),
    total_price:          +totalIncVat.toFixed(2),

    // Info
    cut_time_seconds:     Math.round(cutTimeSec),
    weight_kg:            +weightKg.toFixed(3),
  };
}
