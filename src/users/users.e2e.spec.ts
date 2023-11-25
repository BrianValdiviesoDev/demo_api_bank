import request from "supertest";
import { app, mongo } from "../server";
import { JWT } from "../framework/auth";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import UserModel from "./user.schema";
import { UserDocument } from "./user.interface";

const generateJwt = (user: JWT) => {
  const token = jwt.sign(user, process.env.JWT_SECRET || "");
};

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongo.close();
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = await mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("POST /", () => {
  afterEach(async () => {
    await UserModel.deleteMany({});
  });
  it("should create a new user", async () => {
    const res = await request(app).post("/users/").send({
      name: "testuser",
      email: "testuser@example.com",
      password: "testpassword",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("uuid");
  });

  it("should fail to create a new user if email exists", async () => {
    await UserModel.create({
      uuid: "1234",
      name: "test",
      email: "testuser@example.com",
      password: "test",
      active: false,
    });

    expect(
      await request(app).post("/users/").send({
        name: "testuser",
        email: "testuser@example.com",
        password: "testpassword",
      })
    ).rejects.toThrow();
  });
});
