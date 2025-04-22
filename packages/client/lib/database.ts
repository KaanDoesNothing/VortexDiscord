import mongoose, { Mongoose } from "mongoose";

const mongoDB = new Mongoose();

await mongoDB.connect(`${Bun.env.MONGODB_HOST}/${Bun.env.MONGODB_DATABASE}`, {
    authSource: "admin",
    user: Bun.env.MONGODB_USERNAME!,
    pass: Bun.env.MONGODB_PASSWORD!
});

const GuildSchema = new mongoose.Schema({
    server: {type: String, required: true, index: true},
    prefix: {type: String, default: Bun.env.DEBUG ? "==>" : "=>"},
    commands: {
        disabled: {type: [String], default: []}
    }
}, {timestamps: true});

const CommandLogSchema = new mongoose.Schema({
    server: {type: String, required: true, index: true},
    user: {type: String, required: true},
    command: { type: String, required: true, index: true },
    parameters: { type: String, default: ""},
    slash: {type: Boolean, default: false}
}, {timestamps: true});

const ModLogSchema = new mongoose.Schema({
    server: {type: String, required: true, index: true},
    type: {type: String, required: true},
    user: {type: String},
    target: {type: String},
    reason: {type: String, default: "None"}
}, {timestamps: true});

const UserSchema = new mongoose.Schema({
    user: {type: mongoose.SchemaTypes.String, required: true, index: true},
    permission: {type: Number, default: 0},
    economy: {
        balance: {type: mongoose.SchemaTypes.Number, default: 500}
    },
    profile: {
        description: {type: mongoose.SchemaTypes.String, default: "None", maxlength: 100},
        likes: {type: mongoose.SchemaTypes.Number, default: 0},
        dislikes: {type: mongoose.SchemaTypes.Number, default: 0}
    },
    timeouts: {
        daily: {type: Date, default: 0}
    },
}, {timestamps: true});

const GuildUserSchema = new mongoose.Schema({
    user: {type: mongoose.SchemaTypes.String, required: true, index: true},
    server: {type: mongoose.SchemaTypes.String, required: true, index: true},
    profile: {
        experience: {
            level: {type: mongoose.SchemaTypes.Number, default: 1},
            messages: {type: mongoose.SchemaTypes.Number, default: 1},
        }
    }
}, {timestamps: true});

export const Database = {
    Guild: mongoDB.model("guild", GuildSchema),
    CommandLog: mongoDB.model("commandlog", CommandLogSchema),
    User: mongoDB.model("user", UserSchema),
    Modlog: mongoDB.model("modlog", ModLogSchema),
    GuildUser: mongoDB.model("guilduser", GuildUserSchema)
}

class Manager {
    async getGuild(server: string) {
        return await Database.Guild.findOne({server}) || await Database.Guild.create({
            server
        });
    }

    async getUser(user: string) {
        return await Database.User.findOne({user}) || await Database.User.create({
            user
        });
    }

    async getGuildUser(server: string, user: string) {
        return await Database.GuildUser.findOne({server, user}) || await Database.GuildUser.create({
            server,
            user
        });
    }
}

export const DBManager = new Manager();