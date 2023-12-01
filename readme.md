## Setup

### Quick start

Before all, you need to have ready your database.

Install dependencies

```
npm run install
```

### Environment variables

Now you need to create a .env file and set up this variables.

- _PORT_ : NodeJs port to listen.
- _DB_HOST_ : URL to connecto to database host.
- _DB_PORT_ : Database port.
- _DB_DATABASE_ : Database name.
- _DB_USER_ : Database user with right permissions.
- _DB_PASSWORD_ : Database user password.
- _JWT_SECRET_ : JWT secret for encrypt

### Run server

If you are in development mode:

```
npm run dev
```

## Tests

Run once of the following commands for make tests.

Run all tests

```
npm run test
```

Run test with coverage

```
npm run test:cov
```

Run test in watch mode

```
npm run test:watch
```
