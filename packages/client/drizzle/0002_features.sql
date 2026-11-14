CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "birthdays" (
	"user_id" text PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"day" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blacklist" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"reason" varchar(500) DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaways" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "giveaways_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"prize" varchar(256) NOT NULL,
	"winner_count" integer DEFAULT 1 NOT NULL,
	"host_id" text NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"ended" boolean DEFAULT false NOT NULL,
	"entrants" text[] DEFAULT '{}'::text[] NOT NULL,
	"winners" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mod_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mod_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"target_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"poll_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"option" integer NOT NULL,
	CONSTRAINT "poll_votes_poll_id_user_id_pk" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "polls_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"question" varchar(256) NOT NULL,
	"options" text[] NOT NULL,
	"author_id" text NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_panels" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_panels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"title" varchar(256) NOT NULL,
	"description" varchar(2000) DEFAULT '' NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mode" text DEFAULT 'toggle' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scheduled_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"guild_id" text,
	"run_at" timestamp with time zone NOT NULL,
	"repeat_minutes" integer,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "starboard_entries" (
	"guild_id" text NOT NULL,
	"message_id" text NOT NULL,
	"starboard_message_id" text NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "starboard_entries_guild_id_message_id_pk" PRIMARY KEY("guild_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "suggestions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"author_id" text NOT NULL,
	"content" varchar(2000) NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"response" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tickets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"topic" varchar(200),
	"closed" boolean DEFAULT false NOT NULL,
	"closed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cooldowns" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_guild_idx" ON "audit_log" USING btree ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "birthdays_date_idx" ON "birthdays" USING btree ("month","day");--> statement-breakpoint
CREATE INDEX "giveaways_guild_idx" ON "giveaways" USING btree ("guild_id","ended");--> statement-breakpoint
CREATE INDEX "member_events_guild_idx" ON "member_events" USING btree ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "mod_notes_guild_target_idx" ON "mod_notes" USING btree ("guild_id","target_id");--> statement-breakpoint
CREATE INDEX "role_panels_guild_idx" ON "role_panels" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_run_at_idx" ON "scheduled_tasks" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_guild_type_idx" ON "scheduled_tasks" USING btree ("guild_id","type");--> statement-breakpoint
CREATE INDEX "suggestions_guild_idx" ON "suggestions" USING btree ("guild_id","status");--> statement-breakpoint
CREATE INDEX "tickets_guild_idx" ON "tickets" USING btree ("guild_id","closed");--> statement-breakpoint
CREATE INDEX "tickets_channel_idx" ON "tickets" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "users_balance_idx" ON "users" USING btree ("balance");