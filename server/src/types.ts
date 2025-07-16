export interface Config {
  PORT: string;
  NODE_ENV: string;
  CERTS_API_TOKEN: string;
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
