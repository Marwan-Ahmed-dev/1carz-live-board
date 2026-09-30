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

  // ===== باقي الـ brands — كل الـ brands الـ 151 مع موديلاتها =====
  // الـ brands دي مش معروفة بقوة في السوق المصري لكن اليوزر ممكن يحتاج يضيف entry ليها.
  // الـ models هنا مرجعية عالمية — اليوزر يقدر يعدّل أو يضيف على free-text.

  // Hypercar / exotic
  {
    name: 'Bugatti',
    nameAr: 'بوغاتي',
    models: ['Chiron', 'Veyron', 'Divo', 'Centodieci', 'Mistral', 'Bolide', 'Tourbillon'],
  },
  {
    name: 'Pagani',
    nameAr: 'باغاني',
    models: ['Huayra', 'Zonda', 'Utopia'],
  },
  {
    name: 'Koenigsegg',
    nameAr: 'كوينيجسيج',
    models: ['Jesko', 'Gemera', 'Regera', 'Agera', 'CC850'],
  },

  // Additional Chinese niche
  {
    name: 'Haojiang',
    nameAr: 'هاوجيانج',
    models: ['HJ150', 'HJ200', 'HJ250', 'HJ300'],
  },
  {
    name: 'Lynk & Co',
    nameAr: 'لينك آند كو',
    models: ['01', '02', '03', '05', '06', '09', '01 PHEV'],
  },

  // Italian niche
  {
    name: 'Abarth',
    nameAr: 'أبارث',
    models: ['595', '595C', '595 Competizione', '695', '124 Spider', '124 GT'],
  },
  {
    name: 'Alfa Romeo',
    nameAr: 'ألفا روميو',
    models: ['Giulietta', 'Giulia', 'Stelvio', 'Tonale', 'Stelvio Veloce', '4C', 'Mito', '159', '147', '156', 'Brera'],
  },
  {
    name: 'Ferrari',
    nameAr: 'فيراري',
    models: ['488', 'F8 Tributo', 'F8 Spider', 'Roma', 'Portofino', 'SF90 Stradale', '296 GTB', '812 Superfast', 'Purosangue', '458'],
  },
  {
    name: 'Lamborghini',
    nameAr: 'لامبورجيني',
    models: ['Huracán', 'Urus', 'Aventador', 'Revuelto', 'Gallardo', 'Murciélago', 'Diablo'],
  },
  {
    name: 'Maserati',
    nameAr: 'مازيراتي',
    models: ['Ghibli', 'Quattroporte', 'Levante', 'GranTurismo', 'Grecale', 'MC20', '3200 GT'],
  },
  {
    name: 'Lancia',
    nameAr: 'لانشيا',
    models: ['Ypsilon', 'Delta', 'Thema', 'Voyager'],
  },
  {
    name: 'Fiat',
    nameAr: 'فيات',
    models: ['Tipo', 'Punto', '500', '500X', '500L', 'Panda', 'Doblo', 'Fullback', 'Linea', 'Bravo'],
  },

  // British luxury / sport
  {
    name: 'Bentley',
    nameAr: 'بنتلي',
    models: ['Continental GT', 'Continental GTC', 'Bentayga', 'Flying Spur', 'Mulsanne', 'Bentayga Speed'],
  },
  {
    name: 'Aston Martin',
    nameAr: 'أستون مارتن',
    models: ['DB11', 'DB12', 'Vantage', 'DBS', 'DBX', 'Vanquish', 'Rapide', 'DB9'],
  },
  {
    name: 'McLaren',
    nameAr: 'ماكلارين',
    models: ['720S', '570S', 'GT', '765LT', 'Artura', 'P1', '650S', 'MP4-12C'],
  },
  {
    name: 'Lotus',
    nameAr: 'لوتس',
    models: ['Emira', 'Eletre', 'Evija', 'Exige', 'Elise'],
  },
  {
    name: 'Rolls-Royce',
    nameAr: 'رولز رويز',
    models: ['Phantom', 'Ghost', 'Wraith', 'Dawn', 'Cullinan', 'Spectre', 'Silver Shadow', 'Corniche'],
  },
  {
    name: 'Mini',
    nameAr: 'ميني',
    models: ['Cooper', 'Cooper S', 'Countryman', 'Clubman', 'Paceman', 'Roadster', 'One', 'JCW'],
  },

  // American
  {
    name: 'Cadillac',
    nameAr: 'كاديلاك',
    models: ['Escalade', 'XT5', 'XT4', 'CT5', 'CT4', 'XT6', 'Lyriq', 'CTS', 'SRX', 'ATS'],
  },
  {
    name: 'Buick',
    nameAr: 'بيوك',
    models: ['Enclave', 'Encore', 'Envision', 'LaCrosse', 'Regal', 'Verano', 'Lucerne'],
  },
  {
    name: 'Chrysler',
    nameAr: 'كرايسلر',
    models: ['300', 'Pacifica', 'Voyager', '200', 'Aspen', 'Sebring'],
  },
  {
    name: 'Dodge',
    nameAr: 'دودج',
    models: ['Charger', 'Challenger', 'Durango', 'Dart', 'Journey', 'Viper', 'Ram'],
  },
  {
    name: 'GMC',
    nameAr: 'جي إم سي',
    models: ['Yukon', 'Acadia', 'Terrain', 'Sierra', 'Canyon', 'Envoy'],
  },
  {
    name: 'Lincoln',
    nameAr: 'لينكولن',
    models: ['Navigator', 'Aviator', 'Corsair', 'Nautilus', 'MKZ', 'MKC', 'Continental', 'Town Car'],
  },
  {
    name: 'Tesla',
    nameAr: 'تسلا',
    models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck', 'Roadster', 'Model Q'],
  },
  {
    name: 'Hummer',
    nameAr: 'هامر',
    models: ['H1', 'H2', 'H3', 'EV', 'H3T'],
  },
  {
    name: 'Pontiac',
    nameAr: 'بونتياك',
    models: ['G6', 'G8', 'Vibe', 'Solstice', 'Firebird', 'Trans Am'],
  },
  {
    name: 'Mercury',
    nameAr: 'ميركوري',
    models: ['Grand Marquis', 'Mariner', 'Milan', 'Mountaineer', 'Sable'],
  },
  {
    name: 'Scion',
    nameAr: 'سيون',
    models: ['tC', 'xB', 'xD', 'FR-S', 'iA', 'iM'],
  },
  {
    name: 'Saturn',
    nameAr: 'ساتورن',
    models: ['Vue', 'Outlook', 'Aura', 'Sky', 'Ion'],
  },
  {
    name: 'Oldsmobile',
    nameAr: 'أولدموبيل',
    models: ['Alero', 'Intrigue', 'Bravada', 'Cutlass'],
  },
  {
    name: 'Plymouth',
    nameAr: 'بليموث',
    models: ['Prowler', 'Neon', 'Breeze', 'Voyager'],
  },

  // Japanese / Korean niche
  {
    name: 'Acura',
    nameAr: 'أكورا',
    models: ['MDX', 'RDX', 'TLX', 'Integra', 'TSX', 'TL', 'RL', 'NSX'],
  },
  {
    name: 'Infiniti',
    nameAr: 'إنفينيتي',
    models: ['QX50', 'QX55', 'QX60', 'QX70', 'QX80', 'Q50', 'Q60', 'QX30'],
  },
  {
    name: 'Subaru',
    nameAr: 'سوبارو',
    models: ['Forester', 'Outback', 'Crosstrek', 'Impreza', 'Legacy', 'Ascent', 'WRX', 'BRZ', 'Tribeca'],
  },
  {
    name: 'Suzuki',
    nameAr: 'سوزوكي',
    models: ['Swift', 'Vitara', 'Jimny', 'S-Cross', 'Baleno', 'Ciaz', 'Alto', 'Ertiga', 'XL7'],
  },
  {
    name: 'Daihatsu',
    nameAr: 'دايهاتسو',
    models: ['Terios', 'Sirion', 'Mira', 'Move', 'Copen', 'Gran Max'],
  },
  {
    name: 'Isuzu',
    nameAr: 'إيسوزو',
    models: ['D-Max', 'MU-X', 'Trooper', 'Ascender', 'Rodeo'],
  },
  {
    name: 'Genesis',
    nameAr: 'جينيسيس',
    models: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80', 'GV90'],
  },
  {
    name: 'SsangYong',
    nameAr: 'سانج يونج',
    models: ['Tivoli', 'Korando', 'Rexton', 'Musso', 'Torres', 'XLV'],
  },
  {
    name: 'KGM',
    nameAr: 'كي جي إم',
    models: ['Torres', 'Korando', 'Rexton', 'Tivoli'],
  },

  // Chinese — comprehensive coverage
  {
    name: 'Aito',
    nameAr: 'أيتو',
    models: ['M5', 'M7', 'M9', 'S7'],
  },
  {
    name: 'Arcfox',
    nameAr: 'أركفوكس',
    models: ['Alpha S', 'Alpha T', 'ECF', 'KaKa'],
  },
  {
    name: 'Avatr',
    nameAr: 'أفاتر',
    models: ['11', '12', '07', '06'],
  },
  {
    name: 'BAIC',
    nameAr: 'بايك',
    models: ['BJ40', 'BJ80', 'X7', 'EU5', 'X55', 'D50'],
  },
  {
    name: 'Bestune',
    nameAr: 'بيستون',
    models: ['T55', 'T77', 'T99', 'NAT', 'B70'],
  },
  {
    name: 'Borgward',
    nameAr: 'بورجوارد',
    models: ['BX5', 'BX6', 'BX7', 'BXi7'],
  },
  {
    name: 'Brilliance',
    nameAr: 'بريليانس',
    models: ['V5', 'V7', 'V3', 'M2', 'H530'],
  },
  {
    name: 'Chana',
    nameAr: 'تشانا',
    models: ['Benni', 'Alsvin', 'Eado', 'CS35', 'CS75'],
  },
  {
    name: 'Cupra',
    nameAr: 'كوبرا',
    models: ['Born', 'Formentor', 'Leon', 'Ateca', 'Tavascan'],
  },
  {
    name: 'Daewoo',
    nameAr: 'دايو',
    models: ['Lanos', 'Nubira', 'Leganza', 'Matiz', 'Gentra', 'Magnus'],
  },
  {
    name: 'Datsun',
    nameAr: 'داتسون',
    models: ['GO', 'GO+', 'redi-GO', 'on-DO', 'mi-DO'],
  },
  {
    name: 'Dayun',
    nameAr: 'دايون',
    models: ['Y5', 'Y6', 'Y7', 'Y8'],
  },
  {
    name: 'Deepal',
    nameAr: 'ديبال',
    models: ['S7', 'SL03', 'G318', 'S09'],
  },
  {
    name: 'DFSK',
    nameAr: 'دي إف إس كيه',
    models: ['Glory 580', 'Glory 500', 'Glory IX5', 'E5'],
  },
  {
    name: 'Dongfeng',
    nameAr: 'دونج فينج',
    models: ['580', 'AX7', 'T5 EVO', 'Rich 7', 'Fengon'],
  },
  {
    name: 'Dorcen',
    nameAr: 'دورسين',
    models: ['G70S', 'G60', 'E20', 'G80'],
  },
  {
    name: 'Emgrand',
    nameAr: 'إمجراند',
    models: ['X7', 'GS', 'GL', 'EC7', 'EC8'],
  },
  {
    name: 'Exeed',
    nameAr: 'إكسييد',
    models: ['LX', 'VX', 'TXL', 'RX', 'Yaoguang', 'Sterra ES'],
  },
  {
    name: 'FAW',
    nameAr: 'فاو',
    models: ['Bestune T55', 'Bestune T77', 'Junpai D60', 'Hongqi H5', 'Hongqi H9'],
  },
  {
    name: 'Forthing',
    nameAr: 'فورثينج',
    models: ['T5 EVO', 'T5', 'S50', 'S60', 'Joyear'],
  },
  {
    name: 'Foton',
    nameAr: 'فوتون',
    models: ['Tunland', 'Sauvana', 'View', 'Gratour'],
  },
  {
    name: 'Fuso',
    nameAr: 'فوسو',
    models: ['Canter', 'Fighter', 'Rosa'],
  },
  {
    name: 'GAC',
    nameAr: 'جي إيه سي',
    models: ['GS8', 'GS3', 'GN8', 'Empow', 'Trumpchi GA6', 'Aion S'],
  },
  {
    name: 'GAZ',
    nameAr: 'جاز',
    models: ['Volga', 'Siber', 'Gazelle NEXT', 'Sobol'],
  },
  {
    name: 'Golden Dragon',
    nameAr: 'جولدن دراجون',
    models: ['XML6126', 'XML6906', 'XML6601'],
  },
  {
    name: 'Great Wall',
    nameAr: 'جريت وول',
    models: ['Poer', 'Wingle 7', 'Pao', 'King Kong', 'Cannon'],
  },
  {
    name: 'Hafei',
    nameAr: 'هافي',
    models: ['Lobo', 'Minyi', 'Saibao', 'Princi'],
  },
  {
    name: 'Haima',
    nameAr: 'هايما',
    models: ['S5', 'S7', 'M3', 'M8', '8S'],
  },
  {
    name: 'Halawa',
    nameAr: 'حلاوة',
    models: ['H1', 'H2', 'H3'],
  },
  {
    name: 'Hanteng',
    nameAr: 'هانتنج',
    models: ['X5', 'X7', 'V7'],
  },
  {
    name: 'Haojue',
    nameAr: 'هاوجوي',
    models: ['HJ110', 'HJ125', 'HJ150'],
  },
  {
    name: 'Hawtai',
    nameAr: 'هاوتاي',
    models: ['Bolgheri', 'Laville', 'B11'],
  },
  {
    name: 'Hongqi',
    nameAr: 'هونج تشي',
    models: ['H5', 'H7', 'H9', 'E-HS9', 'HS5', 'HS7', 'L5', 'L9'],
  },
  {
    name: 'IM',
    nameAr: 'آي إم',
    models: ['L7', 'LS6', 'LS7'],
  },
  {
    name: 'Ineos',
    nameAr: 'إينيوس',
    models: ['Grenadier', 'Quartermaster'],
  },
  {
    name: 'JAC',
    nameAr: 'جاك',
    models: ['S3', 'S4', 'S5', 'S7', 'T6', 'iEVS4', 'JS4'],
  },
  {
    name: 'Jinbei',
    nameAr: 'جينبي',
    models: ['Haise', 'X30', 'S30', 'S50'],
  },
  {
    name: 'JMC',
    nameAr: 'جي إم سي',
    models: ['Yuhu 7', 'Yuhu 9', 'Tour'],
  },
  {
    name: 'Kaiyi',
    nameAr: 'كايي',
    models: ['E5', 'X3', 'X7 Pro'],
  },
  {
    name: 'Karry',
    nameAr: 'كاري',
    models: ['K60', 'K50', 'Xuanjie'],
  },
  {
    name: 'Keyton',
    nameAr: 'كيتون',
    models: ['M70', 'X90', 'M80'],
  },
  {
    name: 'King Long',
    nameAr: 'كينج لونج',
    models: ['XMQ6900', 'XMQ6127', 'XMQ6800'],
  },
  {
    name: 'Lada',
    nameAr: 'لادا',
    models: ['Granta', 'Vesta', 'Niva', 'Largus', 'XRAY', 'Priora', 'Kalina'],
  },
  {
    name: 'Landwind',
    nameAr: 'لاندويند',
    models: ['X5', 'X7', 'X9', 'R7'],
  },
  {
    name: 'Leapmotor',
    nameAr: 'ليبموتور',
    models: ['T03', 'C11', 'C01', 'S01'],
  },
  {
    name: 'Li Auto',
    nameAr: 'لي أوتو',
    models: ['L7', 'L8', 'L9', 'ONE', 'MEGA'],
  },
  {
    name: 'Lifan',
    nameAr: 'ليفان',
    models: ['X50', 'X60', '320', '520', '720', 'Foison'],
  },
  {
    name: 'LML',
    nameAr: 'إل إم إل',
    models: ['Star', 'Beamer', 'Pride'],
  },
  {
    name: 'Lynk & Co',
    nameAr: 'لينك آند كو',
    models: ['01', '02', '03', '05', '06', '09'],
  },
  {
    name: 'Mahindra',
    nameAr: 'ماهيندرا',
    models: ['Scorpio', 'XUV300', 'XUV500', 'Thar', 'Bolero', 'KUV100'],
  },
  {
    name: 'Maxus',
    nameAr: 'ماكسوس',
    models: ['D90', 'T60', 'T70', 'Deliver 9', 'Mifa 9'],
  },
  {
    name: 'Mercury',
    nameAr: 'ميركوري',
    models: ['Grand Marquis', 'Mariner', 'Milan', 'Mountaineer', 'Sable'],
  },
  {
    name: 'Omoda',
    nameAr: 'أومودا',
    models: ['5', '7', '9', 'S5', 'E5'],
  },
  {
    name: 'Perodua',
    nameAr: 'بيرودوا',
    models: ['Myvi', 'Axia', 'Bezza', 'Aruz', 'Alza', 'Keliisa'],
  },
  {
    name: 'Polestar',
    nameAr: 'بولستار',
    models: ['1', '2', '3', '4', '5'],
  },
  {
    name: 'Proton',
    nameAr: 'بروتون',
    models: ['Saga', 'Persona', 'Exora', 'X50', 'X70', 'Iriz', 'Preve'],
  },
  {
    name: 'Pullman',
    nameAr: 'بولمان',
    models: ['S 600', 'S 500', 'S 580', 'Maybach'],
  },
  {
    name: 'Rox',
    nameAr: 'روكس',
    models: ['Boxster', 'Cayman', '01'],
  },
  {
    name: 'Saab',
    nameAr: 'ساب',
    models: ['9-3', '9-5', '9-7X', '9-4X', '9-2X'],
  },
  {
    name: 'Saipa',
    nameAr: 'سايبا',
    models: ['Tiba', 'Quick', 'Saina'],
  },
  {
    name: 'Sandstorm',
    nameAr: 'ساندستورم',
    models: ['S1', 'S2'],
  },
  {
    name: 'Seat',
    nameAr: 'سيات',
    models: ['Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco', 'Toledo', 'Alhambra'],
  },
  {
    name: 'Shineray',
    nameAr: 'شينيراي',
    models: ['XY', 'X3', 'T9', 'T10', 'Jet'],
  },
  {
    name: 'Skoda',
    nameAr: 'سكودا',
    models: ['Octavia', 'Superb', 'Fabia', 'Kodiaq', 'Karoq', 'Kamiq', 'Scala', 'Enyaq'],
  },
  {
    name: 'Skywell',
    nameAr: 'سكايويل',
    models: ['ET5', 'EC6', 'HT-i'],
  },
  {
    name: 'Smart',
    nameAr: 'سمارت',
    models: ['Fortwo', 'Forfour', '#1', '#3'],
  },
  {
    name: 'Sokon',
    nameAr: 'سوكون',
    models: ['SRM X30', 'SRM X35', 'Fengguang MINI EV'],
  },
  {
    name: 'Soueast',
    nameAr: 'سويست',
    models: ['DX7', 'DX3', 'A5', 'A9'],
  },
  {
    name: 'Speranza',
    nameAr: 'سبيرانزا',
    models: ['A516', 'A620', 'A113', 'Envy'],
  },
  {
    name: 'Subaru',
    nameAr: 'سوبارو',
    models: ['Forester', 'Outback', 'Crosstrek', 'Impreza', 'Legacy', 'Ascent', 'WRX', 'BRZ', 'Tribeca', 'XV'],
  },
  {
    name: 'Suzuki',
    nameAr: 'سوزوكي',
    models: ['Swift', 'Vitara', 'Jimny', 'S-Cross', 'Baleno', 'Ciaz', 'Alto', 'Ertiga', 'XL7', 'APV'],
  },
  {
    name: 'Tank',
    nameAr: 'تانك',
    models: ['300', '500', '700', 'T300'],
  },
  {
    name: 'Tata',
    nameAr: 'تاتا',
    models: ['Nexon', 'Harrier', 'Safari', 'Altroz', 'Punch', 'Tiago', 'Tigor'],
  },
  {
    name: 'Volvo',
    nameAr: 'فولفو',
    models: ['XC60', 'XC90', 'XC40', 'XC70', 'S60', 'S90', 'V60', 'V90', 'C40', 'EX30'],
  },
  {
    name: 'Wuling',
    nameAr: 'وولينج',
    models: ['Almaz', 'Cortez', 'Formo', 'Hongguang MINI EV', 'Air ev', 'Binguo'],
  },
  {
    name: 'Xiaomi',
    nameAr: 'شاومي',
    models: ['SU7', 'SU7 Pro', 'SU7 Max'],
  },
  {
    name: 'Xpeng',
    nameAr: 'إكسبينج',
    models: ['G6', 'G9', 'P5', 'P7', 'P7+', 'X9'],
  },
  {
    name: 'Zeekr',
    nameAr: 'زيكر',
    models: ['001', '007', '009', 'X', '7X'],
  },
  {
    name: 'Zotye',
    nameAr: 'زوتي',
    models: ['T300', 'T500', 'T600', 'T700', 'SR9', 'SR7'],
  },

  // Motorcycle brands (light coverage — 3-5 models each)
  {
    name: 'Bajaj',
    nameAr: 'باجاج',
    models: ['Pulsar', 'Dominar', 'Avenger', 'CT', 'Discover', 'Platina'],
  },
  {
    name: 'Benelli',
    nameAr: 'بينيلي',
    models: ['TRK 502', 'Leoncino', 'Imperiale', '302S', 'TNT'],
  },
  {
    name: 'Ducati',
    nameAr: 'دوكاتي',
    models: ['Monster', 'Panigale', 'Multistrada', 'Scrambler', 'Diavel', 'Streetfighter', 'SuperSport'],
  },
  {
    name: 'Haojue',
    nameAr: 'هاوجوي',
    models: ['HJ110-2C', 'HJ125-8', 'HJ150-9', 'DK125'],
  },
  {
    name: 'Keeway',
    nameAr: 'كيواي',
    models: ['RKF 125', 'TX 125', 'V-CRUISE 250', 'SUPERLIGHT 150'],
  },
  {
    name: 'Kymco',
    nameAr: 'كايمكو',
    models: ['Agility', 'Like', 'People', 'Downtown', 'Xciting', 'AK 550'],
  },
  {
    name: 'Shineray',
    nameAr: 'شينيراي',
    models: ['XY 125', 'XY 150', 'T9', 'Jet 50', 'PMZ 125'],
  },
  {
    name: 'Sym',
    nameAr: 'سيم',
    models: ['Symphony', 'Jet', 'Crox', 'VF3i', 'Orbit', 'NHX'],
  },
  {
    name: 'TVS',
    nameAr: 'تي في إس',
    models: ['Apache', 'NTORQ', 'Jupiter', 'Sport', 'Star City', 'Raider'],
  },
  {
    name: 'Victory',
    nameAr: 'فيكتوري',
    models: ['Vision', 'Vegas', 'Kingpin', 'Hammer', 'Cross Roads'],
  },
  {
    name: 'Yamaha',
    nameAr: 'ياماها',
    models: ['YZF-R1', 'YZF-R3', 'MT-07', 'MT-09', 'Tracer 9', 'Ténéré 700', 'NMAX', 'Aerox', 'FZS', 'MT-15'],
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