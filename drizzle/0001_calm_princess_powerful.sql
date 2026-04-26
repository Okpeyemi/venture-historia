CREATE TABLE "game" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"scenarioPresetId" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"endingType" text,
	"endingSummary" text,
	"currentTrimesterIndex" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trimester" (
	"gameId" text NOT NULL,
	"trimesterIndex" integer NOT NULL,
	"state" jsonb NOT NULL,
	"narrationOpening" text,
	"narrationClosing" text,
	"event" jsonb,
	"decisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trimester_gameId_trimesterIndex_pk" PRIMARY KEY("gameId","trimesterIndex")
);
--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trimester" ADD CONSTRAINT "trimester_gameId_game_id_fk" FOREIGN KEY ("gameId") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;