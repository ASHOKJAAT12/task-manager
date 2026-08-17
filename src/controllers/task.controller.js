import { User } from "../models/user.model.js";
import { Task } from "../models/task.model.js";
import { Project } from "../models/project.model.js";
import { Subtask } from "../models/subtask.model.js";
import { ProjectMember } from "../models/projectmember.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { AvailableTaskStatuses, TaskStatusEnum } from "../utils/constants.js";

// ════════════════════════════════════════════════════════
//  TASKS
// ════════════════════════════════════════════════════════

// ─── Create Task ──────────────────────────────────────────────────────────────
const createTask = asyncHandler(async (req, res) => {
    const { title, description, assignedTo, status } = req.body;
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    // Validate assignedTo is a real member of this project (if provided)
    if (assignedTo) {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
            throw new ApiError(400, "Invalid assignedTo user ID.");
        }
        const isMember = await ProjectMember.findOne({
            project: projectId,
            user: assignedTo,
        });
        if (!isMember) {
            throw new ApiError(400, "Assigned user is not a member of this project.");
        }
    }

    // Validate status if provided
    if (status && !AvailableTaskStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Valid values: ${AvailableTaskStatuses.join(", ")}`);
    }

    const task = await Task.create({
        title,
        description,
        project: new mongoose.Types.ObjectId(projectId),
        assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
        assignedBy: new mongoose.Types.ObjectId(req.user._id),
        status: status || TaskStatusEnum.TODO,
        attachments: [],
    });

    return res.status(201).json(
        new ApiResponse(201, task, "Task created successfully.")
    );
});

// ─── Get All Tasks for a Project ──────────────────────────────────────────────
const getTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { status, assignedTo, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    const filter = { project: new mongoose.Types.ObjectId(projectId) };
    if (status) {
        if (!AvailableTaskStatuses.includes(status)) {
            throw new ApiError(400, `Invalid status filter. Valid values: ${AvailableTaskStatuses.join(", ")}`);
        }
        filter.status = status;
    }
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
        filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
        .populate("assignedTo", "avatar username fullName")
        .populate("assignedBy", "avatar username fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    return res.status(200).json(
        new ApiResponse(200, { tasks, total, page: Number(page), limit: Number(limit) }, "Tasks fetched successfully.")
    );
});

// ─── Get Task By ID ───────────────────────────────────────────────────────────
const getTaskById = asyncHandler(async (req, res) => {
    const { taskId, projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, "Invalid task ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    const task = await Task.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
                project: new mongoose.Types.ObjectId(projectId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedTo",
                pipeline: [
                    {
                        $project: { _id: 1, username: 1, fullName: 1, avatar: 1 },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedBy",
                foreignField: "_id",
                as: "assignedBy",
                pipeline: [
                    {
                        $project: { _id: 1, username: 1, fullName: 1, avatar: 1 },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "subtasks",
                localField: "_id",
                foreignField: "task",
                as: "subtasks",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "createdBy",
                            foreignField: "_id",
                            as: "createdBy",
                            pipeline: [
                                {
                                    $project: { _id: 1, username: 1, fullName: 1, avatar: 1 },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            createdBy: { $arrayElemAt: ["$createdBy", 0] },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                assignedTo: { $arrayElemAt: ["$assignedTo", 0] },
                assignedBy: { $arrayElemAt: ["$assignedBy", 0] },
            },
        },
    ]);

    if (!task || task.length === 0) {
        throw new ApiError(404, "Task not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, task[0], "Task fetched successfully.")
    );
});

// ─── Update Task ──────────────────────────────────────────────────────────────
const updateTask = asyncHandler(async (req, res) => {
    const { taskId, projectId } = req.params;
    const { title, description, assignedTo, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid task ID or project ID.");
    }

    const task = await Task.findOne({
        _id: taskId,
        project: projectId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found.");
    }

    // Validate assignedTo is a project member
    if (assignedTo !== undefined) {
        if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
            throw new ApiError(400, "Invalid assignedTo user ID.");
        }
        if (assignedTo) {
            const isMember = await ProjectMember.findOne({
                project: projectId,
                user: assignedTo,
            });
            if (!isMember) {
                throw new ApiError(400, "Assigned user is not a member of this project.");
            }
        }
    }

    if (status && !AvailableTaskStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Valid values: ${AvailableTaskStatuses.join(", ")}`);
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo || null;
    if (status !== undefined) updateFields.status = status;

    const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        { $set: updateFields },
        { new: true, runValidators: true }
    )
        .populate("assignedTo", "username fullName avatar")
        .populate("assignedBy", "username fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, updatedTask, "Task updated successfully.")
    );
});

// ─── Delete Task ──────────────────────────────────────────────────────────────
const deleteTask = asyncHandler(async (req, res) => {
    const { taskId, projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid task ID or project ID.");
    }

    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
        throw new ApiError(404, "Task not found.");
    }

    // Cascade: delete related subtasks first
    await Subtask.deleteMany({ task: taskId });
    await Task.findByIdAndDelete(taskId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Task deleted successfully.")
    );
});

// ════════════════════════════════════════════════════════
//  SUBTASKS
// ════════════════════════════════════════════════════════

// ─── Create Subtask ───────────────────────────────────────────────────────────
const createSubTask = asyncHandler(async (req, res) => {
    const { taskId, projectId } = req.params;
    const { title } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid task ID or project ID.");
    }

    if (!title || !title.trim()) {
        throw new ApiError(400, "Subtask title is required.");
    }

    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
        throw new ApiError(404, "Task not found.");
    }

    const subtask = await Subtask.create({
        title: title.trim(),
        task: new mongoose.Types.ObjectId(taskId),
        createdBy: new mongoose.Types.ObjectId(req.user._id),
        isCompleted: false,
    });

    return res.status(201).json(
        new ApiResponse(201, subtask, "Subtask created successfully.")
    );
});

// ─── Update Subtask ───────────────────────────────────────────────────────────
const updateSubTask = asyncHandler(async (req, res) => {
    const { taskId, projectId, subtaskId } = req.params;
    const { title, isCompleted } = req.body;

    if (
        !mongoose.Types.ObjectId.isValid(taskId) ||
        !mongoose.Types.ObjectId.isValid(projectId) ||
        !mongoose.Types.ObjectId.isValid(subtaskId)
    ) {
        throw new ApiError(400, "Invalid ID(s).");
    }

    // Verify task belongs to project
    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
        throw new ApiError(404, "Task not found.");
    }

    const subtask = await Subtask.findOne({ _id: subtaskId, task: taskId });
    if (!subtask) {
        throw new ApiError(404, "Subtask not found.");
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (isCompleted !== undefined) updateFields.isCompleted = Boolean(isCompleted);

    const updated = await Subtask.findByIdAndUpdate(
        subtaskId,
        { $set: updateFields },
        { new: true, runValidators: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updated, "Subtask updated successfully.")
    );
});

// ─── Delete Subtask ───────────────────────────────────────────────────────────
const deleteSubTask = asyncHandler(async (req, res) => {
    const { taskId, projectId, subtaskId } = req.params;

    if (
        !mongoose.Types.ObjectId.isValid(taskId) ||
        !mongoose.Types.ObjectId.isValid(projectId) ||
        !mongoose.Types.ObjectId.isValid(subtaskId)
    ) {
        throw new ApiError(400, "Invalid ID(s).");
    }

    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
        throw new ApiError(404, "Task not found.");
    }

    const subtask = await Subtask.findOneAndDelete({ _id: subtaskId, task: taskId });
    if (!subtask) {
        throw new ApiError(404, "Subtask not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Subtask deleted successfully.")
    );
});

export {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask,
};