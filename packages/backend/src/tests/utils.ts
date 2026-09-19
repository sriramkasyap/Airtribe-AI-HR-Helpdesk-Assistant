import { join } from 'path';

export const jestTimeout = (ms: number) => jest.setTimeout(ms);

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const getTestDbName = () => `hr-helpdesk-test-${Date.now()}`;
