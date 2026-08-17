import { Router } from "express";
import {
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
} from "../controllers/note.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { createNoteValidator } from "../validators/index.js";

// mergeParams:true so :projectId is available from the parent router
const router = Router({ mergeParams: true });

// verifyJWT + member check already applied by project.route.js before mounting this router

router
    .route("/")
    .get(getNotes)
    .post(createNoteValidator(), validate, createNote);

router
    .route("/:noteId")
    .get(getNoteById)
    .put(createNoteValidator(), validate, updateNote)
    .delete(deleteNote);

export default router;
