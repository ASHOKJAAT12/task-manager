import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Project } from '../models/project.model.js';
import { ProjectMember } from '../models/projectmember.model.js';
import mongoose from mongoose;
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

const getProjects = asyncHandler(async (req, res) => {
    const projects = await ProjectMember.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "projects",
                localField: "projects",
                foreignField: "_id",
                as: "projects",
                pipeline: [
                    {

                        $lookup: {
                            from: "projectmebers",
                            localField: "_id",
                            foreignField: "projects",
                            as: "projectmembers",
                        }
                    },
                    {
                        $addFields: {
                            members: {
                                $size: "$projectmembers",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$project",
        },
        {
            $project: {
                project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    member: 1,
                    createAt: 1,
                    vreateBy: 1,
                },
                role: 1,
                _id: 0,
            },
        },
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, projects , "projects fetched successfully."
        )
    );
});


const getProjectById = asyncHandler(async (req, res) => { });
const getProjectMember = asyncHandler(async (req, res) => { });
const createProject = asyncHandler(async (req, res) => { });
const updateProject = asyncHandler(async (req, res) => { });
const deleteProject = asyncHandler(async (req, res) => { });
const addMemberToProject = asyncHandler(async (req, res) => { });
const deleteMember = asyncHandler(async (req, res) => { });
const updateMemberRole = asyncHandler(async (req, res) => { });


export {
    getProjects,
    getProjectById,
    getProjectMember,
    createProject,
    updateProject,
    deleteProject,
    addMemberToProject,
    deleteMember,
    updateMemberRole
};