import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown() {
  console.log('Stopping global MongoDB Memory Server...');
  
  const mongod: MongoMemoryServer = (global as any).__MONGOD__;
  
  if (mongod) {
    await mongod.stop();
    console.log('MongoDB Memory Server stopped');
  }
}