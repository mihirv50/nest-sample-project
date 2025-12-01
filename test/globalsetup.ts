import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

export default async function globalSetup() {
  console.log('Starting global MongoDB Memory Server...');
  
  mongod = await MongoMemoryServer.create({
    binary: {
      version: '7.0.0',
    },
  });

  const uri = mongod.getUri();
  
  (global as any).__MONGO_URI__ = uri;
  (global as any).__MONGOD__ = mongod;

  console.log(`MongoDB Memory Server started at: ${uri}`);
}