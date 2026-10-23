// Technical details shown in the "Specifications" table on the product page.
// Every field is optional: only the ones that are filled in are displayed.
export interface ProductSpecs {
  movement?: string;
  caseSize?: string;
  caseMaterial?: string;
  strapMaterial?: string;
  dialColor?: string;
  glass?: string;
  waterResistance?: string;
  warranty?: string;
}

// One list that drives both the product page (labels) and the admin form
// (labels + example text), so the two can never drift apart.
export const SPEC_FIELDS: { key: keyof ProductSpecs; label: string; placeholder: string }[] = [
  { key: 'movement', label: 'Movement', placeholder: 'e.g. Quartz, Automatic' },
  { key: 'caseSize', label: 'Case size', placeholder: 'e.g. 42 mm' },
  { key: 'caseMaterial', label: 'Case material', placeholder: 'e.g. Stainless Steel' },
  { key: 'strapMaterial', label: 'Strap', placeholder: 'e.g. Leather, Resin' },
  { key: 'dialColor', label: 'Dial colour', placeholder: 'e.g. Black' },
  { key: 'glass', label: 'Glass', placeholder: 'e.g. Mineral, Sapphire' },
  { key: 'waterResistance', label: 'Water resistance', placeholder: 'e.g. 50 m' },
  { key: 'warranty', label: 'Warranty', placeholder: 'e.g. 2 Years' }
];

export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  description: string;
  stock: number;
  specs?: ProductSpecs;

  // Kept up to date by the server from the real customer reviews.
  // Missing = no reviews yet.
  ratingAverage?: number;
  ratingCount?: number;
    // Soft delete: product stays in db.json but is hidden from the shop.
  isDeleted?: boolean;
  deletedAt?: string;
}