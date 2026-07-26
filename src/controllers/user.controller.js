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

    
})