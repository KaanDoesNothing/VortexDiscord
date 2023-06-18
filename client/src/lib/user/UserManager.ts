import {Snowflake, User} from "discord.js";
import {client} from "../../index";
import {IUserSchema, UserTable} from "../Database";
import {Document, Model} from "mongoose";

export class UserManager {
    private user_id: string;
    private user: User;
    private document: Document<IUserSchema>;
    constructor(user_id: Snowflake | string) {
        this.user_id = user_id;
    }
    
    async prepare() {
        this.document = await UserTable.findOne({user_id: this.user_id});
        this.user = client.users.cache.get(this.user_id) || await client.users.fetch(this.user_id);

        return this;
    }

    // getItems() {
    //     return this.document.
    // }

    getDoc() {
        return this.document;
    }
}