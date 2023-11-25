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

describe("POST /users/", () => {
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
    //TODO implement it
  });

  it("should fail to create a new user if some fields are empty", async () => {
    //TODO implement it
  });
});

describe("PUT /users/:uuid", () => {
  it("should update a user", async () => {
    //TODO implement it
  });

  it("should fail to update a user protected fields", async () => {
    //TODO implement it
  });

  it("should fail to update a user if not exists", async () => {
    //TODO implement it
  });
});

describe("DELETE /users/:uuid", () => {
  it("should delete a user", async () => {
    //TODO implement it
  });

  it("should fail to delete a user if not exists", async () => {
    //TODO implement it
  });
});

describe("PATCH /users/active/:uuid", () => {
  it("should active a user", async () => {
    //TODO implement it
  });

  it("should fail to active a user if not exists", async () => {
    //TODO implement it
  });
});

describe("PATCH /users/deactive/:uuid", () => {
  it("should deactive a user", async () => {
    //TODO implement it
  });

  it("should fail to deactive a user if not exists", async () => {
    //TODO implement it
  });
});

describe("POST /users/login", () => {
  it("should return a jwt if user and password are correct", async () => {
    //TODO implement it
  });

  it("should fail to login if user or password are incorrect", async () => {
    //TODO implement it
  });
});

describe("GET /users/", () => {
  it("should return a list of users", async () => {
    //TODO implement it
  });

  it("should return an empty array of users if not exists anyone", async () => {
    //TODO implement it
  });
});

describe("GET /users/:uuid", () => {
  it("should return a user", async () => {
    //TODO implement it
  });

  it("should fail to return a user if not exists", async () => {
    //TODO implement it
  });
});
