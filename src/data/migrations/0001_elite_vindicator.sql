--> Dedeupe: elimina recursos duplicados por nombre (conserva el id más bajo)
DELETE FROM "resources" a USING "resources" b WHERE a.id > b.id AND a.name = b.name;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_name_unique" UNIQUE("name");
