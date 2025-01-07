import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    Credential:true
}));

app.use(express.json({limit:"80kb"}))
app.use(express.urlencoded({extended:true,limit:"8kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routs import
import userRouter from './route/user.routes.js'

//router decleration
app.use("/api/v1/users",userRouter) 

export { app }

