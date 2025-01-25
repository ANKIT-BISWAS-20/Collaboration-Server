import mongoose, {Schema} from "mongoose";

const taskSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        deadline: {
            type: Date,
            required: true
        },
        description: {
            type: String, 
            required: true,
        },
        document: {
            type: String, 
            required: true
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: "Team",
            required: true
        },
        fullmarks: {
            type: String, 
            required: true,
        },
        attached:{
            type: Schema.Types.ObjectId,
            ref: "User",
        }
    }, 
    {
        timestamps: true
    }
)


export const Assignment = mongoose.model("Assignment", taskSchema)