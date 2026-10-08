
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8'));

const COLOURS = ['black', 'blue', 'silver', 'brown', 'green', 'white', 'grey', 'gray', 'gold', 'red', 'orange', 'navy', 'rose'];

const BY_STYLE = {
  analog:      { movement: 'Quartz (Analog)',          caseSize: '40 mm', waterResistance: '30 m' },
  chronograph: { movement: 'Quartz Chronograph',       caseSize: '44 mm', waterResistance: '50 m' },
  sports:      { movement: 'Quartz',                   caseSize: '45 mm', waterResistance: '100 m' },
  digital:     { movement: 'Quartz (Digital)',         caseSize: '43 mm', waterResistance: '50 m' },
  automatic:   { movement: 'Automatic (Self-winding)', caseSize: '41 mm', waterResistance: '50 m' }
};

function dialColour(name) {
  const words = name.toLowerCase().split(/\s+/);
  const found = COLOURS.find(colour => words.includes(colour));
  if (!found) return '';
  return found === 'gray' ? 'Grey' : found[0].toUpperCase() + found.slice(1);
}

function starterSpecs(product) {
  const style = (product.category || '').trim().toLowerCase();
  const name = (product.name || '').toLowerCase();
  const base = BY_STYLE[style] || { movement: 'Quartz' };
  const rugged = style === 'digital' || style === 'sports';

  const specs = {
    movement: base.movement,
    caseSize: base.caseSize,
    caseMaterial: rugged ? 'Resin' : 'Stainless Steel',
    strapMaterial: rugged ? 'Resin' : (name.includes('silver') || name.includes('steel') ? 'Stainless Steel' : 'Leather'),
    dialColor: dialColour(product.name || ''),
    glass: 'Mineral Glass',
    waterResistance: base.waterResistance,
    warranty: '2 Years'
  };

  // leave out anything we have no value for
  return Object.fromEntries(Object.entries(specs).filter(([, value]) => value));
}

let updated = 0;
for (const product of db.products) {
  if (product.specs && Object.keys(product.specs).length > 0) continue;
  product.specs = starterSpecs(product);
  updated++;
}

fs.writeFileSync(file, JSON.stringify(db, null, 2));
console.log(`Added starter specifications to ${updated} of ${db.products.length} products.`);
