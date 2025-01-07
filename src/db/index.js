import mongoose from "mongoose";

//import { db_name } from "../constants.js";

const connectDB = (async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}`);
        console.log(`\n mongooDB connected !!`);

    } catch (error) {
        console.error("connection failed :", error);
        process.exit(1);

    }
})

export default connectDB;