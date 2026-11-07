import api from './api.js';

// Fallbacks if backend lookup table is empty.
const FALLBACK_CITIES = [
  { name: 'North Coast', slug: 'north-coast' },
  { name: 'Ain Sokhna', slug: 'ain-sokhna' },
  { name: 'New Cairo', slug: 'new-cairo' },
  { name: 'Hurghada', slug: 'hurghada' },
  { name: 'El Gouna', slug: 'el-gouna' },
];

const FALLBACK_TYPES = [
  { name: 'Chalet', slug: 'chalet' },
  { name: 'Apartment', slug: 'apartment' },
  { name: 'Villa', slug: 'villa' },
  { name: 'Townhouse', slug: 'townhouse' },
  { name: 'Duplex', slug: 'duplex' },
  { name: 'Penthouse', slug: 'penthouse' },
  { name: 'Studio', slug: 'studio' },
  { name: 'Twin House', slug: 'twin-house' },
  { name: 'Standalone Villa', slug: 'standalone-villa' },
  { name: 'Commercial Property', slug: 'commercial' },
  { name: 'Land', slug: 'land' },
];

export const locationService = {
  async getVillages() {
    try {
      const res = await api.get('/lookups/villages');
      return res.data;
    } catch {
      return { success: true, data: [] };
    }
  },
  async getZones(villageId) {
    if (!villageId) return { success: true, data: [] };
    try {
      const res = await api.get(`/lookups/villages/${villageId}/zones`);
      return res.data;
    } catch {
      return { success: true, data: [] };
    }
  },
  async getCities() {
    try {
      const res = await api.get('/lookups/cities');
      return res.data;
    } catch {
      return { success: true, data: FALLBACK_CITIES };
    }
  },
  async getPropertyTypes() {
    try {
      const res = await api.get('/lookups/property-types');
      return res.data;
    } catch {
      return { success: true, data: FALLBACK_TYPES };
    }
  },
  async getAmenities() {
    try {
      const res = await api.get('/lookups/amenities');
      return res.data;
    } catch {
      return { success: true, data: [] };
    }
  },
  async getLocations(cityId) {
    try {
      const res = await api.get('/lookups/locations', { params: cityId ? { cityId } : {} });
      return res.data;
    } catch {
      return { success: true, data: [] };
    }
  },
};
