const axios = require("axios");
const env = require("../config/env");

const authClient = axios.create({
  baseURL: env.authServiceUrl,
  timeout: 3000,
  headers: {
    "x-internal-service-key": env.internalServiceKey,
  },
});

async function validateAccessToken(token) {
  const response = await authClient.post(
    "/internal/validate",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.data;
}

module.exports = { validateAccessToken };