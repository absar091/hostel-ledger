import { describe, it, expect, vi } from 'vitest';
import { getLocationFromIP } from '../../utils/deviceInfo';

// Mock global fetch
global.fetch = vi.fn();

describe('IP Validation Security', () => {
    it('should return Unknown for invalid IP strings (not an IP)', async () => {
        const result = await getLocationFromIP('not-an-ip');
        expect(result).toEqual({
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            timezone: 'UTC'
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should return Unknown for malicious input (command injection attempt)', async () => {
        const result = await getLocationFromIP('127.0.0.1; rm -rf /');
        expect(result).toEqual({
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            timezone: 'UTC'
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should return Localhost details for 127.0.0.1', async () => {
        const result = await getLocationFromIP('127.0.0.1');
        expect(result).toEqual({
            city: 'Localhost',
            region: 'Local',
            country: 'Local',
            timezone: 'UTC'
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should return Localhost details for ::1', async () => {
        const result = await getLocationFromIP('::1');
        expect(result).toEqual({
            city: 'Localhost',
            region: 'Local',
            country: 'Local',
            timezone: 'UTC'
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should proceed to fetch for valid IPv4', async () => {
        // Mock successful fetch
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'success', country: 'United States', city: 'Mountain View' })
        });

        const result = await getLocationFromIP('8.8.8.8');
        expect(result.country).toBe('United States');
        expect(fetch).toHaveBeenCalledWith('http://ip-api.com/json/8.8.8.8');
    });

    it('should proceed to fetch for valid IPv6', async () => {
        // Mock successful fetch
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'success', country: 'Japan', city: 'Tokyo' })
        });

        const result = await getLocationFromIP('2001:4860:4860::8888');
        expect(result.country).toBe('Japan');
        expect(fetch).toHaveBeenCalledWith('http://ip-api.com/json/2001:4860:4860::8888');
    });
});
