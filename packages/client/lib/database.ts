import mongoose, { Mongoose } from "mongoose";
import { conn, GuildTable, GuildUserTable, GuildWarnTable, UserTable } from "./migrate";

const mongoDB = new Mongoose();

await mongoDB.connect(Bun.env.MONGODB_HOST!, {
    authSource: "admin",
    user: Bun.env.MONGODB_USERNAME!,
    pass: Bun.env.MONGODB_PASSWORD!
});

const GuildSchema = new mongoose.Schema({
    server: {type: String, required: true, index: true},
    prefix: {type: String, default: "->"}
}, {timestamps: true});

const CommandLogSchema = new mongoose.Schema({
    server: {type: String, required: true, index: true},
    user: {type: String, required: true},
    command: { type: String, required: true, index: true },
    parameters: { type: String, default: ""}
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
        return await Database.Guild.findOneAndUpdate(
            {server},
            {$setOnInsert: {server}},
            {new: true, upsert: true, setDefaultsOnInsert: true}
        );
    }

    async getUser(user: string) {
        return await Database.User.findOneAndUpdate(
            {user},
            {$setOnInsert: {user}},
            {new: true, upsert: true, setDefaultsOnInsert: true}
        );
    }

    async getGuildUser(server: string, user: string) {
        return await Database.GuildUser.findOneAndUpdate(
            {server, user},
            {$setOnInsert: {server, user}},
            {new: true, upsert: true, setDefaultsOnInsert: true}
        );
    }
}

export const DBManager = new Manager();

async function migrateUsers() {
    console.time("Migrating users");
    const userTableData = await UserTable.find();

    await Promise.all(userTableData.map(async row => {
        await Database.User.create({
            user: row.user_id,
            economy: {
                balance: row.economy.money.value
            },
            profile: row.profile,
            createdAt: row.createdAt
        })
    }));
    console.timeEnd("Migrating users");
}

async function migrateGuildUsers() {
    console.time("Migrating guild users");

    const userGuildTableData = await GuildUserTable.find();
    
    await Promise.all(userGuildTableData.map(async row => {
        await Database.GuildUser.create({
            user: row.user_id,
            server: row.guild_id,
            profile: {
                experience: row.economy.experience
            },
            createdAt: row.createdAt
        })
    }));
    
    console.timeEnd("Migrating guild users");
}

async function migrateWarns() {
    console.time("Migrating warns")

    const warnsData = await GuildWarnTable.find();

    await Promise.all(warnsData.map(async row => {
        await Database.Modlog.create({
            server: row.guild_id,
            user: "unknown",
            target: row.user_id,
            reason: row.reason,
            type: "warn",
            createdAt: row.createdAt
        })
    }));

    console.timeEnd("Migrating warns")
}

async function migrateGuilds() {
    console.time("Migrating Guilds")

    const guildData = await GuildTable.find();

    await Promise.all(guildData.map(async row => {
        await Database.Guild.create({
            server: row.guild_id,
            prefix: row.settings.prefix,
            createdAt: row.createdAt
        })
    }));

    console.timeEnd("Migrating Guilds")
}