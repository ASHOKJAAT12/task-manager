import { getProjects,
    getProjectById,
    getProjectMembers,
    createProject,
    updateProject,
    deleteProject,
    addMemberToProject,
    deleteMember,
    updateMemberRole } from '../controllers/project.controller.js';
import { Router } from 'express';
import { validate } from '../middlewares/validator.middleware.js';
import { createProjectValidator,addMemberToProjectValidator } from '../validators/index.js';
import { verifyJWT,validateProjectPermission } from '../middlewares/auth.middleware.js';
import { AvailableUserRole,UserRolseEnum } from '../utils/constants.js';

const router = Router();
router.use(verifyJWT);

router.route("/").get(getProjects).post(createProjectValidator(),validate,createProject);
router.route("/:projectId").get(validateProjectPermission(AvailableUserRole),getProjectById).put(validateProjectPermission([UserRolseEnum.ADMIN]),validate,updateProject).delete(validateProjectPermission([UserRolseEnum.ADMIN]),deleteProject);
router.route("/:projectId/members").get(getProjectMembers).post(validateProjectPermission([UserRolseEnum.ADMIN]),addMemberToProjectValidator(),validate,addMemberToProject);
router.route("/:projectId/member/:userId").put(validateProjectPermission([UserRolseEnum.ADMIN]),updateMemberRole).delete(validateProjectPermission([UserRolseEnum.ADMIN]),deleteMember);

export default router;