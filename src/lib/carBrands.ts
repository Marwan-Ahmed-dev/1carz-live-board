/**
 * قائمة شاملة بـ brands و models للسيارات المتداولة في السوق المصري.
 *
 * Static catalog — بيُستخدم كـ base suggestions في فورم السجل السعري
 * (/market/new + /market/[id]). الـ suggestions الديناميكية (من الـ entries
 * الموجودة في الـ DB) بتتدمج فوق القايمة دي على مستوى الـ component.
 *
 * الترتيب: الأكثر شيوعاً في السوق المصري الأول، يليه الـ European premium،
 * وبعدين باقي الـ brands. الـ names بالـ English canonical (نفس طريقة كتابة
 * الـ entries في الـ DB) عشان الـ dedup + merge يطلعوا سلس.
 *
 * صيانة الـ list:
 *   - لو عايز تضيف brand/model جديد، أضف هنا + commit.
 *   - الـ users لسه يقدروا يكتبوا brand/model free-text (مش لازم يختاروا من
 *     الـ datalist) — الـ list دي للـ autocomplete فقط.
 */

export interface Brand {
  /** Brand name in English (canonical, e.g. "BMW") */
  name: string;
  /** Optional Arabic display name (e.g. "بي إم دبليو") */
  nameAr?: string;
  /** Common models for this brand. Should be in canonical English form. */
  models: string[];
}

