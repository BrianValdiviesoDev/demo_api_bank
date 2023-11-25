import { Model, Schema, model } from "mongoose";
import { UserDocument } from "./user.interface";

const UserSchema = new Schema<UserDocument>(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const UserModel: Model<UserDocument> = model("User", UserSchema);
export default UserModel;
