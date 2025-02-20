import axios from "axios";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { oauth2client } from "../utils/googleConfig.js";

const googleLogin = async (req, res) => {
    try {

        const code = req.query.code;
        if (!code) return res.status(400).json({ message: "Code is missing" });

        const { tokens } = await oauth2client.getToken(code);

        oauth2client.setCredentials(tokens);

        const userRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });

        const { email, name, picture } = userRes.data;
        let user = await userModel.findOne({ email });

        if (!user) {
            try{
            user = await userModel.create({ name, email, image: picture });
            console.log("User Created");
            } catch (err) {
                console.error("Error in creating user:", err);
                return res.status(500).json({ message: 'Internal Server Error db' });
            }
        }

        const token = jwt.sign({ _id: user._id, name, picture }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "12h" });

        return res.status(200).json({ message: 'Success', token, user });
    } catch (err) {
        console.error("Error in Google Login:", err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export default googleLogin;
