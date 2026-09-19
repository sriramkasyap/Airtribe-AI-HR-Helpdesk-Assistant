export interface AuthenticatedUser {
  employeeId: string;
  role: 'employee' | 'manager';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      id?: string;
    }
  }
}
