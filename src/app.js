import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cookieParser());
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://locahost:5173",
    credentials: true
}))
app.use(express.static("public"));
app.use(express.json({
    limit: "1mb",
}));
app.use(express.urlencoded({
    limit: "1mb",
    extended: true
}));


//router 
import  userRouter from './routes/user.route.js';
import healthCheckRouter from './routes/healthcheck.route.js';
import projectRouter from './routes/project.route.js';

app.use("/api/v1/auth",userRouter);
app.use("/api/v1/health",healthCheckRouter);
app.use("/api/v1/projects",projectRouter);
app.get("/",(req, res)=> {
    res.send("welcome to task manager")
});



// app.use((err, req, res, next) => {
//     const statusCode = err.statusCode || 500;
//     const message = err.message || "Internal server error";
//     const errors = err.error || [];

//     return res.status(statusCode).json({
//         success: false,
//         message,
//         errors
//     });
// });

export default app;