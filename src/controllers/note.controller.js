import { ProjectNote } from "../models/note.model.js";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectmember.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ─── Create Note ──────────────────────────────────────────────────────────────
const createNote = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "Note content is required.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    const note = await ProjectNote.create({
        project: new mongoose.Types.ObjectId(projectId),
        createdBy: new mongoose.Types.ObjectId(req.user._id),
        content: content.trim(),
    });

    return res.status(201).json(
        new ApiResponse(201, note, "Note created successfully.")
    );
});

// ─── Get all notes for a project ─────────────────────────────────────────────
const getNotes = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID.");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found.");
    }

    const notes = await ProjectNote.find({ project: projectId })
        .populate("createdBy", "username fullName avatar")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, notes, "Notes fetched successfully.")
    );
});

// ─── Get note by ID ───────────────────────────────────────────────────────────
const getNoteById = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(noteId) || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid ID(s).");
    }

    const note = await ProjectNote.findOne({ _id: noteId, project: projectId })
        .populate("createdBy", "username fullName avatar");

    if (!note) {
        throw new ApiError(404, "Note not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, note, "Note fetched successfully.")
    );
});

// ─── Update note ──────────────────────────────────────────────────────────────
const updateNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(noteId) || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid ID(s).");
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "Note content is required.");
    }

    const note = await ProjectNote.findOne({ _id: noteId, project: projectId });
    if (!note) {
        throw new ApiError(404, "Note not found.");
    }

    // Only the creator (or admins handled at route level) can update
    if (note.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only edit your own notes.");
    }

    note.content = content.trim();
    await note.save();

    return res.status(200).json(
        new ApiResponse(200, note, "Note updated successfully.")
    );
});

// ─── Delete note ──────────────────────────────────────────────────────────────
const deleteNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(noteId) || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid ID(s).");
    }

    const note = await ProjectNote.findOne({ _id: noteId, project: projectId });
    if (!note) {
        throw new ApiError(404, "Note not found.");
    }

    // Only the creator or project admin can delete
    const isCreator = note.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.projectRole === "admin";

    if (!isCreator && !isAdmin) {
        throw new ApiError(403, "You do not have permission to delete this note.");
    }

    await ProjectNote.findByIdAndDelete(noteId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Note deleted successfully.")
    );
});

export { createNote, getNotes, getNoteById, updateNote, deleteNote };
