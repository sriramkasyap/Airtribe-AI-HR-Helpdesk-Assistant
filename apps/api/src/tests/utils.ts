export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const getTestDbName = () => `hr-helpdesk-test-${Date.now()}`;
