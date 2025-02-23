import User from "../models/userModel.js";

export const getRegisteredUsers = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ registeredUsers: totalUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
};