export const BRANDS: Brand[] = [
  // ===== الأكثر شيوعاً في السوق المصري =====
  {
    name: 'Toyota',
    nameAr: 'تويوتا',
    models: ['Corolla', 'Camry', 'Yaris', 'Hilux', 'Land Cruiser', 'Prado', 'RAV4', 'C-HR', 'Fortuner', 'Avanza'],
  },
  {
    name: 'Hyundai',
    nameAr: 'هيونداي',
    models: ['Accent', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Creta', 'Venue', 'i10', 'i20', 'i30'],
  },
  {
    name: 'Nissan',
    nameAr: 'نيسان',
    models: ['Sunny', 'Sentra', 'Altima', 'Maxima', 'Juke', 'X-Trail', 'Pathfinder', 'Patrol', 'Kicks', 'Terrano'],
  },
  {
    name: 'Kia',
    nameAr: 'كيا',
    models: ['Picanto', 'Rio', 'Cerato', 'Optima', 'Sportage', 'Sorento', 'Seltos', 'Stonic', 'Carens', 'Pegas'],
  },
  {
    name: 'Chevrolet',
    nameAr: 'شيفروليه',
    models: ['Optra', 'Cruze', 'Malibu', 'Impala', 'Aveo', 'Spark', 'Captiva', 'Traverse', 'Tahoe', 'Silverado'],
  },
  // ===== Chinese brands (شائعة جداً في مصر) =====
  {
    name: 'MG',
    nameAr: 'إم جي',
    models: ['MG5', 'MG6', 'MG ZS', 'MG HS', 'MG RX5', 'MG Marvel R', 'MG One', 'MG RX8'],
  },
  {
    name: 'Chery',
    nameAr: 'شيري',
    models: ['Tiggo 2', 'Tiggo 3', 'Tiggo 7', 'Tiggo 8', 'Arrizo 5', 'Arrizo 6', 'Tiggo 7 Pro', 'Tiggo 8 Pro'],
  },
  {
    name: 'Geely',
    nameAr: 'جيلي',
    models: ['Emgrand', 'Coolray', 'Azkarra', 'Tugella', 'Okavango', 'Emgrand X7', 'Preface', 'GX3 Pro'],
  },
  {
    name: 'BYD',
    nameAr: 'بي واي دي',
    models: ['Atto 3', 'Dolphin', 'Seal', 'Han', 'Tang', 'Song Plus', 'Yuan Plus', 'F3'],
  },
  {
    name: 'Haval',
    nameAr: 'هافال',
    models: ['Jolion', 'H6', 'H9', 'F7', 'F7x', 'Dargo', 'H2', 'H4'],
  },
  {
    name: 'Changan',
    nameAr: 'شانجان',
    models: ['Alsvin', 'Eado', 'CS35', 'CS55', 'CS75', 'UNI-T', 'UNI-V', 'CS15'],
  },
  {
    name: 'Jetour',
    nameAr: 'جيتور',
    models: ['X70', 'X90', 'T1', 'T2', 'Dashing', 'X70 Plus', 'X95'],
  },
  // ===== European premium =====
  {
    name: 'BMW',
    nameAr: 'بي إم دبليو',
    models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7'],
  },
  {
    name: 'Mercedes-Benz',
    nameAr: 'مرسيدس بنز',
    models: ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'CLA', 'CLS'],
  },
  {
    name: 'Audi',
    nameAr: 'أودي',
    models: ['A3', 'A4', 'A6', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT'],
  },
  {
    name: 'Volkswagen',
    nameAr: 'فولكس فاجن',
    models: ['Golf', 'Polo', 'Passat', 'Tiguan', 'T-Roc', 'T-Cross', 'Touareg', 'Jetta', 'Bora'],
  },
  {
    name: 'Porsche',
    nameAr: 'بورش',
    models: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', '718 Boxster', '718 Cayman'],
  },
  // ===== باقي الـ brands (مرتبة أبجدياً) =====
  {
    name: 'Citroen',
    nameAr: 'ستروين',
    models: ['C3', 'C-Elysée', 'C4', 'C5 Aircross', 'Berlingo', 'C4 Cactus'],
  },
  {
    name: 'DS',
    nameAr: 'دي إس',
    models: ['DS3', 'DS7', 'DS9', 'DS4'],
  },
  {
    name: 'Fiat',
    nameAr: 'فيات',
    models: ['Tipo', 'Punto', '500', '500X', 'Panda', 'Doblo', 'Fullback'],
  },
  {
    name: 'Ford',
    nameAr: 'فورد',
    models: ['Focus', 'Fusion', 'Mondeo', 'EcoSport', 'Escape', 'Explorer', 'Edge', 'F-150', 'Mustang'],
  },
  {
    name: 'Honda',
    nameAr: 'هوندا',
    models: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'City', 'Pilot'],
  },
  {
    name: 'Jeep',
    nameAr: 'جيب',
    models: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator'],
  },
  {
    name: 'Land Rover',
    nameAr: 'لاند روفر',
    models: ['Defender', 'Discovery', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar'],
  },
  {
    name: 'Lexus',
    nameAr: 'لكزس',
    models: ['ES', 'IS', 'LS', 'NX', 'RX', 'LX', 'UX', 'CT'],
  },
  {
    name: 'Mazda',
    nameAr: 'مازدا',
    models: ['2', '3', '6', 'CX-3', 'CX-5', 'CX-9', 'MX-5', 'CX-30'],
  },
  {
    name: 'Mitsubishi',
    nameAr: 'ميتسوبيشي',
    models: ['Lancer', 'Attrage', 'ASX', 'Eclipse Cross', 'Outlander', 'Pajero', 'L200', 'Mirage'],
  },
  {
    name: 'Peugeot',
    nameAr: 'بيجو',
    models: ['208', '301', '308', '508', '2008', '3008', '5008', 'Partner'],
  },
  {
    name: 'Proton',
    nameAr: 'بروتون',
    models: ['Saga', 'Persona', 'Exora', 'X50', 'X70', 'Iriz'],
  },
  {
    name: 'Renault',
    nameAr: 'رينو',
    models: ['Logan', 'Megane', 'Fluence', 'Duster', 'Captur', 'Kadjar', 'Koleos', 'Clio', 'Symbol'],
  },
];

/**
 * رجّع قايمة الـ models الـ canonical للـ brand.
 * الـ match بيكون case-insensitive على الـ English name.
 * لو الـ brand مش موجود (free-text أو brand جديد) بترجع [].
 */
export function getModelsForBrand(brandName: string): string[] {
  if (!brandName) return [];
  const brand = BRANDS.find((b) => b.name.toLowerCase() === brandName.toLowerCase());
  return brand?.models ?? [];
}

/**
 * رجّع كل الـ brand names الـ canonical (English).
 * الـ components بتدمج ده فوق الـ dynamic suggestions من الـ DB.
 */
export function getAllBrandNames(): string[] {
  return BRANDS.map((b) => b.name);
}