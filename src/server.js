import app from './app.js';
import dotenv from 'dotenv';
import connectDB from './db/index.js';

const PORT = process.env.PORT || 4000;

dotenv.config({
    path: "./.env"
})


connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`server is live on PORT ${PORT}`);
    })
})
.catch((error)=> {
    console.error("Mongodb connection faild");
});