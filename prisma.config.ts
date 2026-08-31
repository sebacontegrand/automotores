import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DATA_DATABASE_URL ||
      process.env.DATA_POSTGRES_URL ||
      process.env.DATA_PRISMA_DATABASE_URL ||
      process.env.DATA_PRISMA_URL ||
      process.env.DATA_URL ||
      process.env.DATA_POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.DATABASE_URL ||
      "postgresql://localhost:5432/autovault",
  },
});

