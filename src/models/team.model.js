import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const teamSchema = new Schema(
    {
        teamname: {
            type: String,
            required: true,
            index: true
        },
        thumbnail: {
            type: String, 
            required: true
        },
        title: {
            type: String, 
            required: true,
        },
        description: {
            type: String, 
            required: true
        },
        category: {
            type: String, 
            required: true,
            index: true
        },
        leader: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    }, 
    {
        timestamps: true
    }
)

teamSchema.plugin(mongooseAggregatePaginate)

export const Team = mongoose.model("Team", teamSchema)