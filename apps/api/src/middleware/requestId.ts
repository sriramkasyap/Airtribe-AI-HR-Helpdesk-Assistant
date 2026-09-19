import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: any, _res: any, next: any): void {
  req.id = req.header('x-request-id') || uuidv4();
  next();
}
