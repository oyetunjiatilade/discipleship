import mongoose, { Schema, Document, Types } from 'mongoose';

/** A private note a mentor keeps about a convert they shepherd. */
export interface IMentorNote extends Document {
  _id: Types.ObjectId;
  mentorId: Types.ObjectId;
  convertId: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorNoteView {
  id: string;
  text: string;
  mentorId: string;
  createdAt: Date;
}

const noteSchema = new Schema<IMentorNote>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    convertId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true, toJSON: { transform(_d, r: Record<string, unknown>) { delete r.__v; return r; } } }
);

noteSchema.index({ convertId: 1, createdAt: -1 });

export function toMentorNoteView(n: IMentorNote): MentorNoteView {
  return {
    id: n._id.toString(),
    text: n.text,
    mentorId: n.mentorId.toString(),
    createdAt: n.createdAt,
  };
}

export const MentorNote = mongoose.model<IMentorNote>('MentorNote', noteSchema);
