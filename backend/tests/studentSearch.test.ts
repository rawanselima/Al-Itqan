import { describe, it } from "node:test";
import assert from "node:assert";
import { buildStudentFilter, buildArabicSearchPattern } from "../src/utils/studentFilter";

describe("Student search filter", () => {
  it("keeps both soft-delete filter and search $or inside $and", () => {
    const filter = buildStudentFilter({
      circleId: "circle123",
      search: "سارة",
      isActive: true,
    });

    assert.strictEqual(filter.circleId, "circle123");
    assert.strictEqual(filter.isActive, true);
    assert.strictEqual(filter.$or, undefined);

    const andList = filter.$and as Array<Record<string, unknown>>;
    assert.strictEqual(andList.length, 2);
    assert.deepStrictEqual(andList[0], {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });

    const searchOr = andList[1].$or as Array<Record<string, { $regex: string; $options: string }>>;
    assert.strictEqual(searchOr.length, 2);
    assert.ok(searchOr[0].name.$regex);
    assert.ok(searchOr[1].phone.$regex);
  });

  it("ignores empty or whitespace-only search", () => {
    const filter = buildStudentFilter({ search: "   " });
    const andList = filter.$and as Array<Record<string, unknown>>;
    assert.strictEqual(andList.length, 1);
  });

  it("matches Arabic character variants and escapes regex special chars", () => {
    const alefRegex = new RegExp(buildArabicSearchPattern("امل"), "i");
    assert.ok(alefRegex.test("أمل طاهر"));
    assert.ok(alefRegex.test("إيمان كامل".replace("إيمان ", "امل ")));

    const taaRegex = new RegExp(buildArabicSearchPattern("ساره"), "i");
    assert.ok(taaRegex.test("سارة محمد"));

    const phoneRegex = new RegExp(buildArabicSearchPattern("+20(10)"), "i");
    assert.ok(phoneRegex.test("+20(10)123456"));
  });
});
