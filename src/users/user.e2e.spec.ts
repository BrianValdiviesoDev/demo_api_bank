import request from 'supertest';
import { app } from '../server';
import { JWT } from '../framework/auth';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import UserModel from './user.schema';
import { Roles } from '../framework/roles.interface';
import { UserDocument, UserPut } from './user.interface';
import bcrypt from 'bcrypt';

const generateJwt = (user: any): string => {
	const expirationDate = new Date();
	expirationDate.setDate(expirationDate.getDate() + 30);
	const payload: JWT = {
		...user,
		expires: expirationDate,
	};
	return jwt.sign(payload, process.env.JWT_SECRET || '');
};

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = await mongoServer.getUri();
	await mongoose.connect(mongoUri);
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
});

describe('POST /users/', () => {
	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should create a new user', async () => {
		const res = await request(app).post('/users/').send({
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.USER,
		});
		expect(res.statusCode).toEqual(201);
		expect(res.body).toHaveProperty('uuid');
	});

	it('should fail to create a new user if email exists', async () => {
		const user = {
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.USER,
		};

		await UserModel.create({ uuid: '1234abc', ...user });

		const res = await request(app).post('/users/').send(user);
		expect(res.statusCode).toEqual(400);
	});

	it('should fail to create a new user if some fields are empty', async () => {
		const emptyName = await request(app).post('/users/').send({
			name: '',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.USER,
		});
		expect(emptyName.statusCode).toEqual(400);

		const emptyEmail = await request(app).post('/users/').send({
			name: 'test',
			email: '',
			password: 'testpassword',
			rol: Roles.USER,
		});
		expect(emptyEmail.statusCode).toEqual(400);

		const emptyPwd = await request(app).post('/users/').send({
			name: 'test',
			email: 'testuser@example.com',
			password: '',
			rol: Roles.USER,
		});
		expect(emptyPwd.statusCode).toEqual(400);

		const emptyRol = await request(app).post('/users/').send({
			name: 'test',
			email: 'testuser@example.com',
			password: '',
			rol: '',
		});
		expect(emptyRol.statusCode).toEqual(400);
	});
});

describe('PUT /users/:uuid', () => {
	let superAdminToken: string;
	beforeEach(async () => {
		const superAdmin = await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.SUPERADMIN,
		});
		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		superAdminToken = generateJwt(payload);
	});

	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should update my user', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'newuser@example.com',
			password: 'testpassword',
			rol: Roles.USER,
		});

		const payload: JWT = {
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: user.rol,
			expires: new Date(),
		};
		const myToken = generateJwt(payload);

		const update: UserPut = {
			name: 'my new name',
		};
		const res = await request(app)
			.put(`/users/${user.uuid}`)
			.set('Authorization', `${myToken}`)
			.send(update);
		expect(res.statusCode).toEqual(200);
		expect(res.body.name).toBe(update.name);
	});

	it('should fail to update a user protected fields', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'newuser@example.com',
			password: 'testpassword',
			rol: Roles.USER,
		});

		const update = {
			name: 'my new name',
			uuid: 'another uuid',
			email: 'wrong@example.com',
			password: 'wrong',
		};

		const res = await request(app)
			.put(`/users/${user.uuid}`)
			.set('Authorization', `${superAdminToken}`)
			.send(update);
		expect(res.statusCode).toEqual(200);
		expect(res.body.name).toBe(update.name);
		expect(res.body.uuid).not.toBe(update.uuid);
		expect(res.body.email).not.toBe(update.email);
		expect(res.body.password).not.toBe(update.password);
	});

	it('should fail to update a user if not exists', async () => {
		const update = {
			name: 'my new name',
			uuid: 'another uuid',
			email: 'wrong@example.com',
			password: 'wrong',
		};
		const res = await request(app)
			.put('/users/wronguuid')
			.set('Authorization', `${superAdminToken}`)
			.send(update);
		expect(res.statusCode).toEqual(404);

		const trueRes = await request(app)
			.put('/users/true')
			.set('Authorization', `${superAdminToken}`)
			.send(update);
		expect(trueRes.statusCode).toEqual(404);
	});

	it('should fail to update another user if you are not SUPERADMIN', async () => {
		const myUser: JWT = {
			uuid: 'myuuid',
			name: 'me',
			email: 'me@me.com',
			rol: Roles.USER,
			expires: new Date(),
		};
		const myToken = generateJwt(myUser);

		const userToUpdate = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'userprotected@example.com',
			password: 'testpassword',
			rol: Roles.USER,
		});

		const update = {
			name: 'try to change',
		};

		const res = await request(app)
			.put(`/users/${userToUpdate.uuid}`)
			.set('Authorization', `${myToken}`)
			.send(update);
		expect(res.statusCode).toEqual(404);

		const superAdminRequest = await request(app)
			.put(`/users/${userToUpdate.uuid}`)
			.set('Authorization', `${superAdminToken}`)
			.send(update);
		expect(superAdminRequest.statusCode).toEqual(200);
		expect(superAdminRequest.body.name).toBe(update.name);
	});
});

