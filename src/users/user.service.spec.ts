import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import UserModel from './user.schema';
import { UserDocument, UserPost } from './user.interface';
import { UserService } from './user.service';
import { JWT } from '../framework/auth';
import { Roles } from '../framework/roles.interface';

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

describe('createUser', () => {
	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should create a new user', async () => {
		const userData: UserPost = {
			name: 'testuser',
			email: 'test@test.com',
			password: 'password123',
			rol: Roles.SUPERADMIN,
		};
		const user = await userService.createUser(userData);
		expect(user.email).toEqual(userData.email);
		expect(user.name).toEqual(userData.name);
	});

	it('should fail to create a new user if some fields are empty', async () => {
		await expect(
			userService.createUser({
				name: 'test',
				email: '',
				password: '1234',
				rol: Roles.USER,
			})
		).rejects.toThrow();
		await expect(
			userService.createUser({
				name: '',
				email: 'test@test.com',
				password: '1234',
				rol: Roles.USER,
			})
		).rejects.toThrow();
		await expect(
			userService.createUser({
				name: 'test',
				email: 'test@test.com',
				password: '',
				rol: Roles.USER,
			})
		).rejects.toThrow();
	});

	it('should fail to create a new user with existing email', async () => {
		await UserModel.create({
			uuid: '123456789abc',
			name: 'test1',
			email: 'test@test.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});
		await expect(
			userService.createUser({
				name: 'test',
				email: 'test@test.com',
				password: '1234',
				rol: Roles.USER,
			})
		).rejects.toThrow();
	});
});

describe('loginUser', () => {
	const user = {
		name: 'test',
		email: 'test@test.com',
		password: '1234',
		rol: Roles.USER,
	};
	beforeAll(async () => {
		await userService.createUser(user);
	});

	it('should login successfully', async () => {
		const jwt = await userService.loginUser({
			email: user.email,
			password: user.password,
		});
		expect(jwt).toBeDefined();
	});

	it('should fail login if data is incorrect', async () => {
		await expect(
			userService.loginUser({ email: '', password: user.password })
		).rejects.toThrow();
		await expect(
			userService.loginUser({ email: 'abcd', password: user.password })
		).rejects.toThrow();
		await expect(
			userService.loginUser({ email: user.email, password: 'wrong' })
		).rejects.toThrow();
		await expect(
			userService.loginUser({ email: user.email, password: '' })
		).rejects.toThrow();
		await expect(
			userService.loginUser({ email: 'true', password: 'true' })
		).rejects.toThrow();
	});
});

describe('updateUser', () => {
	let user: UserDocument;
	beforeEach(async () => {
		user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});
	});

	afterEach(async () => {
		// Limpiar la base de datos antes de cada prueba
		await UserModel.deleteMany({});
	});

	it('should update my user', async () => {
		const update = {
			name: 'updated name',
		};
		const token: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.USER,
			expires: new Date(),
		};
		const updated = await userService.updateUser(user.uuid, update, token);
		expect(updated.name).toBe(update.name);
	});

	it('should update my user but not all fields', async () => {
		const update = {
			name: 'updated name',
			email: 'wrong@mail.com',
			password: 'wrong',
			active: false,
		};
		const token: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.USER,
			expires: new Date(),
		};
		await userService.updateUser(user.uuid, update, token);
		const updated = await UserModel.findOne({ uuid: user.uuid });
		expect(updated).not.toBeNull();
		expect(updated?.name).toBe(update.name);
		expect(updated?.email).not.toBe(update.email);
		expect(updated?.password).not.toBe(update.password);
		expect(updated?.active).not.toBe(update.active);
	});

	it('should fail to update uuid', async () => {
		const update = {
			uuid: 'fake',
			name: 'updated name',
			email: 'wrong@mail.com',
			password: 'wrong',
			active: false,
		};
		const token: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.USER,
			expires: new Date(),
		};
		await userService.updateUser(user.uuid, update, token);
		const updated = await UserModel.findOne({ uuid: user.uuid });
		expect(updated).not.toBeNull();
	});

	it('should fail to update another uuid if you are not SUPERADMIN', async () => {
		const newUser = await UserModel.create({
			uuid: '123456789abcdefg',
			name: 'anotheruser',
			email: 'test5@test2.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});

		const update = {
			name: 'updated name',
			email: 'wrong@mail.com',
			password: 'wrong',
			active: false,
		};
		const token: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.USER,
			expires: new Date(),
		};
		await expect(
			userService.updateUser(newUser.uuid, update, token)
		).rejects.toThrow();

		const superAdmin: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await userService.updateUser(newUser.uuid, update, superAdmin);
		const updated = await UserModel.findOne({ uuid: newUser.uuid });
		expect(updated).not.toBeNull();
		expect(updated?.name).toBe(update.name);
	});
});

