import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    emailVerificationMailgenContent,
    forgotPasswordMailgenContent,
    sendMail,
} from "../utils/email.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Cookie options depend on environment so HTTPS isn't forced during local dev
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
};

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, error.message || "Error generating tokens.");
    }
};

// ─── Register ───────────────────────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, fullName } = req.body;

    const userExist = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
    });

    if (userExist) {
        throw new ApiError(409, "Username or email already exists.");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        fullName: fullName || "",
    });

    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    sendMail({
        email: user.email,
        subject: "Please verify your email.",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`
        ),
    }).catch((err) => console.error("Verification email failed:", err.message));

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry"
    );

    return res.status(201).json(
        new ApiResponse(201, { user: createdUser }, "User registered successfully.")
    );
});

// ─── Login ───────────────────────────────────────────────────────────────────
const userLogin = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body || {};

    if (!password || (!username && !email)) {
        throw new ApiError(400, "Username or email and password are required.");
    }

    const query = [];
    if (email) query.push({ email: email.toLowerCase() });
    if (username) query.push({ username: username.toLowerCase() });

    const userExist = await User.findOne({ $or: query });

    if (!userExist) {
        throw new ApiError(401, "Invalid credentials.");
    }

    const isPassword = await userExist.isPasswordCorrect(password);
    if (!isPassword) {
        throw new ApiError(401, "Invalid credentials.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(userExist._id);

    const userLogged = await User.findById(userExist._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry"
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, { user: userLogged, accessToken }, "Logged in successfully.")
        );
});

// ─── Logout ──────────────────────────────────────────────────────────────────
const userLogout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { refreshToken: "" } },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully."));
});

// ─── Current User ─────────────────────────────────────────────────────────────
const getCurrentUser = asyncHandler((req, res) => {
    return res.status(200).json(
        new ApiResponse(200, { user: req.user }, "Current user fetched successfully.")
    );
});

// ─── Verify Email ─────────────────────────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params;

    if (!verificationToken) {
        throw new ApiError(400, "Email verification token missing.");
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, "Token is invalid or has expired.");
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, { isEmailVerified: true }, "Email verified successfully.")
    );
});

// ─── Resend Email Verification ────────────────────────────────────────────────
const resendEmailVerification = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    if (user.isEmailVerified) {
        throw new ApiError(409, "Email is already verified.");
    }

    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    sendMail({
        email: user.email,
        subject: "Please verify your email.",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`
        ),
    }).catch((err) => console.error("Resend verification email failed:", err.message));

    return res.status(200).json(
        new ApiResponse(200, {}, "Verification email sent.")
    );
});

// ─── Refresh Access Token ─────────────────────────────────────────────────────
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingToken) {
        throw new ApiError(401, "Unauthorized – no refresh token.");
    }

    try {
        const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);
        if (!user) throw new ApiError(401, "Invalid refresh token.");

        if (incomingToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token has expired or been revoked.");
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully."
                )
            );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(401, "Invalid refresh token.");
    }
});

// ─── Forgot Password ──────────────────────────────────────────────────────────
const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body || {};

    const user = await User.findOne({ email: email?.toLowerCase() });

    // Always return success to avoid leaking whether email exists
    if (!user) {
        return res.status(200).json(
            new ApiResponse(200, {}, "If this email exists, a password reset link has been sent.")
        );
    }

    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    const resetUrl = process.env.FORGOT_PASSWORD_REDIRECT_URL
        ? `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
        : `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password/${unHashedToken}`;

    await sendMail({
        email: user.email,
        subject: "Password reset request.",
        mailgenContent: forgotPasswordMailgenContent(user.username, resetUrl),
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "If this email exists, a password reset link has been sent.")
    );
});

// ─── Reset Forgot Password ────────────────────────────────────────────────────
const resetForgotPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body || {};

    if (!resetToken) {
        throw new ApiError(400, "Reset token is missing.");
    }

    // CRITICAL: hash the incoming raw token before querying the DB
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, "Reset token is invalid or has expired.");
    }

    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    user.refreshToken = "";      // revoke existing sessions
    user.password = newPassword; // Mongoose pre-save hook will hash it
    await user.save();           // allow validation so password hashing runs

    return res.status(200).json(
        new ApiResponse(200, {}, "Password reset successfully.")
    );
});

// ─── Change Password ──────────────────────────────────────────────────────────
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPassword = await user.isPasswordCorrect(oldPassword);
    if (!isPassword) {
        throw new ApiError(400, "Old password is incorrect.");
    }

    user.password = newPassword; // Mongoose pre-save hook will hash it
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully.")
    );
});

export {
    registerUser,
    userLogin,
    userLogout,
    getCurrentUser,
    verifyEmail,
    resendEmailVerification,
    refreshAccessToken,
    forgotPasswordRequest,
    changeCurrentPassword,
    resetForgotPassword,
};