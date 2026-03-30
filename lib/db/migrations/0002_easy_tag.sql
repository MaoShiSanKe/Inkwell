CREATE TABLE "custom_page_meta" (
	"page_id" integer PRIMARY KEY NOT NULL,
	"meta_title" varchar(255),
	"meta_description" text,
	"og_title" varchar(255),
	"og_description" text,
	"og_image_media_id" integer,
	"canonical_url" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"nofollow" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_pages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "custom_pages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"content" text NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_pages_published_at_required" CHECK (("custom_pages"."status" not in ('published', 'scheduled') or "custom_pages"."published_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "custom_page_meta" ADD CONSTRAINT "custom_page_meta_page_id_custom_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."custom_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_page_meta" ADD CONSTRAINT "custom_page_meta_og_image_media_id_media_id_fk" FOREIGN KEY ("og_image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_pages" ADD CONSTRAINT "custom_pages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_pages_slug_unique" ON "custom_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "custom_pages_author_idx" ON "custom_pages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "custom_pages_status_published_idx" ON "custom_pages" USING btree ("status","published_at");