/**
 * User Repository Interface and Implementation
 * Admin SUN89 — Biro Jasa Management System
 */

import { SystemUser } from "../../domain/user/types";
import { mockUserProvider, IUserDataProvider, initialUsers } from "../mock/mockUserProvider";
import { ApiUserProvider } from "../api/apiUserProvider";

export interface AuthUserSession {
  role: 'administrator' | 'finance' | 'admin' | 'messenger';
  name: string;
  userId: string;
  employeeId?: string;
}

export const DEMO_CREDENTIALS = {
  administrator: {
    email: "svp@birojasa.com",
    password: "admin123",
    name: "Admin Super (SVP)",
    userId: "usr-001",
    employeeId: "EMP-001",
    role: "administrator" as const,
  },
  finance: {
    email: "finance@birojasa.com",
    password: "finance123",
    name: "Finance User",
    userId: "usr-002",
    employeeId: "EMP-003",
    role: "finance" as const,
  },
  admin: {
    email: "admin@birojasa.com",
    password: "admin123",
    name: "Admin User",
    userId: "usr-003",
    employeeId: "EMP-002",
    role: "admin" as const,
  },
  messenger1: {
    email: "budi.messenger@birojasa.com",
    password: "messenger123",
    name: "Budi Santoso",
    userId: "usr-msg-001",
    employeeId: "EMP-MSG-001",
    role: "messenger" as const,
  },
  messenger2: {
    email: "andi.messenger@birojasa.com",
    password: "messenger123",
    name: "Andi Pratama",
    userId: "usr-msg-002",
    employeeId: "EMP-MSG-002",
    role: "messenger" as const,
  },
  messenger: {
    email: "messenger@birojasa.com",
    password: "messenger123",
    name: "Budi Santoso",
    userId: "usr-msg-001",
    employeeId: "EMP-MSG-001",
    role: "messenger" as const,
  },
};

export interface IUserRepository {
  getAll(): SystemUser[];
  getById(id: number | string): SystemUser | undefined;
  getByEmail(email: string): SystemUser | undefined;
  createUser(user: Omit<SystemUser, "id">): SystemUser;
  updateUser(id: number | string, updates: Partial<SystemUser>): boolean;
  deleteUser(id: number | string): boolean;
  subscribe(listener: () => void): () => void;
  authenticate(email: string, password: string): Promise<AuthUserSession | null>;
  getDemoCredentials(): typeof DEMO_CREDENTIALS;
  isLoading?(): boolean;
  getError?(): string | null;
  setProvider?(provider: IUserDataProvider): void;
  getProvider?(): IUserDataProvider;
}

export class UserRepository implements IUserRepository {
  private provider: IUserDataProvider;

  constructor(provider?: IUserDataProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      const isApi = (typeof process !== "undefined" && process.env?.APP_DATA_PROVIDER === "api") ||
                    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_DATA_PROVIDER === "api");
      this.provider = isApi ? new ApiUserProvider() : mockUserProvider;
    }
  }

  public setProvider(provider: IUserDataProvider): void {
    this.provider = provider;
  }

  public getProvider(): IUserDataProvider {
    return this.provider;
  }

  public getAll(): SystemUser[] {
    return this.provider.getAll();
  }

  public getById(id: number | string): SystemUser | undefined {
    return this.provider.getById(id);
  }

  public getByEmail(email: string): SystemUser | undefined {
    return this.provider.getByEmail(email);
  }

  public createUser(userData: Omit<SystemUser, "id">): SystemUser {
    return this.provider.createUser(userData);
  }

  public updateUser(id: number | string, updates: Partial<SystemUser>): boolean {
    return this.provider.updateUser(id, updates);
  }

  public deleteUser(id: number | string): boolean {
    return this.provider.deleteUser(id);
  }

  public subscribe(listener: () => void): () => void {
    return this.provider.subscribe(listener);
  }

  public getDemoCredentials(): typeof DEMO_CREDENTIALS {
    return this.provider.getDemoCredentials();
  }

  public authenticate(email: string, password: string): Promise<AuthUserSession | null> {
    return this.provider.authenticate(email, password);
  }

  public isLoading(): boolean {
    return typeof (this.provider as any).isLoading === "function"
      ? (this.provider as any).isLoading()
      : false;
  }

  public getError(): string | null {
    return typeof (this.provider as any).getError === "function"
      ? (this.provider as any).getError()
      : null;
  }
}

export const InMemoryUserRepository = UserRepository;
export const userRepository = new UserRepository();
