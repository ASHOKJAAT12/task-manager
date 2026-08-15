import { User } from "../models/user.model.js";
import { Task } from "../models/task.model.js";
import { Project } from "../models/project.model.js";
import { Subtask } from "../models/subtask.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from mongoose;
import { AvailableUserRole,UserRolseEnum } from "../utils/constants.js";
import { pipeline } from "nodemailer/lib/xoauth2/index.js";

const createSubTask = asyncHandler ( async ( req, res) => {});
const deleteSubTask = asyncHandler ( async( req, res ) => {});
const updateSubTask = asyncHandler ( async (req, res ) =>{});
const createTask = asyncHandler ( async ( req, res ) => {
    const { title,description,assignedTo,status } = req.body;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if ( !project ) {
        throw new ApiError(404,"Project not found.");
    }

    const files = req.files || [];
    const attachments = files.map((files)=>{
        return {
            url: `${process.env.SERVEr_URL}/images/${files.originalname}`,
            mimetype: files.mimetype,
            size: files.size
        };
    });

    const task = await Task.create({
        title,
        description,
        project: new mongoose.Types.ObjectId(projectId),
        assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo):undefined,
        assignedBy: new mongoose.Types.ObjectId(req.user._id),
        attachments,
        status
    });

    return res
    .status(201)
    .json(
        new ApiResponse(201,task,"Task create successfully.")
    );
});
const deleteTask = asyncHandler ( async ( req, res ) => {});
const updateTask = asyncHandler ( async ( req, res ) => {});
const getTaskById = asyncHandler ( async ( req , res ) => {
    const { taskId } = req.params;

    const task = await Task.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
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
                        _id: 1,
                        username: 1,
                        fullName: 1,
                        avatar: 1,
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
                            ceratedBy: {
                                $arrayElemAt: ["$createdBy",0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                assignedTo: {
                    $arrayElemAt: ["$assignedTo",0],
                },
            },
        },
    ]);

    if ( !task || task.length === 0 ){
        throw new ApiError(404,"Task not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,task[0],"Task fetched successfully.")
    );
});
const getTasks = asyncHandler ( async ( req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if ( !project ) {
        throw new ApiError(404,"Project not found");
    }

    const tasks = await Task.find({
        project: new mongoose.Types.ObjectId(projectId)
    }).populate("assignedTo","avatar username fullName.");

    return res
    .status(200)
    .json(
        new ApiResponse(200,tasks,"task fetched successfully.")
    );
});

export {
    createSubTask,
    updateSubTask,
    deleteSubTask,
    createTask,
    deleteTask,
    updateTask,
    getTaskById,
    getTasks
}