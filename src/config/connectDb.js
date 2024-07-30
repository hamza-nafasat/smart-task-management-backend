import mongoose from "mongoose";

const connectDb = async (monoUrl, dbName) => {
    try {
        const connection = await mongoose.connect(monoUrl, { dbName });
        const { port, name } = connection.connection;
        console.log(`MongoDB connected at ${port}/${name}`);
    } catch (err) {
        console.log("Mongo connection error", err);
        process.exit(1);
    }
};
export default connectDb;
