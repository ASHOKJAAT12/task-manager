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


const getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if ( ! project ) {
        throw new ApiError(404,"Project not found.");
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200,project,"Project fetched successfully.")
    );
 });

const getProjectMembers = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if ( !project ) {
        throw new ApiError(404,"Project not found.")
    }

    const projectMembers = await ProjectMember.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                user: {
                    $arrayElemAt: ["$user",0],
                },
            },
        },
        {
            $project: {
                project: 1,
                user: 1,
                role: 1,
                createAt: 1,
                updateAt: 1,
                _id: 0,
            },
        },
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            projectMembers,
            "Project member fetched successfully."
        )
    );
 });

const createProject = asyncHandler(async (req, res) => { 
    const { name , description } = req.body;

    const project = await Project.create({
        name,
        description,
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    });

    await ProjectMember.create({
        user: new mongoose.Types.ObjectId(req.user._id),
        project: new mongoose.Types.ObjectId(project._id),
        role: UserRolesEnum.ADMIN,
    });

    return res
    .status(201)
    .json(
        new ApiResponse(201,project,"Project created successfully.")
    )
});
const updateProject = asyncHandler(async (req, res) => { 
    const { name , description } = req.body;
    const { projectId } = req.params;

    const project = await Project.findByIdAndUpdate(
        projectId,
        {
            name,
            description,
        },
        {
            new: true
        },
    );

    if ( !project ) {
        throw new ApiError(404,"project not found.");
    }

    return res 
    .status(200)
    .json(
        new ApiResponse(200,project,"Project updated successfully.")
    );

});
const deleteProject = asyncHandler(async (req, res) => { 
    const { projectId } = req.params;

    const project = await Project.findByIdAndDelete(projectId);

    if ( !project ) {
        throw new ApiError(404,"Project not found.");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,project,"Project deleted successfully.")
    );
});

const addMemberToProject = asyncHandler(async (req, res) => { 
    const { email , role } = req.body;
    const { projectId } = req.params;

    await ProjectMember.findByIdAndUpdate(
        {
            user: new mongoose.Types.ObjectId(user._id),
            project: new mongoose.Types.ObjectId(projectId)
        },
        {
            user: new mongoose.Types.ObjectId(user._id),
            project: new mongoose.Types.ObjectId(projectId),
            role: role,
        },
        {
            new: true,
            upsert: true,
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Project member added successfully.")
    );
});
const deleteMember = asyncHandler(async (req, res) => { 
    const { projectId , userId } = req.params;

    let projectMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId),
    });

    if ( !projectMember ) {
        throw new ApiError(400,"Project member not found.");
    }

    projectMember = await ProjectMember.findByIdAndDelete(projectMember._id);

    if ( !projectMember ) {
        throw new ApiError(400,"Project member not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,projectMember,"Project member delete successfully.")
    );
});


const updateMemberRole = asyncHandler(async (req, res) => { 
    const {  newRole } = req.body;
    const { userId, projectId } = req.params;

    if ( !AvailableUserRole.includes(newRole) ) {
        throw new ApiError(400,"Invalid Role.");
    }

    const projectMember = await ProjectMember.findOne({
        user: new mongoose.Types.ObjectId(userId),
        project: new mongoose.Types.ObjectId(projectId)
    });

    if ( !projectMember ) {
        throw new ApiError(400,"Projet member not found.");
    }

    projectMember = await ProjectMember.findByIdAndUpdate(
        projectId,
        {
            role: newRole,
        },
        {
            new: true
        }
    );

    if ( !projectMember ) {
        throw new ApiError(400,"Project member not found.");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,projectMember,"Project member role update successfully.")
    )

});


export {
    getProjects,
    getProjectById,
    getProjectMembers,
    createProject,
    updateProject,
    deleteProject,
    addMemberToProject,
    deleteMember,
    updateMemberRole
};