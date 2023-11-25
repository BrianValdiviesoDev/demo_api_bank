import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import UserModel from "./user.schema";
import { UserDocument, UserPost } from "./user.interface";
import { UserService } from "./user.service";
import { JWT } from "../framework/auth";

let mongoServer: MongoMemoryServer;
let userService: UserService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = await mongoServer.getUri();
  await mongoose.connect(mongoUri);
  userService = new UserService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Limpiar la base de datos antes de cada prueba
  await UserModel.deleteMany({});
});

describe("createUser", () => {
  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  it("should create a new user", async () => {
    const userData: UserPost = {
      name: "testuser",
      email: "test@test.com",
      password: "password123",
    };
    const user = await userService.createUser(userData);
    expect(user.email).toEqual(userData.email);
    expect(user.name).toEqual(userData.name);
  });

  it("should fail to create a new user if some fields are empty", async () => {
    await expect(
      userService.createUser({ name: "test", email: "", password: "1234" })
    ).rejects.toThrow();
    await expect(
      userService.createUser({
        name: "",
        email: "test@test.com",
        password: "1234",
      })
    ).rejects.toThrow();
    await expect(
      userService.createUser({
        name: "test",
        email: "test@test.com",
        password: "",
      })
    ).rejects.toThrow();
  });

  it("should fail to create a new user with existing email", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test1",
      email: "test@test.com",
      password: "1234",
      active: true,
    });
    await expect(
      userService.createUser({
        name: "test",
        email: "test@test.com",
        password: "1234",
      })
    ).rejects.toThrow();
  });
});

describe("loginUser", () => {
  const user = {
    name: "test",
    email: "test@test.com",
    password: "1234",
  };
  beforeAll(async () => {
    await userService.createUser(user);
  });

  it("should login successfully", async () => {
    const jwt = await userService.loginUser({
      email: user.email,
      password: user.password,
    });
    expect(jwt).toBeDefined();
  });

  it("should fail login if data is incorrect", async () => {
    await expect(
      userService.loginUser({ email: "", password: user.password })
    ).rejects.toThrow();
    await expect(
      userService.loginUser({ email: "abcd", password: user.password })
    ).rejects.toThrow();
    await expect(
      userService.loginUser({ email: user.email, password: "wrong" })
    ).rejects.toThrow();
    await expect(
      userService.loginUser({ email: user.email, password: "" })
    ).rejects.toThrow();
    await expect(
      userService.loginUser({ email: "true", password: "true" })
    ).rejects.toThrow();
  });
});

describe("updateUser", () => {
  let user: UserDocument;
  beforeEach(async () => {
    user = await UserModel.create({
      uuid: "123456789abc",
      name: "test",
      email: "test@test.com",
      password: "1234",
      active: true,
    });
  });

  afterEach(async () => {
    // Limpiar la base de datos antes de cada prueba
    await UserModel.deleteMany({});
  });

  it("should update a user", async () => {
    const update = {
      name: "updated name",
    };
    const token: JWT = {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
    };
    const updated = await userService.updateUser(user.uuid, update, token);
    expect(updated.name).toBe(update.name);
  });

  it("should update a user but not all fields", async () => {
    const update = {
      name: "updated name",
      email: "wrong@mail.com",
      password: "wrong",
      active: false,
    };
    const token: JWT = {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
    };
    await userService.updateUser(user.uuid, update, token);
    const updated = await UserModel.findOne({ uuid: user.uuid });
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe(update.name);
    expect(updated?.email).not.toBe(update.email);
    expect(updated?.password).not.toBe(update.password);
    expect(updated?.active).not.toBe(update.active);
  });

  it("should fail to update uuid", async () => {
    const update = {
      uuid: "fake",
      name: "updated name",
      email: "wrong@mail.com",
      password: "wrong",
      active: false,
    };
    const token: JWT = {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
    };
    await userService.updateUser(user.uuid, update, token);
    const updated = await UserModel.findOne({ uuid: user.uuid });
    expect(updated).not.toBeNull();
  });
});

describe("activeUser", () => {
  afterEach(async () => {
    // Limpiar la base de datos antes de cada prueba
    await UserModel.deleteMany({});
  });

  it("should active a user", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test",
      email: "test@test.com",
      password: "1234",
      active: false,
    });
    await userService.activeUser(user.uuid);
    const userFounded = await UserModel.findOne({ uuid: user.uuid });
    expect(userFounded?.active).toBeTruthy();
  });

  it("should fail to active a user if uuid is wrong", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test",
      email: "test@test.com",
      password: "1234",
      active: false,
    });
    await expect(userService.activeUser("abcd")).rejects.toThrow();
    await expect(userService.activeUser("")).rejects.toThrow();
    await expect(userService.activeUser("true")).rejects.toThrow();
  });
});

describe("deactiveUser", () => {
  afterEach(async () => {
    // Limpiar la base de datos antes de cada prueba
    await UserModel.deleteMany({});
  });

  it("should deactive a user", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test",
      email: "test@test.com",
      password: "1234",
      active: true,
    });
    await userService.deactiveUser(user.uuid);
    const userFounded = await UserModel.findOne({ uuid: user.uuid });
    expect(userFounded?.active).toBeFalsy();
  });

  it("should fail to deactive a user if uuid is wrong", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test",
      email: "test@test.com",
      password: "1234",
      active: false,
    });
    await expect(userService.deactiveUser("abcd")).rejects.toThrow();
    await expect(userService.deactiveUser("")).rejects.toThrow();
    await expect(userService.deactiveUser("true")).rejects.toThrow();
  });
});

describe("deleteUser", () => {
  afterEach(async () => {
    // Limpiar la base de datos antes de cada prueba
    await UserModel.deleteMany({});
  });

  it("should delete a user", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test",
      email: "test@test.com",
      password: "1234",
      active: true,
    });
    await userService.deleteUser(user.uuid);
    const userFounded = await UserModel.findOne({ uuid: user.uuid });
    expect(userFounded).toBeNull();
  });

  it("should fail to delete a user if uuid is wrong", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test",
      email: "test@test.com",
      password: "1234",
      active: false,
    });
    await expect(userService.deleteUser("abcd")).rejects.toThrow();
    await expect(userService.deleteUser("")).rejects.toThrow();
    await expect(userService.deleteUser("true")).rejects.toThrow();
  });
});

describe("listUsers", () => {
  afterEach(async () => {
    // Limpiar la base de datos antes de cada prueba
    await UserModel.deleteMany({});
  });

  it("should list all users", async () => {
    const users = await UserModel.create([
      {
        uuid: "123456789abc",
        name: "test1",
        email: "test1@test.com",
        password: "1234",
        active: true,
      },
      {
        uuid: "123456789abcd",
        name: "test2",
        email: "test2@test.com",
        password: "1234",
        active: true,
      },
      {
        uuid: "123456789abce",
        name: "test3",
        email: "test3@test.com",
        password: "1234",
        active: true,
      },
    ]);

    const list = await userService.listUsers();
    expect(list.length).toBe(users.length);
    expect(list[0].name).toBe(users[0].name);
  });
});

describe("getUser", () => {
  afterEach(async () => {
    // Limpiar la base de datos antes de cada prueba
    await UserModel.deleteMany({});
  });

  it("should return a user", async () => {
    const user = await UserModel.create({
      uuid: "123456789abc",
      name: "test1",
      email: "test@test.com",
      password: "1234",
      active: true,
    });

    const readUser = await userService.getUser(user.uuid);
    expect(readUser.name).toBe(user.name);
    expect(readUser.uuid).toBe(user.uuid);
  });
});
