import dotenv from "dotenv"

// import connectDB from "./db/index.js";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path :'./env'
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`server is running in port ${process.env.PORT}`);
        
    })
})
.catch((err)=>{
    console.log("db connection fail",err);
})





// connection code 

/*import express from "express";
const app = express();

;( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI} / ${db_name}`)
        app.on("error",(error)=>{
            console.log("error",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`app is listen on port ${process.env.PORT}`);
            
        })

        
    } catch (error) {
        console.error("Error :",error);
        throw error
        
    }
})()*/