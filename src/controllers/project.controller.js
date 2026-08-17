import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Project } from '../models/project.model.js';
import { ProjectMember } from '../models/projectmember.model.js';
import { Task } from '../models/task.model.js';
import { Subtask } from '../models/subtask.model.js';
import { ProjectNote } from '../models/note.model.js';
import mongoose from 'mongoose';
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

// ─── Get all projects where the current user is a member ─────────────────────
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
                localField: "project",          // correct field: "project" not "projects"
                foreignField: "_id",
                as: "projectDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "projectmembers",  // correct collection name
                            localField: "_id",
                            foreignField: "project",
                            as: "memberList",
                        },
                    },
                    {
                        $addFields: {
                            memberCount: { $size: "$memberList" },
                        },
                    },
                    {
                        $project: {
                            memberList: 0,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$projectDetails",
        },
        {
            $project: {
                _id: 0,
                role: 1,
                project: "$projectDetails",
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, projects, "Projects fetched successfully.")
    );
});

// ─── Get project by ID ────────────────────────────────────────────────────────
const getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    const project = await Project.findById(projectId).populate("createdBy", "username fullName avatar");

    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, project, "Project fetched successfully.")
    );
});

// ─── Get project members ──────────────────────────────────────────────────────
const getProjectMembers = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found.");
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
                            email: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                user: { $arrayElemAt: ["$user", 0] },
            },
        },
        {
            $project: {
                project: 1,
                user: 1,
                role: 1,
                createdAt: 1,
                updatedAt: 1,
                _id: 1,
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, projectMembers, "Project members fetched successfully.")
    );
});

// ─── Create project ───────────────────────────────────────────────────────────
const createProject = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const project = await Project.create({
        name,
        description,
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    });

    // Creator automatically becomes ADMIN member
    await ProjectMember.create({
        user: new mongoose.Types.ObjectId(req.user._id),
        project: new mongoose.Types.ObjectId(project._id),
        role: UserRolesEnum.ADMIN,
    });

    return res.status(201).json(
        new ApiResponse(201, project, "Project created successfully.")
    );
});

// ─── Update project ───────────────────────────────────────────────────────────
const updateProject = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { projectId } = req.params;

    const project = await Project.findByIdAndUpdate(
        projectId,
        { $set: { name, description } },
        { new: true, runValidators: true }
    );

    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, project, "Project updated successfully.")
    );
});

// ─── Delete project ───────────────────────────────────────────────────────────
const deleteProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    // Cascade cleanup: tasks, subtasks, members, notes
    const tasks = await Task.find({ project: projectId });
    const taskIds = tasks.map((t) => t._id);

    await Subtask.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ project: projectId });
    await ProjectMember.deleteMany({ project: projectId });
    await ProjectNote.deleteMany({ project: projectId });
    await Project.findByIdAndDelete(projectId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Project and all related data deleted successfully.")
    );
});

// ─── Add member to project ────────────────────────────────────────────────────
const addMemberToProject = asyncHandler(async (req, res) => {
    const { email, role } = req.body;
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    // Find user by email (email was provided, not user object)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        throw new ApiError(404, "User with this email does not exist.");
    }

    // Prevent duplicate membership (compound unique index also prevents this at DB level)
    const existingMembership = await ProjectMember.findOne({
        user: user._id,
        project: projectId,
    });
    if (existingMembership) {
        throw new ApiError(409, "User is already a member of this project.");
    }

    if (!AvailableUserRole.includes(role)) {
        throw new ApiError(400, "Invalid role.");
    }

    const membership = await ProjectMember.create({
        user: user._id,
        project: projectId,
        role,
    });

    const populatedMembership = await ProjectMember.findById(membership._id)
        .populate("user", "username fullName avatar email");

    return res.status(201).json(
        new ApiResponse(201, populatedMembership, "Member added to project successfully.")
    );
});

// ─── Delete member ────────────────────────────────────────────────────────────
const deleteMember = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid project ID or user ID.");
    }

    const projectMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId),
    });

    if (!projectMember) {
        throw new ApiError(404, "Project member not found.");
    }

    // Prevent removing yourself if you are the only admin
    const adminCount = await ProjectMember.countDocuments({
        project: projectId,
        role: UserRolesEnum.ADMIN,
    });

    if (projectMember.role === UserRolesEnum.ADMIN && adminCount <= 1) {
        throw new ApiError(
            400,
            "Cannot remove the only admin. Assign another admin first."
        );
    }

    await ProjectMember.findByIdAndDelete(projectMember._id);

    return res.status(200).json(
        new ApiResponse(200, {}, "Member removed from project successfully.")
    );
});

// ─── Update member role ───────────────────────────────────────────────────────
const updateMemberRole = asyncHandler(async (req, res) => {
    const { newRole } = req.body;
    const { userId, projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid project ID or user ID.");
    }

    if (!AvailableUserRole.includes(newRole)) {
        throw new ApiError(400, "Invalid role.");
    }

    const projectMember = await ProjectMember.findOne({
        user: new mongoose.Types.ObjectId(userId),
        project: new mongoose.Types.ObjectId(projectId),
    });

    if (!projectMember) {
        throw new ApiError(404, "Project member not found.");
    }

    // Guard: prevent demoting the last admin
    if (projectMember.role === UserRolesEnum.ADMIN && newRole !== UserRolesEnum.ADMIN) {
        const adminCount = await ProjectMember.countDocuments({
            project: projectId,
            role: UserRolesEnum.ADMIN,
        });
        if (adminCount <= 1) {
            throw new ApiError(400, "Cannot demote the only admin. Assign another admin first.");
        }
    }

    // FIX: was findByIdAndUpdate(projectId, ...) — must use projectMember._id
    const updated = await ProjectMember.findByIdAndUpdate(
        projectMember._id,
        { $set: { role: newRole } },
        { new: true }
    ).populate("user", "username fullName avatar email");

    return res.status(200).json(
        new ApiResponse(200, updated, "Member role updated successfully.")
    );
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
    updateMemberRole,
};