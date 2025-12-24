import os from 'os';

const cached = {
  host: null
};

export const getPreferredHost = () => {
  if (process.env.PUBLIC_SERVER_HOST) {
    return process.env.PUBLIC_SERVER_HOST;
  }

  if (cached.host) {
    return cached.host;
  }

  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const info of entries) {
      if (info.family === 'IPv4' && !info.internal) {
        cached.host = info.address;
        return cached.host;
      }
    }
  }

  cached.host = 'localhost';
  return cached.host;
};
