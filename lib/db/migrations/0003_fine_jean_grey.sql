CREATE TYPE "public"."friend_link_status" AS ENUM('draft', 'published', 'trash');--> statement-breakpoint
CREATE TABLE "friend_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "friend_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_id" integer NOT NULL,
	"site_name" varchar(160) NOT NULL,
	"url" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_media_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "friend_link_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_links_published_at_required" CHECK (("friend_links"."status" <> 'published' or "friend_links"."published_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_links_author_idx" ON "friend_links" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "friend_links_logo_media_idx" ON "friend_links" USING btree ("logo_media_id");--> statement-breakpoint
CREATE INDEX "friend_links_status_sort_idx" ON "friend_links" USING btree ("status","sort_order","site_name");