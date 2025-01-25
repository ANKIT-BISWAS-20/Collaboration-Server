import express from "express"
import cors from "cors"


const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))


// Server Status
import serverStatusRouter from "./src/routes/serverStatus.routes.js"
app.use("/",serverStatusRouter);

// User Endpoints
import userRouter from './src/routes/user.routes.js'
app.use("/api/v1/users", userRouter)

// Team Endpoints
import teamRouter from './src/routes/team.routes.js'
app.use("/api/v1/teams", teamRouter)

// Material Endpoints
import materialRouter from './src/routes/material.routes.js'
app.use("/api/v1/materials", materialRouter)

// Task Endpoints
import taskRouter from './src/routes/task.routes.js'
app.use("/api/v1/tasks", taskRouter)

// Submission Endpoints
import submissionRouter from './src/routes/submission.routes.js'
app.use("/api/v1/submissions", submissionRouter)


export { app }