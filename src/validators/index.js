import { body, param } from "express-validator";
import { AvailableUserRole, AvailableTaskStatuses } from "../utils/constants.js";

const userRegisterValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty().withMessage("Email is required.")
            .isEmail().withMessage("Email is invalid.")
            .toLowerCase(),
        body("username")
            .trim()
            .notEmpty().withMessage("Username is required.")
            .isLowercase().withMessage("Username must be lowercase.")
            .isLength({ min: 3 }).withMessage("Username must be at least 3 characters long."),
        body("password")
            .notEmpty().withMessage("Password is required.")
            .isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
        body("fullName")
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage("Full name must be at most 50 characters."),
    ];
};

const userLoginValidator = () => {
    return [
        body("email")
            .optional()
            .isEmail().withMessage("Email is invalid."),
        body("username")
            .optional()
            .isString().withMessage("Username must be a string."),
        body("password")
            .notEmpty().withMessage("Password is required."),
    ];
};

const userChangeCurrentPasswordValidator = () => {
    return [
        body("oldPassword").notEmpty().withMessage("Old password is required."),
        body("newPassword")
            .notEmpty().withMessage("New password is required.")
            .isLength({ min: 6 }).withMessage("New password must be at least 6 characters."),
    ];
};

const userForgotPasswordValidator = () => {
    return [
        body("email")
            .notEmpty().withMessage("Email is required.")
            .isEmail().withMessage("Email is invalid."),
    ];
};

const userResetForgotPasswordValidator = () => {
    return [
        body("newPassword")
            .notEmpty().withMessage("New password is required.")
            .isLength({ min: 6 }).withMessage("New password must be at least 6 characters."),
    ];
};

const createProjectValidator = () => {
    return [
        body("name")
            .trim()
            .notEmpty().withMessage("Project name is required."),
        body("description")
            .optional()
            .trim(),
    ];
};

const addMemberToProjectValidator = () => {
    return [
        body("email")
            .notEmpty().withMessage("Email is required.")
            .isEmail().withMessage("Email is invalid."),
        body("role")
            .notEmpty().withMessage("Role is required.")
            .isIn(AvailableUserRole).withMessage(`Role must be one of: ${AvailableUserRole.join(", ")}.`),
    ];
};

const createTaskValidator = () => {
    return [
        body("title")
            .trim()
            .notEmpty().withMessage("Task title is required."),
        body("description").optional().trim(),
        body("assignedTo").optional().isMongoId().withMessage("assignedTo must be a valid user ID."),
        body("status")
            .optional()
            .isIn(AvailableTaskStatuses)
            .withMessage(`Status must be one of: ${AvailableTaskStatuses.join(", ")}.`),
    ];
};

const updateTaskValidator = () => {
    return [
        body("title").optional().trim().notEmpty().withMessage("Title cannot be empty."),
        body("description").optional().trim(),
        body("assignedTo").optional().isMongoId().withMessage("assignedTo must be a valid user ID."),
        body("status")
            .optional()
            .isIn(AvailableTaskStatuses)
            .withMessage(`Status must be one of: ${AvailableTaskStatuses.join(", ")}.`),
    ];
};

const createSubtaskValidator = () => {
    return [
        body("title")
            .trim()
            .notEmpty().withMessage("Subtask title is required."),
    ];
};

const createNoteValidator = () => {
    return [
        body("content")
            .trim()
            .notEmpty().withMessage("Note content is required."),
    ];
};

export {
    userRegisterValidator,
    userLoginValidator,
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userResetForgotPasswordValidator,
    createProjectValidator,
    addMemberToProjectValidator,
    createTaskValidator,
    updateTaskValidator,
    createSubtaskValidator,
    createNoteValidator,
};