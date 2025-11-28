import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  console.log('Downloading MongoDB binary (if needed)...');
  const instance = await MongoMemoryServer.create();
  await instance.stop();
  console.log('MongoDB binary ready!');
}