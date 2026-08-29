import mongoose, { Schema, Document, Types } from 'mongoose';

/** A logged phone call / contact an admin made with a convert. */
export interface IContactLog extends Document {
  _id: Types.ObjectId;
  convertId: Types.ObjectId;
  branchId: Types.ObjectId | null;
  contactedBy: Types.ObjectId;
  note: string | null;
  calledAt: Date;
  createdAt: Date;
}

const contactLogSchema = new Schema<IContactLog>(
  {
    convertId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    contactedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 1000, default: null },
    calledAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

contactLogSchema.index({ convertId: 1, calledAt: -1 });

export const ContactLog = mongoose.model<IContactLog>('ContactLog', contactLogSchema);
