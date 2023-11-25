import { Document } from "mongoose";

export interface UserDocument extends Document {
  uuid: string;
  name: string;
  email: string;
  password: string;
  active: boolean;
}

export interface UserPost {
  name: string;
  email: string;
  password: string;
}

export interface UserPut {
  name: string;
}

export interface UserResponse {
  uuid: string;
  name: string;
  email: string;
}

export interface UserLogin {
  email: string;
  password: string;
}
