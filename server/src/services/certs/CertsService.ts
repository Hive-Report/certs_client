import { CertsServiceInterface, Cert, CertsApiResponse } from '../../types.js';
import { Logger } from 'winston';
import { config } from '../../config';
import axios, { AxiosResponse } from 'axios';

export class CertsService implements CertsServiceInterface {
  private apiUrl: string;
  private apiToken: string;
  private logger: Logger;

  constructor(logger: Logger) {
    this.apiUrl = 'https://api.medoc.ua';
    this.apiToken = config.CERTS_API_TOKEN;
    this.logger = logger;
  }

  private validateEdrpou(edrpou: string): void {
    if (!edrpou || edrpou.length < 8) {
      throw new Error('EDRPOU must be at least 8 digits');
    }
  }

  async getCerts(edrpou: string): Promise<Cert[]> {
    this.validateEdrpou(edrpou);

    try {
      this.logger.info(`Fetching certificates for EDRPOU: ${edrpou}`);

      const response: AxiosResponse<CertsApiResponse> = await axios.post(
        `${this.apiUrl}/cert/info.php`,
        {
          getInfoByEdrpou: 1,
          edrpou: edrpou,
        },
        {
          headers: {
            Auth: this.apiToken,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      if (data.status === 'ok') {
        this.logger.info(
          `Successfully fetched ${data.data.length} certificates for EDRPOU: ${edrpou}`,
        );
        return data.data;
      } else {
        const errorMessage = `API returned error status: ${data.status}`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorMessage = `HTTP ${status}: ${error.response?.data?.message || error.message}`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        this.logger.error('Error fetching certificates:', error);
        throw error;
      }
    }
  }
}
