import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildMap } from "./map";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("PoE1 skill variants map to their shared base gem art", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-art-map-"));
  temporary.push(dir);
  const bases = {
    "Metadata/Items/Gems/SkillGemSummonRockGolem": {
      name: "Summon Stone Golem",
      release_state: "released",
      visual_identity: { dds_file: "Art/2DItems/Gems/RockGolem.dds" },
    },
    "Metadata/Items/Weapons/OneHandWeapons/OneHandSwords/StormBladeOneHand": {
      name: "Storm Blade",
      release_state: "released",
      visual_identity: { dds_file: "Art/StormBladeOneHand.dds" },
    },
    "Metadata/Items/Weapons/TwoHandWeapons/TwoHandSwords/StormBladeTwoHand": {
      name: "Two Handed Storm Blade",
      release_state: "released",
      visual_identity: { dds_file: "Art/StormBladeTwoHand.dds" },
    },
  };
  const gems = {
    SummonStoneGolemAltY: {
      skill_name: "Summon Stone Golem of Safeguarding",
      base_item: { id: "Metadata/Items/Gems/SkillGemSummonRockGolem" },
    },
  };
  await Bun.write(path.join(dir, "base_items.min.json"), JSON.stringify(bases));
  await Bun.write(path.join(dir, "uniques.min.json"), "[]");
  await Bun.write(path.join(dir, "skill_gems.min.json"), JSON.stringify(gems));
  await Bun.write(path.join(dir, "Art/2DItems/Gems/RockGolem.webp"), "stone golem art");
  await Bun.write(path.join(dir, "Art/StormBladeOneHand.webp"), "one handed energy blade art");
  await Bun.write(path.join(dir, "Art/StormBladeTwoHand.webp"), "two handed energy blade art");

  const { map } = await buildMap("poe1", "test", dir, {});

  expect(map.bases["Summon Stone Golem of Safeguarding"]).toBe("Art/2DItems/Gems/RockGolem.webp");
});
