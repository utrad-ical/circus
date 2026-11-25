export const apiPort = Number(process.env.E2E_API_PORT ?? 18080);
export const webPort = Number(process.env.E2E_WEB_PORT ?? 18081);
export const mongoUrl =
  process.env.E2E_MONGO_URL ??
  'mongodb://localhost:27017/circus-e2e?directConnection=true';
