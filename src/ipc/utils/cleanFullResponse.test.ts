import { cleanFullResponse } from "@/ipc/utils/cleanFullResponse";
import { describe, it, expect } from "vitest";

describe("cleanFullResponse", () => {
  it("should replace < characters in samba-write attributes", () => {
    const input = `<samba-write path="src/file.tsx" description="Testing <a> tags.">content</samba-write>`;
    const expected = `<samba-write path="src/file.tsx" description="Testing ＜a＞ tags.">content</samba-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should replace < characters in multiple attributes", () => {
    const input = `<samba-write path="src/<component>.tsx" description="Testing <div> tags.">content</samba-write>`;
    const expected = `<samba-write path="src/＜component＞.tsx" description="Testing ＜div＞ tags.">content</samba-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle multiple nested HTML tags in a single attribute", () => {
    const input = `<samba-write path="src/file.tsx" description="Testing <div> and <span> and <a> tags.">content</samba-write>`;
    const expected = `<samba-write path="src/file.tsx" description="Testing ＜div＞ and ＜span＞ and ＜a＞ tags.">content</samba-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle complex example with mixed content", () => {
    const input = `
      BEFORE TAG
  <samba-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</samba-write>
AFTER TAG
    `;

    const expected = `
      BEFORE TAG
  <samba-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use ＜a＞ tags.">
import React from 'react';
</samba-write>
AFTER TAG
    `;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle other samba tag types", () => {
    const input = `<samba-rename from="src/<old>.tsx" to="src/<new>.tsx"></samba-rename>`;
    const expected = `<samba-rename from="src/＜old＞.tsx" to="src/＜new＞.tsx"></samba-rename>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle samba-delete tags", () => {
    const input = `<samba-delete path="src/<component>.tsx"></samba-delete>`;
    const expected = `<samba-delete path="src/＜component＞.tsx"></samba-delete>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should not affect content outside samba tags", () => {
    const input = `Some text with <regular> HTML tags. <samba-write path="test.tsx" description="With <nested> tags.">content</samba-write> More <html> here.`;
    const expected = `Some text with <regular> HTML tags. <samba-write path="test.tsx" description="With ＜nested＞ tags.">content</samba-write> More <html> here.`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle empty attributes", () => {
    const input = `<samba-write path="src/file.tsx">content</samba-write>`;
    const expected = `<samba-write path="src/file.tsx">content</samba-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle attributes without < characters", () => {
    const input = `<samba-write path="src/file.tsx" description="Normal description">content</samba-write>`;
    const expected = `<samba-write path="src/file.tsx" description="Normal description">content</samba-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });
});
