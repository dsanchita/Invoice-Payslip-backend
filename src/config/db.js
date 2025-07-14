import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        return conn;
    } catch (error) {
        console.log(`Error Connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }   
}

export default connectDB;