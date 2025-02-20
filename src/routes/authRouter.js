import express from 'express';
import { google } from 'googleapis';
import googleLogin from '../controllers/googleLoginController.js';
const router = express.Router();

router.get('/google', googleLogin);

export default router;