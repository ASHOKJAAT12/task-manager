import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const response = await mongoose.connect(`${process.env.MONGODB_URI}`);
        console.log("Mongodb connection successfull.");
        return response;
    } catch (error) {
        console.log("Mongodb connectin faild.");
        process.exit(1);
    }
}

export default connectDB;