import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("database migrations", () => {
  it("keeps the active v4 entry writer free of ambiguous entry_id references", () => {
    const migrationDirectory = path.join(process.cwd(), "supabase/migrations");
    const migrations = readdirSync(migrationDirectory)
      .filter((filename) => filename.endsWith(".sql"))
      .sort()
      .map((filename) => readFileSync(path.join(migrationDirectory, filename), "utf8"))
      .join("\n");
    const definitions = [...migrations.matchAll(
      /create or replace function public\.owner_upsert_private_entry_v4\([\s\S]*?\n\$\$;/giu,
    )];
    const activeDefinition = definitions.at(-1)?.[0] || "";

    expect(activeDefinition).not.toBe("");
    expect(activeDefinition).not.toMatch(
      /delete\s+from\s+public\.private_entry_viewers\s+where\s+entry_id\s*=/iu,
    );
    expect(activeDefinition).toMatch(/where\s+viewer\.entry_id\s*=\s*stable_entry_id/iu);
  });
});
