CREATE TABLE "post_slug_aliases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_slug_aliases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_id" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sitemap_entries" ALTER COLUMN "loc" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "post_slug_aliases" ADD CONSTRAINT "post_slug_aliases_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_slug_aliases_slug_unique" ON "post_slug_aliases" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "post_slug_aliases_post_idx" ON "post_slug_aliases" USING btree ("post_id");