describe('DELETE /users/:uuid', () => {
	let superAdminToken: string;
	beforeEach(async () => {
		const superAdmin = await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.SUPERADMIN,
		});
		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		superAdminToken = generateJwt(payload);
	});

	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should delete a user', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'newuser@example.com',
			password: '1234',
			rol: Roles.USER,
		});
		const res = await request(app)
			.delete(`/users/${user.uuid}`)
			.set('Authorization', `${superAdminToken}`);

		expect(res.statusCode).toEqual(200);
		const users = await UserModel.findOne({ uuid: user.uuid });
		expect(users).toBeNull();
	});

	it('should fail to delete a user if i am not SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'newuser@example.com',
			password: '1234',
			rol: Roles.USER,
		});
		const myuser = await UserModel.create({
			uuid: '123456test',
			name: 'mytestuser',
			email: 'mynewuser@example.com',
			password: '1234',
			rol: Roles.USER,
		});
		const token = generateJwt({
			uuid: myuser.uuid,
			name: myuser.name,
			email: myuser.email,
			rol: myuser.rol,
			expires: new Date(),
		});
		const res = await request(app)
			.delete(`/users/${user.uuid}`)
			.set('Authorization', `${token}`);

		expect(res.statusCode).toEqual(403);

		const newRes = await request(app)
			.delete(`/users/${myuser.uuid}`)
			.set('Authorization', `${token}`);

		expect(newRes.statusCode).toEqual(403);

		const superAdminRes = await request(app)
			.delete(`/users/${user.uuid}`)
			.set('Authorization', `${superAdminToken}`);

		expect(superAdminRes.statusCode).toEqual(200);
	});

	it('should fail to delete a user if not exists', async () => {
		const res = await request(app)
			.delete('/users/wrong')
			.set('Authorization', `${superAdminToken}`);

		expect(res.statusCode).toEqual(404);

		const newRes = await request(app)
			.delete('/users/true')
			.set('Authorization', `${superAdminToken}`);

		expect(newRes.statusCode).toEqual(404);
	});
});

describe('PATCH /users/active/:uuid', () => {
	let superAdminToken: string;
	beforeEach(async () => {
		const superAdmin = await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.SUPERADMIN,
		});
		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		superAdminToken = generateJwt(payload);
	});

	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should active a user', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'testuseractive@example.com',
			password: 'testpassword',
			rol: Roles.USER,
			active: false,
		});
		const res = await request(app)
			.patch(`/users/active/${user.uuid}`)
			.set('Authorization', `${superAdminToken}`);
		expect(res.statusCode).toEqual(200);
		const updated = await UserModel.findOne({ uuid: user.uuid });
		expect(updated?.active).toBe(true);
	});

	it('should fail to active a user if not exists', async () => {
		const res = await request(app)
			.patch('/users/active/wrong')
			.set('Authorization', `${superAdminToken}`);
		expect(res.statusCode).toEqual(404);
	});

	it('should fail to active a user if i am not SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'testuseractive@example.com',
			password: 'testpassword',
			rol: Roles.USER,
			active: false,
		});
		const token = generateJwt({
			uuid: 'mytest1234',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.USER,
			expires: new Date(),
		});
		const res = await request(app)
			.patch(`/users/active/${user.uuid}`)
			.set('Authorization', `${token}`);
		expect(res.statusCode).toEqual(403);
	});
});

