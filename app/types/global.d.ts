declare global {
  namespace NodeJS {
    interface ProcessEnv {
      FIREBASE_API_KEY: string;
      FIREBASE_PROJECT_ID: string;
    }
  }
}

// needed for module augmentation
export { };

