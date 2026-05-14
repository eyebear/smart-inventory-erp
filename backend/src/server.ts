import app from "./app";
import { runMigrations } from "./config/migrate";

const port = Number(process.env.PORT ?? 5001);

async function start() {
  try {
    await runMigrations();
  } catch (error) {
    console.error("[migrate] FAILED — refusing to start backend", error);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
  });
}

void start();