describe('PATCH /users/deactive/:uuid', () => {
	let superAdminToken: string;
	beforeEach(async () => {
		const superAdmin = await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.SUPERADMIN,
		});
		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		superAdminToken = generateJwt(payload);
	});

	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should deactive a user if you are SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'testuserdeactive@example.com',
			password: 'testpassword',
			rol: Roles.USER,
			active: true,
		});
		const res = await request(app)
			.patch(`/users/deactive/${user.uuid}`)
			.set('Authorization', `${superAdminToken}`);
		expect(res.statusCode).toEqual(200);
		const updated = await UserModel.findOne({ uuid: user.uuid });
		expect(updated?.active).toBe(false);
	});

	it('should deactive my user', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'testuserdeactive@example.com',
			password: 'testpassword',
			rol: Roles.USER,
			active: true,
		});
		const myToken = generateJwt({
			uuid: user.uuid,
			name: user.name,
			email: user.email,
			rol: user.rol,
		});

		const res = await request(app)
			.patch(`/users/deactive/${user.uuid}`)
			.set('Authorization', `${myToken}`);
		expect(res.statusCode).toEqual(200);
		const updated = await UserModel.findOne({ uuid: user.uuid });
		expect(updated?.active).toBe(false);
	});

	it('should fail to dective a user if not exists', async () => {
		const res = await request(app)
			.patch('/users/deactive/wrong')
			.set('Authorization', `${superAdminToken}`);
		expect(res.statusCode).toEqual(404);

		const newRes = await request(app)
			.patch('/users/deactive/true')
			.set('Authorization', `${superAdminToken}`);
		expect(newRes.statusCode).toEqual(404);
	});

	it('should fail to dective another user if i am not SUPERADMIN', async () => {
		const user = await UserModel.create({
			uuid: '1234test',
			name: 'testuser',
			email: 'testuseractive@example.com',
			password: 'testpassword',
			rol: Roles.USER,
			active: false,
		});
		const token = generateJwt({
			uuid: 'anotheruser',
			name: 'foo',
			email: 'foo@bar.com',
			rol: Roles.USER,
			expires: new Date(),
		});
		const res = await request(app)
			.patch(`/users/deactive/${user.uuid}`)
			.set('Authorization', `${token}`);
		expect(res.statusCode).toEqual(403);
	});
});

describe('POST /users/login', () => {
	const email = 'testuser@example.com';
	const password = 'testpassword';
	beforeAll(async () => {
		const hashedPassword = await bcrypt.hash(password, 10);
		await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email,
			password: hashedPassword,
			rol: Roles.SUPERADMIN,
		});
	});

	afterAll(async () => {
		await UserModel.deleteMany({});
	});

	it('should return a jwt if user and password are correct', async () => {
		const res = await request(app)
			.post('/users/login/')
			.send({ email, password });
		expect(res.statusCode).toEqual(200);
	});

	it('should fail to login if user or password are incorrect', async () => {
		const res = await request(app)
			.post('/users/login/')
			.send({ email: 'wrong@email.com', password });
		expect(res.statusCode).toEqual(400);

		const newRes = await request(app)
			.post('/users/login/')
			.send({ email, password: 'wrongpass' });
		expect(newRes.statusCode).toEqual(400);

		const emptyEmail = await request(app)
			.post('/users/login/')
			.send({ email: '', password });
		expect(emptyEmail.statusCode).toEqual(400);

		const emptyPwd = await request(app)
			.post('/users/login/')
			.send({ email, password: '' });
		expect(emptyPwd.statusCode).toEqual(400);
	});
});

describe('GET /users/', () => {
	let superAdminToken: string;
	beforeEach(async () => {
		const superAdmin = await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.SUPERADMIN,
		});
		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		superAdminToken = generateJwt(payload);
		await UserModel.create([
			{
				uuid: 'first',
				name: 'test',
				email: 'test1@example.com',
				password: 'test',
				rol: Roles.USER,
				active: true,
			},
			{
				uuid: 'second',
				name: 'test',
				email: 'test2@example.com',
				password: 'test',
				rol: Roles.USER,
				active: true,
			},
			{
				uuid: 'third',
				name: 'test',
				email: 'test3@example.com',
				password: 'test',
				rol: Roles.USER,
				active: false,
			},
			{
				uuid: 'fourth',
				name: 'test',
				email: 'test4@example.com',
				password: 'test',
				rol: Roles.SUPERADMIN,
				active: true,
			},
		]);
	});

	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should return a complete list of users if you are SUPERADMIN', async () => {
		const res = await request(app)
			.get('/users/')
			.set('Authorization', `${superAdminToken}`);
		expect(res.statusCode).toEqual(200);

		const list = await UserModel.find({});
		expect(res.body.length).toBe(list.length);
	});

	it('should return a list of active users if you are not SUPERADMIN', async () => {
		const myToken = generateJwt({
			uuid: 'myid',
			name: 'test',
			email: 'myuser@example.com',
			rol: Roles.USER,
			expires: new Date(),
		});
		const res = await request(app)
			.get('/users/')
			.set('Authorization', `${myToken}`);
		expect(res.statusCode).toEqual(200);

		const list = await UserModel.find({ active: true });
		expect(res.body.length).toBe(list.length);
	});

	it('should return an empty array if there are no active users', async () => {
		await UserModel.deleteMany({});
		const myToken = generateJwt({
			uuid: 'myid',
			name: 'test',
			email: 'myuser@example.com',
			rol: Roles.USER,
			expires: new Date(),
		});
		const res = await request(app)
			.get('/users/')
			.set('Authorization', `${myToken}`);
		expect(res.statusCode).toEqual(404);
	});
});

