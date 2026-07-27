import { body } from "express-validator";

const userRegisterValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required.")
            .isEmail()
            .withMessage("Email is invalid")
            .toLowerCase(),
        body("username")
            .trim()
            .notEmpty()
            .withMessage("username is required.")
            .isLowercase()
            .withMessage("username must be lower case.")
            .isLength({min:3})
            .withMessage("username must be at least 3 charater long"),
        body("password")
            .trim()
            .notEmpty()
            .withMessage("password must be required")
            .isLength({ min: 6})
            .withMessage("password must be at least 6 charater"),
        body("fullName")
            .optional()
            .trim()
            .isLength({max:20})
            .withMessage("maximum lenght of fullname is 20 charater.")
    ];
};

const userLoginValidator = () => {
    return [
        body("email")
            .optional()
            .isEmail()
            .withMessage("Email is invalid"),
        body("password")
            .trim()
            .notEmpty()
            .withMessage("password must be required.")

    ]
};

const userChangeCurrentPasswordValidator = () => {
    return [
        body("oldPassword")
            .notEmpty()
            .withMessage("old password must be required."),
        body("newPassword")
            .notEmpty()
            .withMessage("new password must be required.")
    ]
};

const userForgotPasswordValidator = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage("Email must be required.")
            .isEmail()
            .withMessage("Email is invalid")
    ]
};

const userResetForgotPasswordValidator = () => {
    return [
        body("newPassword")
            .notEmpty()
            .withMessage("new password must be required.")
    ]
};


const createProjectValidator = () => {
    return [
        body("name")
            .notEmpty()
            .withMessage("name is required."),
        body("description")
            .optional()
    ]
};

const addMemberToProjectValidator = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage("email must be required.")
            .isEmail()
            .withMessage("email is invalid"),
        body("role")
            .notEmpty()
            .withMessage("Role is required.")
            .isIn(AvailableUserRole)
            .withMessage("Role is invalid.")
    ]
};


export {
    userRegisterValidator,
    userLoginValidator,
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userResetForgotPasswordValidator,
    createProjectValidator,
    addMemberToProjectValidator
};