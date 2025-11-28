import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { JwtGuard } from 'src/auth/guards';
import { GetUser } from 'src/auth/decorators';
import { CreateBookmarkDto, EditBookmarkDto } from './dto';

@UseGuards(JwtGuard)
@Controller('bookmark')
export class BookmarkController {
  constructor(private bookmarkService: BookmarkService) {}

  @Get('me')
  getBookmarks(@GetUser('id') userId: string) {
    return this.bookmarkService.getBookmarks(userId);
  }

  @Get(':id')
  getBookmarksByUserId(@GetUser('id') userId: string, @Param('id') bookmarkId: string) {
    return this.bookmarkService.getBookmarkByUserId(userId, bookmarkId);
  }

  @Post('create')
  createBookmark(@GetUser('id') userId: string, @Body() dto: CreateBookmarkDto) {
    return this.bookmarkService.createBookmark(userId, dto);
  }

   @Put(':id')
  editBookmarkById(
    @GetUser('id') userId: string,
    @Param('id') bookmarkId: string,
    @Body() dto: EditBookmarkDto,
  ) {
    return this.bookmarkService.editBookmarkById(userId, bookmarkId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  deleteBookmarkById(
    @GetUser('id') userId: string,
    @Param('id') bookmarkId: string,
  ) {
    return this.bookmarkService.deleteBookmarkById(userId, bookmarkId);
  }
}
