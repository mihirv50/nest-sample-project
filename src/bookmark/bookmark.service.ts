import { 
  ForbiddenException, 
  Injectable, 
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bookmark } from 'src/schemas/bookmark.schema';
import { CreateBookmarkDto, EditBookmarkDto } from './dto';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectModel(Bookmark.name) private bookmarkModel: Model<Bookmark>,
  ) {}

  // Helper method to validate ObjectId
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  async getBookmarks(userId: string) {
    const bookmarks = await this.bookmarkModel.find({ userId });
    return bookmarks;
  }

  async getBookmarkByUserId(userId: string, bookmarkId: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(bookmarkId)) {
      throw new BadRequestException('Invalid bookmark ID format');
    }

    const bookmark = await this.bookmarkModel.findById(bookmarkId);

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    if (bookmark.userId.toString() !== userId) {
      throw new ForbiddenException('Access to resource denied');
    }

    return bookmark;
  }

  async createBookmark(userId: string, dto: CreateBookmarkDto) {
    const bookmark = await this.bookmarkModel.create({
      userId,
      ...dto,
    });

    return bookmark;
  }

  async editBookmarkById(
    userId: string,
    bookmarkId: string,
    dto: EditBookmarkDto,
  ) {
    // Validate ObjectId format
    if (!this.isValidObjectId(bookmarkId)) {
      throw new BadRequestException('Invalid bookmark ID format');
    }

    const bookmark = await this.bookmarkModel.findById(bookmarkId);

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    if (bookmark.userId.toString() !== userId) {
      throw new ForbiddenException('Access to resource denied');
    }

    const updatedBookmark = await this.bookmarkModel.findByIdAndUpdate(
      bookmarkId,
      { ...dto },
      { new: true },
    );

    return updatedBookmark;
  }

  async deleteBookmarkById(userId: string, bookmarkId: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(bookmarkId)) {
      throw new BadRequestException('Invalid bookmark ID format');
    }

    const bookmark = await this.bookmarkModel.findById(bookmarkId);

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    if (bookmark.userId.toString() !== userId) {
      throw new ForbiddenException('Access to resource denied');
    }

    await this.bookmarkModel.findByIdAndDelete(bookmarkId);
  }
}