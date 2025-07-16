import "dotenv/config";
import { Config } from "types.js";

const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.JEST_WORKER_ID !== undefined ||
  process.env.CI === "true";

const getTestConfig = (): Config => {
  return {
    PORT: "3000",
    NODE_ENV: "test",
    CERTS_API_TOKEN: "test-token",
  };
};

const getProductionConfig = (): Config => {
  const required = (name: string, value: unknown): string => {
    if (value === undefined || value === null) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value as string;
  };

  return {
    PORT: required("PORT", process.env.PORT) || "3000",
    NODE_ENV: required("NODE_ENV", process.env.NODE_ENV),
    CERTS_API_TOKEN: required("CERTS_API_TOKEN", process.env.CERTS_API_TOKEN),
  };
};

export const config: Config = isTestEnvironment 
  ? getTestConfig() 
  : getProductionConfig();
