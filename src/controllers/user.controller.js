import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendMail } from "../utils/email.js";
import { User } from "../models/user.model.js";

const registerUser = asyncHandler( async ( req, res ) => {
    const { username , email , password , role } = req.body || {};

    if ( !username || !email || !password ) {
        throw new ApiError(400,"All fields are requried.")
    };

    const userExist = await User.findOne({
        $or: [{username},{email}]
    });

    if ( userExist ) {
        throw new ApiError(400,"User Already exist.");
    };

    const user = await User.create({
        username,
        email,
        password,
        isEmailVerified: false
    });

    const { unHashedToken , hashedToken, tokenExpiry } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({validateBeforeSave: false});

    await sendMail({
        email: user.email,
        sunject: "Please verify your email.",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        )
    });

    const rigesterUser = await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry");

    if ( !rigesterUser ) {
        throw new ApiError(500,"something is wrong when creating a user.")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            { user: registerUser },
            "user register successfully."
        )
    );
});

