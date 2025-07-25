export interface Config {
  PORT: string;
  NODE_ENV: string;
  CERTS_API_KEY: string;
  JWT_SECRET: string;
  ALLOWED_EMAIL_DOMAINS: string;
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
