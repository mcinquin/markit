import type { Config } from "jest";

const shared = {
  preset: "ts-jest",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  clearMocks: true,
} satisfies Config;

const config: Config = {
  projects: [
    {
      ...shared,
      displayName: "node",
      testEnvironment: "node",
      testMatch: ["**/__tests__/**/*.test.ts"],
    },
    {
      ...shared,
      displayName: "dom",
      testEnvironment: "jsdom",
      testMatch: ["**/__tests__/**/*.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.dom.ts"],
    },
  ],
};

export default config;
