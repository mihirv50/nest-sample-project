import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UserModule } from '../src/user/user.module';
import { startInMemoryMongo, stopInMemoryMongo } from './test-utils';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let dbConnection: Connection;
  let mongoUri: string;

  beforeAll(async () => {
    mongoUri = await startInMemoryMongo();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRoot(mongoUri),
        AuthModule,
        UserModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    dbConnection = moduleFixture.get<Connection>(getConnectionToken());

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (dbConnection) {
      await dbConnection.close();
    }
    if (app) {
      await app.close();
    }
    await stopInMemoryMongo();
  });

  afterEach(async () => {
    if (dbConnection && dbConnection.collections) {
      const collections = dbConnection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });

  describe('Auth - /auth (POST)', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      fname: 'John',
      lname: 'Doe',
    };

    describe('/auth/signup', () => {
      it('should signup a new user', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send(signupDto)
          .expect(201);
      });

      it('should return error if email already exists', async () => {
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send(signupDto);

        const response = await request(app.getHttpServer())
          .post('/auth/signup')
          .send(signupDto)
          .expect(409); // Conflict status

        expect(response.body.message).toContain('user already exists');
      });

      it('should return error if email is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            password: 'password123',
            fname: 'John',
            lname: 'Doe',
          })
          .expect(400);
      });

      it('should return error if password is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            email: 'test@example.com',
            fname: 'John',
            lname: 'Doe',
          })
          .expect(400);
      });

      it('should return error if fname is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'password123',
            lname: 'Doe',
          })
          .expect(400);
      });

      it('should return error if lname is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'password123',
            fname: 'John',
          })
          .expect(400);
      });

      it('should return error if email is invalid', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            email: 'invalid-email',
            password: 'password123',
            fname: 'John',
            lname: 'Doe',
          })
          .expect(400);
      });
    });

    describe('/auth/signin', () => {
      beforeEach(async () => {
        await request(app.getHttpServer()).post('/auth/signup').send(signupDto);
      });

      it('should signin with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/auth/signin')
          .send({
            email: signupDto.email,
            password: signupDto.password,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('msg');
            expect(res.body.msg).toBe('Signed In!');
          });
      });

      it('should return error with invalid email', () => {
        return request(app.getHttpServer())
          .post('/auth/signin')
          .send({
            email: 'wrong@example.com',
            password: signupDto.password,
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toContain('Invalid credentials');
          });
      });

      it('should not return token with invalid password', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/signin')
          .send({
            email: signupDto.email,
            password: 'wrongpassword',
          })
          .expect(401);

        expect(response.body).not.toHaveProperty('token');
        expect(response.body.message).toContain('Invalid credentials');
      });

      it('should return error if email is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/signin')
          .send({
            password: signupDto.password,
          })
          .expect(400);
      });

      it('should return error if password is missing', () => {
        return request(app.getHttpServer())
          .post('/auth/signin')
          .send({
            email: signupDto.email,
          })
          .expect(400);
      });
    });
  });
});