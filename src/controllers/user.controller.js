import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendMail } from "../utils/email.js";
import { User } from "../models/user.model.js";
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async ( userId ) => {

    try {
        const user = await User.findById(userId);
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,error.message || "somethoing is wrong when generateing token");
    }
}
const registerUser = asyncHandler( async ( req, res ) => {
    console.log("hello1");
    const { username , email , password } = req.body;

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
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password
    });
    console.log("hello2");
    
    const { unHashedToken , hashedToken, tokenExpiry } = user.generateTemporaryToken();
    
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    
    await user.save({validateBeforeSave: false});

    sendMail({
        email: user.email,
        subject: "Please verify your email.",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        )
    });

    const registerUsers = await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry");

    if ( !registerUsers ) {
        throw new ApiError(500,"something is wrong when creating a user.")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            { user: registerUsers },
            "user register successfully."
        )
    );
});

const userLogin = asyncHandler( async ( req, res ) => {

    const { username , email , password } = req.body || {};

    const userExist = await User.findOne({
        $or: [{username},{email}]
    });

    if ( !userExist ) {
        throw new ApiError(400,"user does not exist.");
    }

    const isPassword = await userExist.isPasswordCorrect(password);

    if ( !isPassword ) {
        throw new ApiError(400,"invalid password");
    }

    const { accessToken , refreshToken } = await generateAccessAndRefreshToken(userExist._id);

    const options = {
        httpOnly: true,
        secure: true
    };

    const userLogged = await User.findById(userExist._id).select(
        " -password -refreshToken -emailVerificationToken -emailVerificationExpiry"
    )
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            { user: userLogged, accessToken, refreshToken},
            "user successfully login."
        )
    )

});


const userLogout = asyncHandler( async ( req , res ) => {
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("resfreshToken",options)
    .json(
        new ApiResponse(
            200,
            {},
            "User logout successfully."
        )
    )
});

const getCurrentUser = asyncHandler ( ( req , res ) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {user: req.user},
            "current user fetch successfully."
        )
    )
});

const verifyEmail = asyncHandler ( async ( req, res ) => {
    const { verificationToken } = req.params;

    if ( !verificationToken ) {
        throw new ApiError(400,"Email verification token missing.");
    }

    let hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: {$gt: Date.now()}
    });

    if ( !user ) {
        throw new ApiError(400,"Token is invalid or expiry.");
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;

    user.isEmailVerified = true;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                isEmailVerified: true
            },
            "Email verification successfully."
        )
    )
});

const resendEmailVerification = asyncHandler ( async ( req, res ) => {
    const user = await User.findById(req.user?._id);

    if ( !user ) {
        throw new ApiError(404,"User does not exist.");
    }

    if ( user.isEmailVerified ) {
        throw new ApiError(409,"Email is already verified.");
    }

    const { unHashedToken , hashedToken , tokenExpiry } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({validateBeforeSave: false});

    await sendMail({
        email: user?.email,
        subject: "Please verify your email.",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        )
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Mail has been send to your email id."
        )
    );
});

const refreshAccessToken = asyncHandler ( async ( res , req ) => {
    const incomingToken = req.cookies.refreshToken || req.body.refreshToken;

    if ( !incomingToken ) {
        throw new ApiError(401,"Unauthorized access.");
    }

    try {
        
        const decodedToken = jwt.verify(incomingToken,process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if ( !user ) {
            throw new ApiError(401,"invalid refresh token.");
        }

        if ( incomingToken !== user?.refreshToken ) {
            throw new ApiError(401,"Refresh Token in expired");
        }

        const { accessToken , newRefreshToken } = await generateAccessAndRefreshToken(user?._id);

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                { accessToken , refreshToken: newRefreshToken},
                "refresh access token successfully."
            )
        )
    } catch (error) {
        throw new ApiError(401,"invalid refresh token.");
    }

});

const forgotPasswordRequest = asyncHandler ( async ( req, res ) => {
    const { email } = req.body || {};

    const user = await User.findOne({email});

    if ( !user ) {
        throw new ApiError(404,"user does not exist.",[]);
    }

    const { unHashedToken , hashedToken , tokenExpiry } = await user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;

    await user.save({validateBeforeSave: false});

    await sendMail({
        email: user.email,
        subject: "password reset request.",
        mailgenContent: forgotPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
        )
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "password reset mail has been send on your mail id"
        )
    )
});

const resetForgotPassword = asyncHandler ( async (req , res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body || {};

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const user = await User.findOne({
        forgotPasswordToken: resetToken,
        forgotPasswordExpiry: { $gt: Date.now()},
    });

    if ( !user ) {
        throw new ApiError(489,"token is invalid ans expiry.");
    }

    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    user.password = newPassword;

    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Passwor reset successfully."
        )
    )
});

const changeCurrentPassword = asyncHandler ( async ( req , res ) => {
    const { oldPassword , newPassword } = req.body || {};

    const user = await User.findById(req.user?._id);

    const isPassword = await user.isPasswordCorrect(oldPassword);

    if ( !isPassword ) {
        throw new ApiError(400,"invalid old password.");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        200,
        {},
        "user password has been change successfully."
    )
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
    resetForgotPassword
};