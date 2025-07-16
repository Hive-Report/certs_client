export interface Config {
  PORT: string;
  NODE_ENV: string;
  CERTS_API_TOKEN: string;
}

export type Cert = {
  serial: string;
  name: string;
  start_date: string;
  end_date: string;
  type: string;
  storage_type: string;
  crypt: string;
  status: string;
};

export type CertsApiResponse = {
  status: string;
  data: Cert[];
};

export interface CertsServiceInterface {
  getCerts(edrpou: string): Promise<Cert[]>;
}
