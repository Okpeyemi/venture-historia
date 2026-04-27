CREATE TABLE "iaCallLog" (
	"id" text PRIMARY KEY NOT NULL,
	"gameId" text,
	"trimesterIndex" integer,
	"agentRole" text NOT NULL,
	"model" text NOT NULL,
	"inputTokensTotal" integer NOT NULL,
	"inputTokensCached" integer DEFAULT 0 NOT NULL,
	"outputTokens" integer NOT NULL,
	"costUsd" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iaCallLog" ADD CONSTRAINT "iaCallLog_gameId_game_id_fk" FOREIGN KEY ("gameId") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;