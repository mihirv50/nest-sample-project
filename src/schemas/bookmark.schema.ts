import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument, Types } from "mongoose";
import { User } from "./user.schema";

export type BookmarkDocument = HydratedDocument<Bookmark>;

@Schema({ timestamps: true })
export class Bookmark{
    @Prop()
    title?: String

    @Prop()
    description?: String

    @Prop()
    link?: String

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);