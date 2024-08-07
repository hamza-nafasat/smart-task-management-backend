import { app } from "./app.js";
import connectDb from "./config/connectDb.js";
import getenv from "./config/dotenv.js";
import { configureCloudinary } from "./utils/cloudinary.js";

const port = getenv("PORT");
(async () => {
  await configureCloudinary();
  await connectDb(getenv("MONGO_URI"), getenv("DB_NAME"));
  app.listen(port, () => console.log(`Server on port ${port}`));
})();
