import express from 'express';
import 'dotenv/config';
import expressConfig from './framework/express';
import userRouter from './users/user.routes';
import errorHandlingMiddlware from './framework/error-handling';

const app = express();
expressConfig(app);

app.use(express.json());
app.use('/users', userRouter);
app.use(errorHandlingMiddlware);

export { app };
