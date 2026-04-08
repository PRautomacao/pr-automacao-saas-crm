import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
    companyId: string;
    companyName: string;
    companySlug: string;
    avatar?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      companyId: string;
      companyName: string;
      companySlug: string;
      avatar?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    companyId: string;
    companyName: string;
    companySlug: string;
    avatar?: string;
  }
}