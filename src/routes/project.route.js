import { Router } from 'express';
import {
    getProjects,
    getProjectById,
    getProjectMembers,
    createProject,
    updateProject,
    deleteProject,
    addMemberToProject,
    deleteMember,
    updateMemberRole,
} from '../controllers/project.controller.js';
import { validate } from '../middlewares/validator.middleware.js';
import { createProjectValidator, addMemberToProjectValidator } from '../validators/index.js';
import { verifyJWT, validateProjectPermission } from '../middlewares/auth.middleware.js';
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

const router = Router();
router.use(verifyJWT); // All project routes require authentication

// Project CRUD
router
    .route("/")
    .get(getProjects)
    .post(createProjectValidator(), validate, createProject);

router
    .route("/:projectId")
    .get(validateProjectPermission(AvailableUserRole), getProjectById)
    .put(validateProjectPermission([UserRolesEnum.ADMIN]), createProjectValidator(), validate, updateProject)
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);

// Member management
router
    .route("/:projectId/members")
    .get(validateProjectPermission(AvailableUserRole), getProjectMembers)
    .post(validateProjectPermission([UserRolesEnum.ADMIN]), addMemberToProjectValidator(), validate, addMemberToProject);

router
    .route("/:projectId/member/:userId")
    .put(validateProjectPermission([UserRolesEnum.ADMIN]), updateMemberRole)
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteMember);

// Mount task and note sub-routers
import taskRouter from './task.route.js';
import noteRouter from './note.route.js';
router.use("/:projectId/tasks", validateProjectPermission(AvailableUserRole), taskRouter);
router.use("/:projectId/notes", validateProjectPermission(AvailableUserRole), noteRouter);

export default router;