import mongoose from "mongoose";
import {VortexConfig} from "../config";

export const initDatabase = () => new Promise(async (resolve, reject) => {
    try {
        //@ts-ignore
        await mongoose.connect(VortexConfig.MONGODB,{ dbName: VortexConfig.DATABASE || "VortexDiscord" });
        console.log("Connected to database");
        resolve(true);
    }catch(err) {
        console.log(err);
        reject(false);
    }
});

interface IUserSchema {
    user_id: string;
    economy: {
        money: {
            value: number;
            cooldown: number;
        }
    },
    inventory: {
        items: string[]
    },
    profile: {
        description: string;
        likes: number;
        dislikes: number
    },
    administrator: boolean;
    blacklisted: boolean;
}

const UserSchema = new mongoose.Schema({
    user_id: {type: mongoose.SchemaTypes.String, required: true},
    economy: {
        money: {
            value: {type: mongoose.SchemaTypes.Number, default: 500},
            cooldown: {type: mongoose.SchemaTypes.Number, default: 0}
        }
    },
    inventory: {
        items: {type: mongoose.SchemaTypes.Array, default: []}
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
        prefix: {type: mongoose.SchemaTypes.String, default: "=>", maxLength: 10},
        custom: {
            //name
            //code
            // {name: "test", code: ""}
            commands: {type: mongoose.SchemaTypes.Array, default: []}
        }
    }
}, {timestamps: true});

const CacheSchema = new mongoose.Schema({
    type: {type: mongoose.SchemaTypes.String, required: true},
    key: {type: mongoose.SchemaTypes.String, required: true},
    value: {}
});

export const UserTable = mongoose.model<IUserSchema>("User", UserSchema);
export const GuildUserTable = mongoose.model("GuildUser", GuildUserSchema);
export const GuildTable = mongoose.model("Guild", GuildSchema);
export const CacheTable = mongoose.model("Cache", CacheSchema);
export const GuildWarnTable = mongoose.model("GuildWarn", GuildWarnSchema);