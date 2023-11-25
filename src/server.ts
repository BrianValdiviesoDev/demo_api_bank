import express from "express";
import "dotenv/config";
import expressConfig from "./framework/express";
import userRouter from "./users/user.routes";
import { MongoService } from "./framework/mongodb";
import errorHandlingMiddlware from "./framework/error-handling";

const PORT = process.env.PORT || 3001;
const app = express();
expressConfig(app);

app.use(express.json());

const mongo = new MongoService({});
mongo.connect();

app.use("/users", userRouter);
app.use(errorHandlingMiddlware);

const server = app.listen(PORT, () => console.log(`Listen on port: ${PORT}`));
export { app, server, mongo };
