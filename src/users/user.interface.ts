import { Document } from 'mongoose';
import { Roles } from '../framework/roles.interface';

export interface UserDocument extends Document {
  uuid: string;
  name: string;
  email: string;
  rol: Roles;
  password: string;
  active: boolean;
}

export interface UserPost {
  name: string;
  email: string;
  password: string;
  rol: Roles;
}

export interface UserPut {
  name: string;
  rol?: Roles;
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