describe('activeUser', () => {
	afterEach(async () => {
		// Limpiar la base de datos antes de cada prueba
		await UserModel.deleteMany({});
	});

	it('should active a user', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: false,
			rol: Roles.USER,
		});
		const superAdmin: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await userService.activeUser(user.uuid, superAdmin);
		const userFounded = await UserModel.findOne({ uuid: user.uuid });
		expect(userFounded?.active).toBeTruthy();
	});

	it('should fail to active a user if uuid is wrong', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: false,
			rol: Roles.USER,
		});
		const superAdmin: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await expect(userService.activeUser('abcd', superAdmin)).rejects.toThrow();
		await expect(userService.activeUser('', superAdmin)).rejects.toThrow();
		await expect(userService.activeUser('true', superAdmin)).rejects.toThrow();
	});

	it('should fail to active another user if i am not SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: false,
			rol: Roles.USER,
		});
		const myToken: JWT = {
			uuid: 'myownuuid',
			name: user.name,
			email: user.email,
			rol: Roles.USER,
			expires: new Date(),
		};
		await expect(userService.activeUser(user.uuid, myToken)).rejects.toThrow();
	});
});

describe('deactiveUser', () => {
	afterEach(async () => {
		// Limpiar la base de datos antes de cada prueba
		await UserModel.deleteMany({});
	});

	it('should deactive a user', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});
		const superAdmin: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await userService.deactiveUser(user.uuid, superAdmin);
		const userFounded = await UserModel.findOne({ uuid: user.uuid });
		expect(userFounded?.active).toBeFalsy();
	});

	it('should fail to deactive a user if uuid is wrong', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});
		const superAdmin: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await expect(
			userService.deactiveUser('abcd', superAdmin)
		).rejects.toThrow();
		await expect(userService.deactiveUser('', superAdmin)).rejects.toThrow();
		await expect(
			userService.deactiveUser('true', superAdmin)
		).rejects.toThrow();
	});

	it('should fail to deactive another user if i am not SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});
		const myToken: JWT = {
			uuid: 'myownuuid',
			name: user.name,
			email: user.email,
			rol: Roles.USER,
			expires: new Date(),
		};
		await expect(
			userService.deactiveUser(user.uuid, myToken)
		).rejects.toThrow();
	});
});

describe('deleteUser', () => {
	afterEach(async () => {
		// Limpiar la base de datos antes de cada prueba
		await UserModel.deleteMany({});
	});

	it('should delete a user', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});
		const superAdmin: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await userService.deleteUser(user.uuid, superAdmin);
		const userFounded = await UserModel.findOne({ uuid: user.uuid });
		expect(userFounded).toBeNull();
	});

	it('should fail to delete a user if uuid is wrong', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: false,
			rol: Roles.USER,
		});
		const superAdmin: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await expect(userService.deleteUser('abcd', superAdmin)).rejects.toThrow();
		await expect(userService.deleteUser('', superAdmin)).rejects.toThrow();
		await expect(userService.deleteUser('true', superAdmin)).rejects.toThrow();
	});

	it('should fail to delete a user if i am not SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test',
			email: 'test@test.com',
			password: '1234',
			active: false,
			rol: Roles.USER,
		});
		const myToken: JWT = {
			uuid: 'myownuuid',
			name: user.name,
			email: user.email,
			rol: Roles.USER,
			expires: new Date(),
		};
		await expect(userService.deleteUser(user.uuid, myToken)).rejects.toThrow();
	});
});

