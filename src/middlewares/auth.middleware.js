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
        const decodedToken = jwt.verify(incomingToken,process.env.ACCESS_TOKEN_SECRET);

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

export const validateProjectPermission = (roles = []) => {
  asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "project id is missing");
    }

    const project = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!project) {
      throw new ApiError(400, "project not found");
    }

    const givenRole = project?.role;

    req.user.role = givenRole;

    if (!roles.includes(givenRole)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  });
};

// export const validateProjectPermission = ()
