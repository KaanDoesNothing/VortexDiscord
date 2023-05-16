import mongoose from "npm:mongoose";
import { config as env } from "dotenv/mod.ts";

const config = env();

export const initDatabase = () => new Promise(async (resolve, reject) => {
    try {
        //@ts-ignore
        await mongoose.connect(config.MONGODB,{ dbName: config.DATABASE || "VortexDiscord" });
        console.log("Connected to database");
        resolve(true);
    }catch(err) {
        console.log(err);
        reject(false);
    }
});

const UserSchema = new mongoose.Schema({
    user_id: {type: mongoose.SchemaTypes.String, required: true},
    economy: {
        money: {
            value: {type: mongoose.SchemaTypes.Number, default: 500},
            cooldown: {type: mongoose.SchemaTypes.Number, default: 0}
        }
    },
    profile: {
        description: {type: mongoose.SchemaTypes.String, default: "None", maxlength: 100},
        likes: {type: mongoose.SchemaTypes.Number, default: 0},
        dislikes: {type: mongoose.SchemaTypes.Number, default: 0}
    },
    administrator: {type: mongoose.SchemaTypes.Boolean, default: false},
    blacklisted: {type: mongoose.SchemaTypes.Boolean, default: false}
}, {timestamps: true});

const GuildUserSchema = new mongoose.Schema({
    user_id: {type: mongoose.SchemaTypes.String, required: true},
    guild_id: {type: mongoose.SchemaTypes.String, required: true},
    economy: {
        experience: {
            level: {type: mongoose.SchemaTypes.Number, default: 1},
            messages: {type: mongoose.SchemaTypes.Number, default: 1},
        }
    }
}, {timestamps: true});

const GuildWarnSchema = new mongoose.Schema({
    user_id: {type: mongoose.SchemaTypes.String, required: true},
    guild_id: {type: mongoose.SchemaTypes.String, required: true},
    reason: {type: mongoose.SchemaTypes.String, required: true}
}, {timestamps: true});

const GuildSchema = new mongoose.Schema({
    guild_id: {type: mongoose.SchemaTypes.String, required: true},
    settings: {
        economy: {
            experience: {
                enabled: {type: mongoose.SchemaTypes.Boolean, default: false}
            }
        },
        blacklist: {
            words: {type: mongoose.SchemaTypes.Array, default: []}
        },
        prefix: {type: mongoose.SchemaTypes.String, default: "=>"}
    }
}, {timestamps: true});

const CacheSchema = new mongoose.Schema({
    type: {type: mongoose.SchemaTypes.String, required: true},
    key: {type: mongoose.SchemaTypes.String, required: true},
    value: {}
});

export const UserTable = mongoose.model("User", UserSchema);
export const GuildUserTable = mongoose.model("GuildUser", GuildUserSchema);
export const GuildTable = mongoose.model("Guild", GuildSchema);
export const CacheTable = mongoose.model("Cache", CacheSchema);
export const GuildWarnTable = mongoose.model("GuildWarn", GuildWarnSchema);