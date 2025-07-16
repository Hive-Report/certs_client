import "dotenv/config";

const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.JEST_WORKER_ID !== undefined ||
  process.env.CI === "true";

const getTestDefault = (name: string): string => {
  const defaults: Record<string, string> = {
    PORT: "3001",
    NODE_ENV: "test",
  };

  return defaults[name] || "mock-value";
};

const required = (name: string, value: unknown): string => {
  if (value === undefined || value === null) {
    if (isTestEnvironment) {
      console.warn(`Using default test value for ${name}`);
      return getTestDefault(name);
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value as string;
};

export const config = {
  PORT: required("PORT", process.env.PORT),
  NODE_ENV: required("NODE_ENV", process.env.NODE_ENV),
};
