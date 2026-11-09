import { farmEducation } from './farm-education.js';
import { healthHousing } from './health-housing.js';
import { work } from './work.js';
import { andhra } from './andhra.js';

export const schemes = [...farmEducation, ...healthHousing, ...work, ...andhra];
export const schemeById = Object.fromEntries(schemes.map(scheme => [scheme.id, scheme]));
