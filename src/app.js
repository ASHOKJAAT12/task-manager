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

export default app;