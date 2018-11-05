// It is recommended to use the Container component in Node.js
import * as mongodb from "mongodb";

const mongoOptions: any = {
  db: process.env.MONGO_DATABASE || "dev",
  host: process.env.MONGO_HOST || "localhost",
  password: process.env.MONGO_PASSWORD || "password",
  poolSize: +(process.env.POOL_SIZE || 10),
  port: "" + (process.env.MONGO_PORT || 27017),
  // ssl: process.env.MONGO_USE_SSL || "false",
  user: process.env.MONGO_USER || "admin",
};

// Connection URL
const url = "mongodb://" +
  mongoOptions.user + ":" +
  mongoOptions.password + "@" +
  mongoOptions.host + ":" +
  mongoOptions.port;

// Create the db connection
let mongoClient: mongodb.MongoClient;
let db: mongodb.Db;
const connectStore = async () => {
  mongoClient = await mongodb.MongoClient.connect(url, {
    poolSize: mongoOptions.poolSize,
  }).then((client: mongodb.MongoClient) => {
    db = client.db(mongoOptions.db);
    return client;
  });
};

const closeStore = async () => {
  if (mongoClient) { await mongoClient.close(); }
};

const dbname: string = mongoOptions.db;

export { connectStore, closeStore, db, dbname, mongoClient };
