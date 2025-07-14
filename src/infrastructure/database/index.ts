import mongoDB from './mongodb';

export async function connectDB(): Promise<void> {
  await mongoDB.connect();
}

export async function disconnectDB(): Promise<void> {
  await mongoDB.disconnect();
}

export function isDBConnected(): boolean {
  return mongoDB.isConnected();
}

export { mongoDB };
