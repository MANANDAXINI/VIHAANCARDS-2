/** Major Indian cities → state (D54). Lookup is case-insensitive. */
const CITY_TO_STATE = {
  // Maharashtra
  mumbai: "Maharashtra",
  bombay: "Maharashtra",
  pune: "Maharashtra",
  nagpur: "Maharashtra",
  nashik: "Maharashtra",
  nasik: "Maharashtra",
  aurangabad: "Maharashtra",
  "chhatrapati sambhajinagar": "Maharashtra",
  sambhajinagar: "Maharashtra",
  thane: "Maharashtra",
  "navi mumbai": "Maharashtra",
  kalyan: "Maharashtra",
  dombivli: "Maharashtra",
  vasai: "Maharashtra",
  virar: "Maharashtra",
  solapur: "Maharashtra",
  kolhapur: "Maharashtra",
  sangli: "Maharashtra",
  satara: "Maharashtra",
  ahmednagar: "Maharashtra",
  "ahmed nagar": "Maharashtra",
  amravati: "Maharashtra",
  akola: "Maharashtra",
  jalgaon: "Maharashtra",
  latur: "Maharashtra",
  nanded: "Maharashtra",
  chandrapur: "Maharashtra",
  yavatmal: "Maharashtra",
  wardha: "Maharashtra",
  gondia: "Maharashtra",
  bhandara: "Maharashtra",
  gadchiroli: "Maharashtra",
  washim: "Maharashtra",
  buldhana: "Maharashtra",
  hingoli: "Maharashtra",
  parbhani: "Maharashtra",
  beed: "Maharashtra",
  osmanabad: "Maharashtra",
  dharashiv: "Maharashtra",
  ratnagiri: "Maharashtra",
  sindhudurg: "Maharashtra",
  raigad: "Maharashtra",
  palghar: "Maharashtra",
  dhule: "Maharashtra",
  nandurbar: "Maharashtra",
  malegaon: "Maharashtra",
  ichalkaranji: "Maharashtra",
  jalna: "Maharashtra",
  barshi: "Maharashtra",
  panvel: "Maharashtra",
  ulhasnagar: "Maharashtra",
  ambarnath: "Maharashtra",
  badlapur: "Maharashtra",
  bhiwandi: "Maharashtra",
  miraj: "Maharashtra",
  kamptee: "Maharashtra",
  hingna: "Maharashtra",
  butibori: "Maharashtra",

  // Gujarat
  ahmedabad: "Gujarat",
  surat: "Gujarat",
  vadodara: "Gujarat",
  baroda: "Gujarat",
  rajkot: "Gujarat",
  bhavnagar: "Gujarat",
  jamnagar: "Gujarat",
  gandhinagar: "Gujarat",
  anand: "Gujarat",
  mehsana: "Gujarat",
  bharuch: "Gujarat",
  valsad: "Gujarat",
  vapi: "Gujarat",
  navsari: "Gujarat",
  junagadh: "Gujarat",
  morbi: "Gujarat",
  gandhidham: "Gujarat",

  // Madhya Pradesh
  bhopal: "Madhya Pradesh",
  indore: "Madhya Pradesh",
  jabalpur: "Madhya Pradesh",
  gwalior: "Madhya Pradesh",
  ujjain: "Madhya Pradesh",
  sagar: "Madhya Pradesh",
  rewa: "Madhya Pradesh",
  satna: "Madhya Pradesh",
  dewas: "Madhya Pradesh",
  ratlam: "Madhya Pradesh",
  khargone: "Madhya Pradesh",
  khandwa: "Madhya Pradesh",
  chhindwara: "Madhya Pradesh",
  seoni: "Madhya Pradesh",
  balaghat: "Madhya Pradesh",

  // Chhattisgarh
  raipur: "Chhattisgarh",
  bilaspur: "Chhattisgarh",
  durg: "Chhattisgarh",
  bhilai: "Chhattisgarh",
  korba: "Chhattisgarh",
  rajnandgaon: "Chhattisgarh",
  jagdalpur: "Chhattisgarh",
  ambikapur: "Chhattisgarh",

  // Karnataka
  bangalore: "Karnataka",
  bengaluru: "Karnataka",
  mysore: "Karnataka",
  mysuru: "Karnataka",
  mangalore: "Karnataka",
  mangaluru: "Karnataka",
  hubli: "Karnataka",
  hubballi: "Karnataka",
  belgaum: "Karnataka",
  belagavi: "Karnataka",
  gulbarga: "Karnataka",
  kalaburagi: "Karnataka",
  davangere: "Karnataka",
  shimoga: "Karnataka",
  shivamogga: "Karnataka",
  tumkur: "Karnataka",
  tumakuru: "Karnataka",

  // Telangana / Andhra
  hyderabad: "Telangana",
  secunderabad: "Telangana",
  warangal: "Telangana",
  nizamabad: "Telangana",
  karimnagar: "Telangana",
  khammam: "Telangana",
  visakhapatnam: "Andhra Pradesh",
  vizag: "Andhra Pradesh",
  vijayawada: "Andhra Pradesh",
  guntur: "Andhra Pradesh",
  nellore: "Andhra Pradesh",
  tirupati: "Andhra Pradesh",
  kurnool: "Andhra Pradesh",
  rajahmundry: "Andhra Pradesh",
  kakinada: "Andhra Pradesh",

  // Tamil Nadu
  chennai: "Tamil Nadu",
  madras: "Tamil Nadu",
  coimbatore: "Tamil Nadu",
  madurai: "Tamil Nadu",
  trichy: "Tamil Nadu",
  tiruchirappalli: "Tamil Nadu",
  salem: "Tamil Nadu",
  erode: "Tamil Nadu",
  tirunelveli: "Tamil Nadu",
  vellore: "Tamil Nadu",
  thoothukudi: "Tamil Nadu",
  tuticorin: "Tamil Nadu",

  // Kerala
  thiruvananthapuram: "Kerala",
  trivandrum: "Kerala",
  kochi: "Kerala",
  cochin: "Kerala",
  ernakulam: "Kerala",
  kozhikode: "Kerala",
  calicut: "Kerala",
  thrissur: "Kerala",
  kollam: "Kerala",
  kannur: "Kerala",
  alappuzha: "Kerala",
  alleppey: "Kerala",

  // Rajasthan
  jaipur: "Rajasthan",
  jodhpur: "Rajasthan",
  udaipur: "Rajasthan",
  kota: "Rajasthan",
  ajmer: "Rajasthan",
  bikaner: "Rajasthan",
  alwar: "Rajasthan",
  bhilwara: "Rajasthan",
  sikar: "Rajasthan",

  // Delhi / NCR
  delhi: "Delhi",
  "new delhi": "Delhi",
  noida: "Uttar Pradesh",
  gurgaon: "Haryana",
  gurugram: "Haryana",
  faridabad: "Haryana",
  ghaziabad: "Uttar Pradesh",
  "greater noida": "Uttar Pradesh",

  // Uttar Pradesh
  lucknow: "Uttar Pradesh",
  kanpur: "Uttar Pradesh",
  varanasi: "Uttar Pradesh",
  banaras: "Uttar Pradesh",
  agra: "Uttar Pradesh",
  meerut: "Uttar Pradesh",
  allahabad: "Uttar Pradesh",
  prayagraj: "Uttar Pradesh",
  bareilly: "Uttar Pradesh",
  aligarh: "Uttar Pradesh",
  moradabad: "Uttar Pradesh",
  saharanpur: "Uttar Pradesh",
  gorakhpur: "Uttar Pradesh",
  jhansi: "Uttar Pradesh",
  mathura: "Uttar Pradesh",

  // West Bengal
  kolkata: "West Bengal",
  calcutta: "West Bengal",
  howrah: "West Bengal",
  durgapur: "West Bengal",
  asansol: "West Bengal",
  siliguri: "West Bengal",

  // Bihar / Jharkhand
  patna: "Bihar",
  gaya: "Bihar",
  muzaffarpur: "Bihar",
  bhagalpur: "Bihar",
  ranchi: "Jharkhand",
  jamshedpur: "Jharkhand",
  dhanbad: "Jharkhand",
  bokaro: "Jharkhand",

  // Odisha
  bhubaneswar: "Odisha",
  cuttack: "Odisha",
  rourkela: "Odisha",
  berhampur: "Odisha",
  sambalpur: "Odisha",

  // Punjab / Haryana / HP / UK
  chandigarh: "Chandigarh",
  ludhiana: "Punjab",
  amritsar: "Punjab",
  jalandhar: "Punjab",
  patiala: "Punjab",
  mohali: "Punjab",
  bathinda: "Punjab",
  ambala: "Haryana",
  panipat: "Haryana",
  karnal: "Haryana",
  hisar: "Haryana",
  rohtak: "Haryana",
  shimla: "Himachal Pradesh",
  dehradun: "Uttarakhand",
  haridwar: "Uttarakhand",
  haldwani: "Uttarakhand",

  // Assam / NE
  guwahati: "Assam",
  dispur: "Assam",
  dibrugarh: "Assam",
  silchar: "Assam",
  shillong: "Meghalaya",
  imphal: "Manipur",
  agartala: "Tripura",
  aizawl: "Mizoram",
  kohima: "Nagaland",
  itanagar: "Arunachal Pradesh",

  // Goa
  panaji: "Goa",
  panjim: "Goa",
  margao: "Goa",
  vasco: "Goa",
  "vasco da gama": "Goa",
  mapusa: "Goa",

  // J&K / Ladakh
  srinagar: "Jammu and Kashmir",
  jammu: "Jammu and Kashmir",
  leh: "Ladakh",
  kargil: "Ladakh",

  // Puducherry
  puducherry: "Puducherry",
  pondicherry: "Puducherry",
};

function normalizeCityKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Resolve Indian state from city name.
 * Returns "" if unknown (state can still be typed manually).
 */
export function resolveStateFromCity(city) {
  const key = normalizeCityKey(city);
  if (!key) return "";
  if (CITY_TO_STATE[key]) return CITY_TO_STATE[key];

  // Match without spaces: "navimumbai" → navi mumbai
  const compact = key.replace(/\s+/g, "");
  for (const [cityName, state] of Object.entries(CITY_TO_STATE)) {
    if (cityName.replace(/\s+/g, "") === compact) return state;
  }

  // Starts-with / contains for longer city names
  for (const [cityName, state] of Object.entries(CITY_TO_STATE)) {
    if (key.startsWith(cityName) || cityName.startsWith(key)) {
      if (key.length >= 3 && cityName.length >= 3) return state;
    }
  }

  return "";
}
