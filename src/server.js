import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

// dotenv MUST be configured before importing app (which imports modules
// that read from process.env at module-load time, e.g. email.js, models)
import app from './app.js';
import connectDB from './db/index.js';

const PORT = process.env.PORT || 4000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on PORT ${PORT} [${process.env.NODE_ENV || "development"}]`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });