import { User } from "../models/user.model.js";
import { ProjectMember } from "../models/projectmember.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const incomingToken =
    req.cookies?.accessToken ||
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null);

  if (!incomingToken) {
    throw new ApiError(401, "Unauthorized access – no token provided.");
  }

  try {
    const decodedToken = jwt.verify(incomingToken, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token – user not found.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid or expired access token.");
  }
});

export const validateProjectPermission = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "Project ID is missing.");
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(400, "Invalid project ID.");
    }

    const membership = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!membership) {
      throw new ApiError(403, "You are not a member of this project.");
    }

    const userRole = membership.role;
    req.user.projectRole = userRole;

    if (roles.length > 0 && !roles.includes(userRole)) {
      throw new ApiError(403, "You do not have permission to perform this action.");
    }

    next();
  });
};
