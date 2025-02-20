import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const db_url = process.env.DB_URL;

mongoose.connect(db_url)
    .then(() => {
        console.log('Connected to DB');
    }).catch((err) => {
        console.log('Error in db connection :'+err);
    });
export default mongoose;