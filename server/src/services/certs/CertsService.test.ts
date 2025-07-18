import axios from 'axios';
import type { Cert, CertsApiResponse, } from '../../types.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock winston logger
const createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

// Mock the actual service dependencies
jest.mock('../../config', () => ({
  config: {
    CERTS_API_KEY: 'test-token',
    PORT: '3001',
    NODE_ENV: 'test',
  },
}));

// Import the service after mocking
import { CertsService } from './CertsService';

describe('CertsService', () => {
  let certsService: CertsService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = createMockLogger();
    certsService = new CertsService(mockLogger);
    jest.clearAllMocks();
  });

  describe('getCerts validation', () => {
    it('should throw error for empty EDRPOU', async () => {
      await expect(certsService.getCerts('')).rejects.toThrow('EDRPOU must be at least 8 digits');
    });

    it('should throw error for short EDRPOU', async () => {
      await expect(certsService.getCerts('123')).rejects.toThrow(
        'EDRPOU must be at least 8 digits',
      );
    });

    it('should accept valid EDRPOU', async () => {
      const mockResponse: CertsApiResponse = {
        status: 'ok',
        data: [],
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      await expect(certsService.getCerts('12345678')).resolves.toEqual([]);
    });
  });

  describe('getCerts success scenarios', () => {
    const validEdrpou = '12345678';
    const mockCerts: Cert[] = [
      {
        serial: '01000000000000000000000000000000076b9f2d',
        name: 'Test Company',
        start_date: '2021-07-29 11:24:37',
        end_date: '2023-07-28 23:59:59',
        type: 'Печатка',
        storage_type: 'Файловий',
        crypt: 'Підписання',
        status: 'Діючий',
      },
    ];

    it('should successfully fetch certificates', async () => {
      const mockResponse: CertsApiResponse = {
        status: 'ok',
        data: mockCerts,
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await certsService.getCerts(validEdrpou);

      expect(result).toEqual(mockCerts);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.medoc.ua/cert/info.php',
        {
          getInfoByEdrpou: 1,
          edrpou: validEdrpou,
        },
        {
          headers: {
            Auth: 'test-token',
            'Content-Type': 'application/json',
          },
        },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Fetching certificates for EDRPOU: ${validEdrpou}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully fetched ${mockCerts.length} certificates for EDRPOU: ${validEdrpou}`,
      );
    });

    it('should handle empty results', async () => {
      const mockResponse: CertsApiResponse = {
        status: 'ok',
        data: [],
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await certsService.getCerts(validEdrpou);

      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully fetched 0 certificates for EDRPOU: ${validEdrpou}`,
      );
    });
  });

  describe('getCerts error scenarios', () => {
    const validEdrpou = '12345678';

    it('should handle API error status', async () => {
      const mockResponse: CertsApiResponse = {
        status: 'error',
        data: [],
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      await expect(certsService.getCerts(validEdrpou)).rejects.toThrow(
        'API returned error status: error',
      );
      expect(mockLogger.error).toHaveBeenCalledWith('API returned error status: error');
    });

    it('should handle axios HTTP errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        message: 'Request failed',
      };

      mockedAxios.post.mockRejectedValue(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(certsService.getCerts(validEdrpou)).rejects.toThrow('HTTP 401: Unauthorized');
      expect(mockLogger.error).toHaveBeenCalledWith('HTTP 401: Unauthorized');
    });

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
      };

      mockedAxios.post.mockRejectedValue(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(certsService.getCerts(validEdrpou)).rejects.toThrow(
        'HTTP undefined: Network Error',
      );
      expect(mockLogger.error).toHaveBeenCalledWith('HTTP undefined: Network Error');
    });

    it('should handle unknown errors', async () => {
      const mockError = new Error('Unknown error');

      mockedAxios.post.mockRejectedValue(mockError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(certsService.getCerts(validEdrpou)).rejects.toThrow('Unknown error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching certificates:', mockError);
    });
  });
});
