import { Router } from "express";
import {registerUser,
    userLogin,
    userLogout,
    getCurrentUser,
    verifyEmail,
    resendEmailVerification,
    refreshAccessToken,
    forgotPasswordRequest,
    changeCurrentPassword,
    resetForgotPassword} from '../controllers/user.controller.js';
import {userRegisterValidator,
    userLoginValidator,
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userResetForgotPasswordValidator } from '../validators/index.js';
import { validate } from "../middlewares/validator.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(userRegisterValidator(),validate,registerUser);
router.route("/login").post(userLoginValidator(),validate,userLogin);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(userForgotPasswordValidator(),validate,forgotPasswordRequest);
router.route("/reset-password/:resetToken").post(userResetForgotPasswordValidator(),validate,resetForgotPassword);

//secure router
router.route("/logout").post(verifyJWT,userLogout);
router.route("/current-user").post(verifyJWT,getCurrentUser);
router.route("/change-password").post(userChangeCurrentPasswordValidator(),validate,changeCurrentPassword);
router.route("/resend-email-verification").post(verifyJWT,resendEmailVerification);

export default router;