describe('listUsers', () => {
	afterEach(async () => {
		// Limpiar la base de datos antes de cada prueba
		await UserModel.deleteMany({});
	});

	it('should list all users if i am SUPERADMIN', async () => {
		const users = await UserModel.create([
			{
				uuid: '123456789abc',
				name: 'test1',
				email: 'test1@test.com',
				password: '1234',
				active: true,
				rol: Roles.USER,
			},
			{
				uuid: '123456789abcd',
				name: 'test2',
				email: 'test2@test.com',
				password: '1234',
				active: true,
				rol: Roles.USER,
			},
			{
				uuid: '123456789abce',
				name: 'test3',
				email: 'test3@test.com',
				password: '1234',
				active: true,
				rol: Roles.USER,
			},
		]);
		const superAdmin: JWT = {
			uuid: 'myid',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		const list = await userService.listUsers(superAdmin);
		expect(list.length).toBe(users.length);
		expect(list[0].name).toBe(users[0].name);
	});

	it('should list active users if i am not SUPERADMIN', async () => {
		await UserModel.create([
			{
				uuid: '123456789abc',
				name: 'test1',
				email: 'test1@test.com',
				password: '1234',
				active: true,
				rol: Roles.USER,
			},
			{
				uuid: '123456789abcd',
				name: 'test2',
				email: 'test2@test.com',
				password: '1234',
				active: false,
				rol: Roles.USER,
			},
			{
				uuid: '123456789abce',
				name: 'test3',
				email: 'test3@test.com',
				password: '1234',
				active: true,
				rol: Roles.USER,
			},
		]);
		const myToken: JWT = {
			uuid: 'myid',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.USER,
			expires: new Date(),
		};
		const list = await userService.listUsers(myToken);
		const activeUsers = await UserModel.find({ active: true });
		expect(list.length).toBe(activeUsers.length);
	});
});

describe('getUser', () => {
	afterEach(async () => {
		// Limpiar la base de datos antes de cada prueba
		await UserModel.deleteMany({});
	});

	it('should return an active user', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test1',
			email: 'test@test.com',
			password: '1234',
			active: true,
			rol: Roles.USER,
		});
		const myToken: JWT = {
			uuid: 'myid',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.USER,
			expires: new Date(),
		};
		const readUser = await userService.getUser(user.uuid, myToken);
		expect(readUser.name).toBe(user.name);
		expect(readUser.uuid).toBe(user.uuid);
	});

	it('should return a inactive user if you are SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '123456789abc',
			name: 'test1',
			email: 'test@test.com',
			password: '1234',
			active: false,
			rol: Roles.USER,
		});
		const superAdmin: JWT = {
			uuid: 'myid',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};

		const myToken: JWT = {
			uuid: 'myid',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.USER,
			expires: new Date(),
		};
		const readUser = await userService.getUser(user.uuid, superAdmin);
		expect(readUser.name).toBe(user.name);
		expect(readUser.uuid).toBe(user.uuid);

		await expect(userService.getUser(user.uuid, myToken)).rejects.toThrow();
	});

	it('should fail to return a user if not exist', async () => {
		const superAdmin: JWT = {
			uuid: 'myid',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		await expect(userService.getUser('wrong', superAdmin)).rejects.toThrow();
		await expect(userService.getUser('true', superAdmin)).rejects.toThrow();
	});
});
