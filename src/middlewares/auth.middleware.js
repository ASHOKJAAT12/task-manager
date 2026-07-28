import { User } from "../models/user.model.js";
// import { ProjectMember } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';

export const verifyJWT = asyncHandler ( async ( req, res, next ) => {
    const incomingToken = req.cookies?.accessToken || req.header("authorization").replace("Bearer","");

    if ( !incomingToken ) {
        throw new ApiError(400,"unauthorized access");
    }

    try {
        const decodeToken = jwt.verify(incomingToken,process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if ( !user ) {
            throw new ApiError(401,"invalid access token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,"invalid access token");        
    }
});


// export const validateProjectPermission = ()
