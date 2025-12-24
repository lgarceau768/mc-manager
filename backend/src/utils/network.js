import os from 'os';

const cached = {
  host: null
};

const isUsableHost = (value) => {
  if (!value) return false;
  const normalized = String(value).toLowerCase();
  return !['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(normalized);
};

const getAddressScore = (address) => {
  if (address.startsWith('192.168.')) return 5;
  if (address.startsWith('10.')) return 4;

  if (address.startsWith('172.')) {
    const parts = address.split('.');
    const second = parseInt(parts[1] || '0', 10);
    if (second >= 16 && second <= 31) {
      return 3;
    }
  }

  if (address.startsWith('169.254.')) return 2;
  return 1;
};

export const getPreferredHost = () => {
  const envHost = process.env.PUBLIC_SERVER_HOST;
  if (isUsableHost(envHost)) {
    return envHost;
  }

  if (cached.host) {
    return cached.host;
  }

  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const info of entries) {
      if (info.family !== 'IPv4' || info.internal) continue;
      const address = info.address;
      candidates.push({
        address,
        score: getAddressScore(address)
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    cached.host = candidates[0].address;
    return cached.host;
  }

  cached.host = envHost || 'localhost';
  return cached.host;
};
