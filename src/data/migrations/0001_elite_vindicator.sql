--> Reasignar reservas de recursos duplicados al recurso sobreviviente (id mas bajo)
UPDATE "reservations" AS r
SET "resource_id" = d.keep_id
FROM (
  SELECT a.id AS dup_id,
         (SELECT MIN(b.id) FROM "resources" b WHERE b.name = a.name) AS keep_id
  FROM "resources" a
) AS d
WHERE r."resource_id" = d.dup_id AND d.dup_id <> d.keep_id;--> statement-breakpoint
--> Eliminar recursos duplicados por nombre (conserva el id mas bajo)
DELETE FROM "resources" a USING "resources" b WHERE a.id > b.id AND a.name = b.name;--> statement-breakpoint
--> Agregar UNIQUE(name) de forma idempotente (seguro si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resources_name_unique'
  ) THEN
    ALTER TABLE "resources" ADD CONSTRAINT "resources_name_unique" UNIQUE("name");
  END IF;
END $$;
