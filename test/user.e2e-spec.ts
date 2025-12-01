import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UserModule } from '../src/user/user.module';

describe('User E2E Tests', () => {
  let app: INestApplication;
  let dbConnection: Connection;
  let authToken: string;

  beforeAll(async () => {
    // Get MongoDB URI from global setup
    const mongoUri = (global as any).__MONGO_URI__;

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

    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      fname: 'John',
      lname: 'Doe',
    };

    await request(app.getHttpServer()).post('/auth/signup').send(signupDto);

    const signinResponse = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({
        email: signupDto.email,
        password: signupDto.password,
      });

    authToken = signinResponse.body.token;
  });

  afterAll(async () => {
    // Only close connections, DON'T stop MongoDB
    if (dbConnection) {
      await dbConnection.close();
    }
    if (app) {
      await app.close();
    }
  });

  describe('User - /users (GET)', () => {
    describe('/users/me', () => {
      it('should get current user info with valid token', () => {
        return request(app.getHttpServer())
          .get('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('userId');
          });
      });

      it('should throw error without auth token', () => {
        return request(app.getHttpServer()).get('/users/me').expect(401);
      });

      it('should throw error with invalid token', () => {
        return request(app.getHttpServer())
          .get('/users/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });

      it('should throw error with malformed authorization header', () => {
        return request(app.getHttpServer())
          .get('/users/me')
          .set('Authorization', authToken)
          .expect(401);
      });
    });
  });
});