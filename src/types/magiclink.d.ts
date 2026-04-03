export {};

declare global {
  interface Window {
    magiclink?: {
      hasToken: boolean;
      projectId: string | null;
      clearToken: () => void;
    };
  }
}
