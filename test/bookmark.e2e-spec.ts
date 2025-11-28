import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UserModule } from '../src/user/user.module';
import { BookmarkModule } from '../src/bookmark/bookmark.module';
import { startInMemoryMongo, stopInMemoryMongo } from './test-utils';

describe('Bookmark E2E Tests', () => {
  let app: INestApplication;
  let dbConnection: Connection;
  let mongoUri: string;
  let authToken: string;
  let secondAuthToken: string;
  let bookmarkId: string;

  const user1Dto = {
    email: 'user1@example.com',
    password: 'password123',
    fname: 'User',
    lname: 'One',
  };

  const user2Dto = {
    email: 'user2@example.com',
    password: 'password123',
    fname: 'User',
    lname: 'Two',
  };

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
        BookmarkModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    dbConnection = moduleFixture.get<Connection>(getConnectionToken());

    await app.init();

    // Create first user and get token
    await request(app.getHttpServer()).post('/auth/signup').send(user1Dto);

    const signin1Response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({
        email: user1Dto.email,
        password: user1Dto.password,
      });

    authToken = signin1Response.body.token;

    // Create second user and get token
    await request(app.getHttpServer()).post('/auth/signup').send(user2Dto);

    const signin2Response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({
        email: user2Dto.email,
        password: user2Dto.password,
      });

    secondAuthToken = signin2Response.body.token;
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
      if (collections['bookmarks']) {
        await collections['bookmarks'].deleteMany({});
      }
    }
  });

  describe('Bookmark - /bookmark (POST)', () => {
    describe('/bookmark/create', () => {
      it('should create a bookmark with all fields', () => {
        return request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Bookmark',
            description: 'Test Description',
            link: 'https://example.com',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body.title).toBe('Test Bookmark');
            expect(res.body.description).toBe('Test Description');
            expect(res.body.link).toBe('https://example.com');
            expect(res.body).toHaveProperty('userId');
          });
      });

      it('should create a bookmark with only title', () => {
        return request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Minimal Bookmark',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.title).toBe('Minimal Bookmark');
            expect(res.body).toHaveProperty('_id');
          });
      });

      it('should create a bookmark with empty body', () => {
        return request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('userId');
          });
      });

      it('should fail without authentication', () => {
        return request(app.getHttpServer())
          .post('/bookmark/create')
          .send({
            title: 'Test Bookmark',
          })
          .expect(401);
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', 'Bearer invalid_token')
          .send({
            title: 'Test Bookmark',
          })
          .expect(401);
      });

      it('should fail with malformed authorization header', () => {
        return request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', authToken)
          .send({
            title: 'Test Bookmark',
          })
          .expect(401);
      });
    });
  });

  describe('Bookmark - /bookmark (GET)', () => {
    describe('/bookmark/me', () => {
      beforeEach(async () => {
        await request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Bookmark 1',
            description: 'Description 1',
            link: 'https://example1.com',
          });

        await request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Bookmark 2',
            description: 'Description 2',
            link: 'https://example2.com',
          });
      });

      it('should get all bookmarks for authenticated user', () => {
        return request(app.getHttpServer())
          .get('/bookmark/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            expect(res.body[0]).toHaveProperty('title');
          });
      });

      it('should return empty array when user has no bookmarks', () => {
        return request(app.getHttpServer())
          .get('/bookmark/me')
          .set('Authorization', `Bearer ${secondAuthToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
          });
      });

      it('should fail without authentication', () => {
        return request(app.getHttpServer()).get('/bookmark/me').expect(401);
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .get('/bookmark/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('/bookmark/:id', () => {
      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Bookmark',
            description: 'Test Description',
            link: 'https://example.com',
          });

        bookmarkId = response.body._id;
      });

      it('should get a specific bookmark by id', () => {
        return request(app.getHttpServer())
          .get(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body._id).toBe(bookmarkId);
            expect(res.body.title).toBe('Test Bookmark');
            expect(res.body.description).toBe('Test Description');
          });
      });

      it('should fail when bookmark does not exist', async () => {
        const fakeId = '507f1f77bcf86cd799439011';

        const response = await request(app.getHttpServer())
          .get(`/bookmark/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.message).toBe('Bookmark not found');
      });

      it('should fail when user tries to access another user\'s bookmark', async () => {
        const response = await request(app.getHttpServer())
          .get(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${secondAuthToken}`)
          .expect(403);

        expect(response.body.message).toBe('Access to resource denied');
      });

      it('should fail with invalid bookmark id format', () => {
        return request(app.getHttpServer())
          .get('/bookmark/invalid-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);
      });

      it('should fail without authentication', () => {
        return request(app.getHttpServer())
          .get(`/bookmark/${bookmarkId}`)
          .expect(401);
      });
    });
  });

  describe('Bookmark - /bookmark (PUT)', () => {
    describe('/bookmark/:id', () => {
      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Original Title',
            description: 'Original Description',
            link: 'https://original.com',
          });

        bookmarkId = response.body._id;
      });

      it('should update all fields of a bookmark', () => {
        return request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Updated Title',
            description: 'Updated Description',
            link: 'https://updated.com',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.title).toBe('Updated Title');
            expect(res.body.description).toBe('Updated Description');
            expect(res.body.link).toBe('https://updated.com');
            expect(res.body._id).toBe(bookmarkId);
          });
      });

      it('should update only title', () => {
        return request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Only Title Updated',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.title).toBe('Only Title Updated');
            expect(res.body.description).toBe('Original Description');
            expect(res.body.link).toBe('https://original.com');
          });
      });

      it('should update only description', () => {
        return request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            description: 'Only Description Updated',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.title).toBe('Original Title');
            expect(res.body.description).toBe('Only Description Updated');
          });
      });

      it('should update only link', () => {
        return request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            link: 'https://onlylink.com',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.link).toBe('https://onlylink.com');
            expect(res.body.title).toBe('Original Title');
            expect(res.body.description).toBe('Original Description');
          });
      });

      it('should handle empty update body', () => {
        return request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(200)
          .expect((res) => {
            expect(res.body._id).toBe(bookmarkId);
          });
      });

      it('should fail when bookmark does not exist', async () => {
        const fakeId = '507f1f77bcf86cd799439011';

        const response = await request(app.getHttpServer())
          .put(`/bookmark/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Updated Title',
          })
          .expect(404);

        expect(response.body.message).toBe('Bookmark not found');
      });

      it('should fail when user tries to update another user\'s bookmark', async () => {
        const response = await request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${secondAuthToken}`)
          .send({
            title: 'Unauthorized Update',
          })
          .expect(403);

        expect(response.body.message).toBe('Access to resource denied');
      });

      it('should fail without authentication', () => {
        return request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .send({
            title: 'Updated Title',
          })
          .expect(401);
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .put(`/bookmark/${bookmarkId}`)
          .set('Authorization', 'Bearer invalid-token')
          .send({
            title: 'Updated Title',
          })
          .expect(401);
      });
    });
  });

  describe('Bookmark - /bookmark (DELETE)', () => {
    describe('/bookmark/:id', () => {
      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'To Be Deleted',
            description: 'This will be deleted',
            link: 'https://delete.com',
          });

        bookmarkId = response.body._id;
      });

      it('should delete a bookmark', async () => {
        await request(app.getHttpServer())
          .delete(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify bookmark is deleted
        await request(app.getHttpServer())
          .get(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should fail when bookmark does not exist', async () => {
        const fakeId = '507f1f77bcf86cd799439011';

        const response = await request(app.getHttpServer())
          .delete(`/bookmark/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.message).toBe('Bookmark not found');
      });

      it('should fail when user tries to delete another user\'s bookmark', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${secondAuthToken}`)
          .expect(403);

        expect(response.body.message).toBe('Access to resource denied');

        // Verify bookmark still exists
        await request(app.getHttpServer())
          .get(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      it('should fail without authentication', () => {
        return request(app.getHttpServer())
          .delete(`/bookmark/${bookmarkId}`)
          .expect(401);
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .delete(`/bookmark/${bookmarkId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });

      it('should fail when trying to delete already deleted bookmark', async () => {
        await request(app.getHttpServer())
          .delete(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        const response = await request(app.getHttpServer())
          .delete(`/bookmark/${bookmarkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.message).toBe('Bookmark not found');
      });
    });
  });

  describe('Bookmark - Integration Tests', () => {
    it('should complete full CRUD workflow', async () => {
      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/bookmark/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'CRUD Test',
          description: 'Testing full CRUD',
          link: 'https://crud.com',
        })
        .expect(201);

      const id = createResponse.body._id;
      expect(createResponse.body.title).toBe('CRUD Test');

      // Read (single)
      const getResponse = await request(app.getHttpServer())
        .get(`/bookmark/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.title).toBe('CRUD Test');

      // Read (all)
      const getAllResponse = await request(app.getHttpServer())
        .get('/bookmark/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getAllResponse.body.length).toBeGreaterThan(0);

      // Update
      const updateResponse = await request(app.getHttpServer())
        .put(`/bookmark/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'CRUD Test Updated',
        })
        .expect(200);

      expect(updateResponse.body.title).toBe('CRUD Test Updated');

      // Delete
      await request(app.getHttpServer())
        .delete(`/bookmark/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/bookmark/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should isolate bookmarks between different users', async () => {
      // User 1 creates bookmark
      await request(app.getHttpServer())
        .post('/bookmark/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'User 1 Bookmark',
        })
        .expect(201);

      // User 2 creates bookmark
      await request(app.getHttpServer())
        .post('/bookmark/create')
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({
          title: 'User 2 Bookmark',
        })
        .expect(201);

      const user1Bookmarks = await request(app.getHttpServer())
        .get('/bookmark/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const user2Bookmarks = await request(app.getHttpServer())
        .get('/bookmark/me')
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(200);

      expect(
        user1Bookmarks.body.some((b) => b.title === 'User 1 Bookmark'),
      ).toBe(true);
      expect(
        user1Bookmarks.body.some((b) => b.title === 'User 2 Bookmark'),
      ).toBe(false);
      expect(
        user2Bookmarks.body.some((b) => b.title === 'User 2 Bookmark'),
      ).toBe(true);
      expect(
        user2Bookmarks.body.some((b) => b.title === 'User 1 Bookmark'),
      ).toBe(false);
    });

    it('should handle multiple bookmarks operations', async () => {
      const bookmarks: string[] = [];

      for (let i = 1; i <= 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/bookmark/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Bookmark ${i}`,
            description: `Description ${i}`,
            link: `https://example${i}.com`,
          })
          .expect(201);

        bookmarks.push(response.body._id);
      }

      // Verify all bookmarks exist
      const allBookmarks = await request(app.getHttpServer())
        .get('/bookmark/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(allBookmarks.body.length).toBe(5);

      // Update one
      await request(app.getHttpServer())
        .put(`/bookmark/${bookmarks[2]}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Bookmark 3',
        })
        .expect(200);

      // Delete two
      await request(app.getHttpServer())
        .delete(`/bookmark/${bookmarks[0]}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/bookmark/${bookmarks[4]}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const finalBookmarks = await request(app.getHttpServer())
        .get('/bookmark/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalBookmarks.body.length).toBe(3);
      expect(
        finalBookmarks.body.some((b) => b.title === 'Updated Bookmark 3'),
      ).toBe(true);
    });
  });
});