import mongoose, {Schema} from "mongoose";

const materialSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        name: {
            type: String,
            required: true
        },
        description: {
            type: String, 
            required: true,
        },
        file: {
            type: String, 
            required: true
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: "Team",
            required: true
        },
        type: {
            type: String, 
            required: true,
        }
    }, 
    {
        timestamps: true
    }
)


export const Material = mongoose.model("Material", materialSchema)