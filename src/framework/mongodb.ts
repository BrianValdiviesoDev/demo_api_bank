import "dotenv/config";
import mongoose from "mongoose";

export interface MongoParameters {
  host?: string;
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  uri?: string;
}

export class MongoService {
  private uri: string;

  constructor(private parameters: MongoParameters) {
    this.parameters.host =
      this.parameters.host || process.env.DB_HOST || "localhost";

    this.parameters.port =
      this.parameters.port || process.env.DB_PORT || "27017";

    this.parameters.database =
      this.parameters.database || process.env.DB_DATABASE || "admin";

    this.parameters.user = this.parameters.user || process.env.DB_USER;
    this.parameters.password =
      this.parameters.password || process.env.DB_PASSWORD;

    let generatedUri = `mongodb://${this.parameters.host}:${this.parameters.port}/${this.parameters.database}`;

    if (this.parameters.user && this.parameters.password) {
      generatedUri = `mongodb://${this.parameters.user}:${this.parameters.password}@${this.parameters.host}:${this.parameters.port}/${this.parameters.database}`;
    }

    this.uri = this.parameters.uri || process.env.DB_URI || generatedUri;
  }

  connect() {
    mongoose.set("debug", true);
    mongoose
      .connect(this.uri)
      .then(
        () => {},
        (err) => {
          throw new Error(`Error connecting with mongo: ${err}`);
        }
      )
      .catch((err) => {
        throw new Error(`Error connecting with mongo: ${err}`);
      });

    mongoose.connection.on("error", (error) => {
      mongoose.disconnect();
      throw new Error(`Error in MongoDb connection: ${error}`);
    });
  }

  close = () => {
    mongoose.disconnect();
  };
}
