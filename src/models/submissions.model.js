import mongoose, {Schema} from "mongoose";

const submissionSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
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
        task: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true
        },
        fullMarks: {
            type: Number, 
            required: true
        },
        marks: {
            type: String, 
            default: "unmarked"
        }
    }, 
    {
        timestamps: true
    }
)


export const Submission = mongoose.model("Submission", submissionSchema)