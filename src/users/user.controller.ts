import { Request, Response } from "express";
import { UserService } from "./user.service";
import { ApiError } from "../framework/error-handling";

const createUser = async (req: Request, res: Response, next: any) => {
  try {
    const userService = new UserService();
    const newUser = await userService.createUser(req.body);
    res.send(newUser);
  } catch (e: any) {
    const err: ApiError = new Error();
    err.statusCode = 400;
    err.message = e.message;
    next(err);
  }
};

const updateUser = async (req: any, res: Response, next: any) => {
  try {
    const userService = new UserService();
    const updated = await userService.updateUser(
      req.params.uuid,
      req.body,
      req.user
    );
    res.send(updated);
  } catch (e: any) {
    const err: ApiError = new Error();
    err.statusCode = 400;
    err.message = e.message;
    next(err);
  }
};

const activeUser = async (req: Request, res: Response, next: any) => {
  try {
    const userService = new UserService();
    const updated = await userService.activeUser(req.params.uuid);
    res.send(updated);
  } catch (e: any) {
    const err: ApiError = new Error();
    err.statusCode = 400;
    err.message = e.message;
    next(err);
  }
};

const deactiveUser = async (req: Request, res: Response, next: any) => {
  try {
    const userService = new UserService();
    const updated = await userService.deactiveUser(req.params.uuid);
    res.send(updated);
  } catch (e: any) {
    const err: ApiError = new Error();
    err.statusCode = 400;
    err.message = e.message;
    next(err);
  }
};

const deleteUser = async (req: Request, res: Response, next: any) => {
  try {
    const userService = new UserService();
    const deleted = await userService.deleteUser(req.params.uuid);
    res.send(deleted);
  } catch (e: any) {
    const err: ApiError = new Error();
    err.statusCode = 400;
    err.message = e.message;
    next(err);
  }
};

const listUsers = async (req: Request, res: Response, next: any) => {
  try {
    const userService = new UserService();
    const users = await userService.listUsers();
    res.send(users);
  } catch (e: any) {
    const err: ApiError = new Error();
    err.statusCode = 400;
    err.message = e.message;
    next(err);
  }
};

const getUser = async (req: Request, res: Response, next: any) => {
  try {
    const userService = new UserService();
    const user = await userService.getUser(req.params.uuid);
    res.send(user);
  } catch (e: any) {
    const err: ApiError = new Error();
    err.statusCode = 400;
    err.message = e.message;
    next(err);
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const userService = new UserService();
    const jwt = await userService.loginUser(req.body);
    res.send(jwt);
  } catch (e) {
    res.status(500);
    res.send({ e });
  }
};

export {
  createUser,
  updateUser,
  loginUser,
  activeUser,
  deactiveUser,
  deleteUser,
  listUsers,
  getUser,
};
