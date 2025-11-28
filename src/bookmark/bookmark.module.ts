import { Module } from '@nestjs/common';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Bookmark, BookmarkSchema } from 'src/schemas/bookmark.schema';

@Module({
  imports: [MongooseModule.forFeature([{name: Bookmark.name, schema: BookmarkSchema}])],
  controllers: [BookmarkController],
  providers: [BookmarkService]
})
export class BookmarkModule {}
