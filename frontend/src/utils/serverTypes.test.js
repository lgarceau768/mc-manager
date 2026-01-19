import { describe, it, expect } from 'vitest';
import { formatServerType, getServerAddress, SERVER_TYPE_OPTIONS } from './serverTypes';

describe('serverTypes', () => {
  describe('SERVER_TYPE_OPTIONS', () => {
    it('should have all server type options', () => {
      expect(SERVER_TYPE_OPTIONS).toHaveLength(4);
      expect(SERVER_TYPE_OPTIONS.map(o => o.value)).toEqual([
        'PAPER', 'FABRIC', 'FORGE', 'NEOFORGE'
      ]);
    });

    it('should have labels for all options', () => {
      SERVER_TYPE_OPTIONS.forEach(option => {
        expect(option.label).toBeTruthy();
      });
    });
  });

  describe('formatServerType', () => {
    it('should format PAPER correctly', () => {
      expect(formatServerType('PAPER')).toBe('Paper');
      expect(formatServerType('paper')).toBe('Paper');
    });

    it('should format FABRIC correctly', () => {
      expect(formatServerType('FABRIC')).toBe('Fabric');
      expect(formatServerType('fabric')).toBe('Fabric');
    });

    it('should format FORGE correctly', () => {
      expect(formatServerType('FORGE')).toBe('Forge');
      expect(formatServerType('forge')).toBe('Forge');
    });

    it('should format NEOFORGE correctly', () => {
      expect(formatServerType('NEOFORGE')).toBe('NeoForge');
      expect(formatServerType('neoforge')).toBe('NeoForge');
    });

    it('should return Unknown for null/undefined', () => {
      expect(formatServerType(null)).toBe('Unknown');
      expect(formatServerType(undefined)).toBe('Unknown');
    });

    it('should return the input for unknown types', () => {
      expect(formatServerType('VANILLA')).toBe('VANILLA');
    });
  });

  describe('getServerAddress', () => {
    it('should return empty string for null server', () => {
      expect(getServerAddress(null)).toBe('');
      expect(getServerAddress(undefined)).toBe('');
    });

    it('should use connectionInfo.host if available', () => {
      const server = {
        connectionInfo: { host: 'mc.example.com', port: 25565 },
        port: 25566
      };
      expect(getServerAddress(server)).toBe('mc.example.com:25565');
    });

    it('should use connectionInfo.address if host not available', () => {
      const server = {
        connectionInfo: { address: '192.168.1.100:25565', port: 25565 }
      };
      expect(getServerAddress(server)).toBe('192.168.1.100:25565');
    });

    it('should use server.host as fallback', () => {
      const server = {
        host: 'server.local',
        port: 25565
      };
      expect(getServerAddress(server)).toBe('server.local:25565');
    });

    it('should use server.address as fallback', () => {
      const server = {
        address: '10.0.0.1',
        port: 25567
      };
      expect(getServerAddress(server)).toBe('10.0.0.1:25567');
    });

    it('should use connectionInfo.port over server.port', () => {
      const server = {
        connectionInfo: { port: 25570 },
        port: 25565
      };
      expect(getServerAddress(server)).toContain(':25570');
    });
  });
});
