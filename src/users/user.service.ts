import { UserLogin, UserPost, UserPut, UserResponse } from "./user.interface";
import { v4 as uuidv4 } from "uuid";
import UserModel from "./user.schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT } from "../framework/auth";

export class UserService {
  async createUser(user: UserPost): Promise<UserResponse> {
    if (user.email === "" || user.password === "" || user.name === "") {
      throw new Error("All fields are required");
    }

    const emailExists = await UserModel.findOne({ email: user.email });
    if (emailExists) {
      throw new Error("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const newUser = {
      ...user,
      password: hashedPassword,
      uuid: uuidv4(),
      active: true,
    };
    const createdUser = await UserModel.create(newUser);
    const response: UserResponse = {
      uuid: createdUser.uuid,
      name: createdUser.name,
      email: createdUser.email,
    };
    return response;
  }

  async loginUser(user: UserLogin): Promise<string> {
    if (user.email === "" || user.password === "") {
      throw new Error("User or password incorrect");
    }

    const userFound = await UserModel.findOne({
      email: user.email,
    });
    if (!userFound) {
      throw new Error("User or password incorrect");
    }
    const passwordMatch = await bcrypt.compare(
      user.password,
      userFound.password
    );
    if (!passwordMatch) {
      throw new Error("User or password incorrect");
    }

    const payload: JWT = {
      uuid: userFound.uuid,
      name: userFound.name,
      email: userFound.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "", {});

    return token;
  }

  async updateUser(
    uuid: string,
    user: UserPut,
    jwt: JWT
  ): Promise<UserResponse> {
    const updateDto: UserPut = {
      name: user.name,
    };
    const updatedUser = await UserModel.findOneAndUpdate(
      { uuid },
      { ...updateDto },
      { new: true }
    );
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async deactiveUser(uuid: string): Promise<void> {
    const updatedUser = await UserModel.findOneAndUpdate(
      { uuid },
      { $set: { active: false } },
      { new: true }
    );
    if (!updatedUser) {
      throw new Error("User not found");
    }
  }

  async activeUser(uuid: string): Promise<void> {
    const updatedUser = await UserModel.findOneAndUpdate(
      { uuid },
      { $set: { active: true } },
      { new: true }
    );
    if (!updatedUser) {
      throw new Error("User not found");
    }
  }

  async deleteUser(uuid: string): Promise<void> {
    const user = await UserModel.findOne({ uuid });
    if (!user) {
      throw new Error("User not found");
    }
    await UserModel.deleteOne({ uuid });
  }

  async listUsers(): Promise<UserResponse[]> {
    return await UserModel.find();
  }

  async getUser(uuid: string): Promise<UserResponse> {
    const user = await UserModel.findOne({ uuid });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
}
