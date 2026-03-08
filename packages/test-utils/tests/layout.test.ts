import { expect, test } from "bun:test";
import { layoutFixtures } from "@neotui/fixtures";
import { renderFixtureToString } from "../src/index.ts";

test("layout fixture corpus covers at least 25 cases", () => {
  expect(layoutFixtures.length).toBeGreaterThanOrEqual(25);
});

for (const fixture of layoutFixtures) {
  test(`layout fixture ${fixture.id} renders deterministically`, () => {
    expect(renderFixtureToString(fixture)).toMatchSnapshot();
  });
}