describe('GET /users/:uuid', () => {
	let superAdminToken: string;
	let inactiveUserId: string;
	let activeUserId: string;
	beforeAll(async () => {
		const superAdmin = await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.SUPERADMIN,
		});
		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: Roles.SUPERADMIN,
			expires: new Date(),
		};
		superAdminToken = generateJwt(payload);
		const inactiveUser = await UserModel.create({
			uuid: 'first',
			name: 'test',
			email: 'test1@example.com',
			password: 'test',
			rol: Roles.USER,
			active: false,
		});
		inactiveUserId = inactiveUser.uuid;

		const user = await UserModel.create({
			uuid: 'second',
			name: 'test',
			email: 'test2@example.com',
			password: 'test',
			rol: Roles.USER,
			active: true,
		});
		activeUserId = user.uuid;
	});

	afterAll(async () => {
		await UserModel.deleteMany({});
	});

	it('should return a inactive user if you are SUPERADMIN', async () => {
		const myToken = generateJwt({
			uuid: 'myid',
			name: 'test',
			email: 'myuser@example.com',
			rol: Roles.USER,
			expires: new Date(),
		});
		const res = await request(app)
			.get(`/users/${inactiveUserId}`)
			.set('Authorization', `${myToken}`);
		expect(res.statusCode).toEqual(404);

		const newRes = await request(app)
			.get(`/users/${inactiveUserId}`)
			.set('Authorization', `${superAdminToken}`);
		expect(newRes.statusCode).toEqual(200);
	});

	it('should return an active user', async () => {
		const myToken = generateJwt({
			uuid: 'myid',
			name: 'test',
			email: 'myuser@example.com',
			rol: Roles.USER,
			expires: new Date(),
		});
		const res = await request(app)
			.get(`/users/${activeUserId}`)
			.set('Authorization', `${myToken}`);
		expect(res.statusCode).toEqual(200);

		const newRes = await request(app)
			.get(`/users/${activeUserId}`)
			.set('Authorization', `${superAdminToken}`);
		expect(newRes.statusCode).toEqual(200);
	});

	it('should fail to return a user if not exists', async () => {
		const res = await request(app)
			.get('/users/wrong')
			.set('Authorization', `${superAdminToken}`);
		expect(res.statusCode).toEqual(404);

		const newRes = await request(app)
			.get('/users/true')
			.set('Authorization', `${superAdminToken}`);
		expect(newRes.statusCode).toEqual(404);
	});
});

describe('Auth middleware security', () => {
	let superAdmin: UserDocument;
	beforeEach(async () => {
		superAdmin = await UserModel.create({
			uuid: '1234abc',
			name: 'testuser',
			email: 'testuser@example.com',
			password: 'testpassword',
			rol: Roles.SUPERADMIN,
		});
		UserModel.create({
			uuid: '123456abc',
			name: 'newuser',
			email: 'newuser@example.com',
			rol: Roles.USER,
			password: '1234',
		});
	});

	afterEach(async () => {
		await UserModel.deleteMany({});
	});

	it('should fail to get user with not signed token', async () => {
		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: superAdmin.rol,
			expires: new Date(),
		};
		const expiredToken = jwt.sign(payload, 'anothersecret');
		const res = await request(app)
			.get(`/users/${superAdmin.uuid}`)
			.set('Authorization', `${expiredToken}`);

		expect(res.statusCode).toEqual(403);
	});

	it('should fail to get user with expired token', async () => {
		const tokenDate = new Date();
		tokenDate.setDate(tokenDate.getDate() - 1);

		const payload: JWT = {
			uuid: superAdmin.uuid,
			name: superAdmin.name,
			email: superAdmin.email,
			rol: superAdmin.rol,
			expires: tokenDate,
		};
		const expiredToken = jwt.sign(payload, process.env.JWT_SECRET || '');
		const res = await request(app)
			.get(`/users/${superAdmin.uuid}`)
			.set('Authorization', `${expiredToken}`);

		expect(res.statusCode).toEqual(403);
	});

	it('should fail to get user with invalid token', async () => {
		const res = await request(app).get(`/users/${superAdmin.uuid}`);
		expect(res.statusCode).toEqual(401);
	});
});
