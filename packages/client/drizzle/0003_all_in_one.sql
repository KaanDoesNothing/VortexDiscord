CREATE TABLE "autoresponders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "autoresponders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"trigger" varchar(200) NOT NULL,
	"match" text DEFAULT 'contains' NOT NULL,
	"response" varchar(2000) DEFAULT '' NOT NULL,
	"embed" boolean DEFAULT false NOT NULL,
	"reaction" varchar(64) DEFAULT '' NOT NULL,
	"channel_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"cooldown_seconds" integer DEFAULT 10 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feeds" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "feeds_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"label" varchar(100) DEFAULT '' NOT NULL,
	"channel_id" text NOT NULL,
	"message" varchar(1000) DEFAULT '' NOT NULL,
	"ping_role_id" text,
	"last_item_id" text,
	"last_checked_at" timestamp with time zone,
	"failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_guild_id_user_id_item_id_pk" PRIMARY KEY("guild_id","user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "invite_joins" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invite_joins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"inviter_id" text,
	"code" text,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reaction_roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reaction_roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL,
	"emoji" text NOT NULL,
	"role_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(200) DEFAULT '' NOT NULL,
	"emoji" varchar(64) DEFAULT '' NOT NULL,
	"price" bigint NOT NULL,
	"role_id" text,
	"stock" integer,
	"max_per_user" integer DEFAULT 0 NOT NULL,
	"required_role_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sticky_messages" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"content" varchar(2000) NOT NULL,
	"embed" boolean DEFAULT false NOT NULL,
	"last_message_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "temp_voice_channels" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"scope" text NOT NULL,
	"user_id" text NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"bank" bigint DEFAULT 0 NOT NULL,
	"daily_claimed_at" timestamp with time zone,
	"daily_streak" integer DEFAULT 0 NOT NULL,
	"cooldowns" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_scope_user_id_pk" PRIMARY KEY("scope","user_id")
);
--> statement-breakpoint
ALTER TABLE "guild_members" ADD COLUMN "xp" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "guild_members" ADD COLUMN "voice_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "role_panels" ADD COLUMN "style" text DEFAULT 'buttons' NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "type" varchar(50);--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "claimed_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_vote_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_item_id_shop_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."shop_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autoresponders_guild_idx" ON "autoresponders" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "feeds_guild_idx" ON "feeds" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "feeds_checked_idx" ON "feeds" USING btree ("last_checked_at");--> statement-breakpoint
CREATE INDEX "invite_joins_inviter_idx" ON "invite_joins" USING btree ("guild_id","inviter_id");--> statement-breakpoint
CREATE INDEX "invite_joins_user_idx" ON "invite_joins" USING btree ("guild_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reaction_roles_message_emoji_idx" ON "reaction_roles" USING btree ("message_id","emoji");--> statement-breakpoint
CREATE INDEX "reaction_roles_guild_idx" ON "reaction_roles" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "shop_items_guild_idx" ON "shop_items" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "sticky_messages_guild_idx" ON "sticky_messages" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "temp_voice_guild_idx" ON "temp_voice_channels" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "wallets_scope_balance_idx" ON "wallets" USING btree ("scope","balance");--> statement-breakpoint
CREATE INDEX "guild_members_xp_idx" ON "guild_members" USING btree ("guild_id","xp");--> statement-breakpoint
-- Data: existing balances become the shared ("global") wallets.
INSERT INTO "wallets" ("scope", "user_id", "balance", "bank", "daily_claimed_at", "daily_streak", "cooldowns") SELECT 'global', "id", "balance", "bank", "daily_claimed_at", "daily_streak", "cooldowns" FROM "users" ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Data: members keep their level under the XP system (XP set to the start of that level, see lib/leveling.ts).
UPDATE "guild_members" SET "xp" = (5 * ("level" - 1)::bigint * "level" * (2 * ("level" - 1) + 1) / 6) + 25 * ("level" - 1)::bigint * "level" + 100 * ("level" - 1)::bigint WHERE "level" > 1;
