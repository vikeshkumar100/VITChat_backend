import express from "express";
import { getRegisteredUsers } from "../controllers/userCountController.js";

const router = express.Router();

router.get("/registered-users", getRegisteredUsers);

export default router;
