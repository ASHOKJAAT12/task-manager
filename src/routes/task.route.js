import { Router } from "express";
import {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask,
} from "../controllers/task.controller.js";
import { validateProjectPermission } from "../middlewares/auth.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import { validate } from "../middlewares/validator.middleware.js";
import { createTaskValidator, updateTaskValidator, createSubtaskValidator } from "../validators/index.js";

// mergeParams:true so :projectId is available from the parent router
const router = Router({ mergeParams: true });

// verifyJWT + member check already applied by project.route.js before mounting this router

// Tasks
router
    .route("/")
    .get(getTasks)
    .post(createTaskValidator(), validate, createTask);

router
    .route("/:taskId")
    .get(getTaskById)
    .put(updateTaskValidator(), validate, updateTask)
    .delete(validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]), deleteTask);

// Subtasks
router
    .route("/:taskId/subtasks")
    .post(createSubtaskValidator(), validate, createSubTask);

router
    .route("/:taskId/subtasks/:subtaskId")
    .put(updateSubTask)
    .delete(deleteSubTask);

export default router;
