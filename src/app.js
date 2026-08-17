import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from './utils/ApiError.js';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173"];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
import userRouter from './routes/user.route.js';
import healthCheckRouter from './routes/healthcheck.route.js';
import projectRouter from './routes/project.route.js';

app.use("/api/v1/auth", userRouter);
app.use("/api/v1/health", healthCheckRouter);
app.use("/api/v1/projects", projectRouter);

app.get("/", (req, res) => {
    res.json({ message: "Task Manager API is running." });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    let errors = err.error || [];

    // Mongoose validation error
    if (err.name === "ValidationError") {
        statusCode = 422;
        message = "Validation failed.";
        errors = Object.values(err.errors).map((e) => ({ [e.path]: e.message }));
    }

    // Mongoose CastError (invalid ObjectId)
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // MongoDB duplicate key
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `Duplicate value for ${field}.`;
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token.";
    }
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired.";
    }

    const isDev = process.env.NODE_ENV !== "production";

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors,
        ...(isDev && err.stack ? { stack: err.stack } : {}),
    });
});

export default app;