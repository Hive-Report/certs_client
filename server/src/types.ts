export interface Config {
  PORT: string;
  NODE_ENV: string;
  CERTS_API_KEY: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  MEDOC_API_URL: string;
  MEDOC_USER_AGENT: string;
  MEDOC_DECRYPT_MARKER: string;
  MEDOC_XOR_KEY: string;
  SUZS_EMAIL: string;
  SUZS_PASSWORD: string;
}

/** One payment row from cert.suzs.info */
export interface SuzsPayment {
  edrpou: string;
  name: string;
  sum: string;
  used_sum: string;
  date: string;
  credited_date: string;
  purpose: string;
  cert_until: string;
}

export interface SuzsPaymentSummary {
  count: number;
  total_sum: string;
}

export interface SuzsPaymentResult {
  payments: SuzsPayment[];
  summary: SuzsPaymentSummary;
}

export interface Cert {
  serial: string;
  name: string;
  start_date: string;
  end_date: string;
  type: string;
  storage_type: string;
  crypt: string;
  status: string;
  ipn?: string | null;
  admin_reg?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface SuzsRegistration {
  name: string;
  ipn: string | null;
  admin_reg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}

export interface CertsApiResponse {
  status: string;
  data: Cert[];
}

export interface CertsServiceInterface {
  getCerts(edrpou: string): Promise<Cert[]>;
}

// Auth types
export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  token?: string;
  error?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

// M.E.Doc license types
export interface MedocRawModule {
  name_module: string;
  end_date?: string | null;
}

export interface MedocRawLicense {
  LIC_Id?: string;
  LIC_Type?: string;
  LIC_EndDate?: string | null;
  LIC_CreDate?: string | null;
  Quantity?: string;
  Lic_TypeR?: MedocRawModule[];
  [key: string]: unknown;
}

/** One parsed module within a license. */
export interface MedocModule {
  name_module: string;
  end_date: string | null; // ISO YYYY-MM-DD
}

/**
 * One license object returned to the frontend.
 * Corresponds to one item in the raw API array (one purchase / license record).
 * `modules` contains regular feature modules; `forms_set` is the "Комплект бланків"
 * entry extracted from the modules list (the module whose name contains "комплект").
 */
export interface MedocLicenseGroup {
  lic_id: string;
  lic_type: string;           // raw LIC_Type value from the API
  lic_type_name: string;      // human-readable: "Мережева версія" etc.
  lic_end_date: string | null; // ISO YYYY-MM-DD
  lic_cre_date: string | null; // ISO YYYY-MM-DD
  forms_set: string | null;    // "Повний комплект" / "Єдиний комплект" if present
  modules: MedocModule[];
}
