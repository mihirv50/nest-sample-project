import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export const startInMemoryMongo = async (): Promise<string> => {
  mongod = await MongoMemoryServer.create();
  return mongod.getUri();
};

export const stopInMemoryMongo = async () => {
  if (mongod) {
    await mongod.stop();
  }
};