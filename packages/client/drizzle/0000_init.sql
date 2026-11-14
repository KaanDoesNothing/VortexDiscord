CREATE TABLE "command_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "command_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text,
	"user_id" text NOT NULL,
	"command" text NOT NULL,
	"parameters" text DEFAULT '' NOT NULL,
	"slash" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_members" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"messages" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_members_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"prefix" varchar(10) DEFAULT '->' NOT NULL,
	"disabled_commands" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mod_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mod_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"type" text NOT NULL,
	"moderator_id" text,
	"target_id" text,
	"reason" text DEFAULT 'None' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"permission" integer DEFAULT 0 NOT NULL,
	"balance" bigint DEFAULT 500 NOT NULL,
	"bio" varchar(100) DEFAULT 'None' NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"dislikes" integer DEFAULT 0 NOT NULL,
	"daily_claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "command_logs_guild_idx" ON "command_logs" USING btree ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "command_logs_command_idx" ON "command_logs" USING btree ("command");--> statement-breakpoint
CREATE INDEX "guild_members_leaderboard_idx" ON "guild_members" USING btree ("guild_id","level");--> statement-breakpoint
CREATE INDEX "mod_logs_guild_target_idx" ON "mod_logs" USING btree ("guild_id","target_id","created_at");