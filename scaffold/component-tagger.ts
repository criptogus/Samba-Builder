import { parse } from "@babel/parser";
import MagicString from "magic-string";
import path from "node:path";
import { walk } from "estree-walker";
import type { Plugin } from "vite";

const VALID_EXTENSIONS = new Set([".jsx", ".tsx"]);

/**
 * Returns a Vite / esbuild plug-in that tags JSX components with stable
 * `data-samba-id` / `data-samba-name` attributes so the visual editor and the
 * test recorder can select components in the live preview.
 *
 * Samba Builder (BYOK): plugin local embutido no scaffold — zero dependência
 * externa no editor visual.
 */
export default function sambaTagger(): Plugin {
  return {
    name: "vite-plugin-samba-tagger",
    apply: "serve",
    enforce: "pre",

    async transform(code: string, id: string) {
      try {
        // Ignore non-jsx files and files inside node_modules
        if (
          !VALID_EXTENSIONS.has(path.extname(id)) ||
          id.includes("node_modules")
        )
          return null;

        const ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });

        const ms = new MagicString(code);
        const fileRelative = path.relative(process.cwd(), id);

        walk(ast as any, {
          enter(node: any) {
            try {
              if (node.type !== "JSXOpeningElement") return;

              // ── 1. Extract the tag / component name ──────────────────────────────
              if (node.name?.type !== "JSXIdentifier") return;
              const tagName = node.name.name as string;
              if (!tagName) return;

              // ── 2. Check whether the tag already has data-samba-id ──────────────
              const alreadyTagged = node.attributes?.some(
                (attr: any) =>
                  attr.type === "JSXAttribute" &&
                  attr.name?.name === "data-samba-id",
              );
              if (alreadyTagged) return;

              // ── 3. Build the id "relative/file.jsx:line:column" ─────────────────
              const loc = node.loc?.start;
              if (!loc) return;
              const sambaId = `${fileRelative}:${loc.line}:${loc.column}`;

              // ── 4. Inject the attributes just after the tag name ────────────────
              if (node.name.end != null) {
                ms.appendLeft(
                  node.name.end,
                  ` data-samba-id="${sambaId}" data-samba-name="${tagName}"`,
                );
              }
            } catch (error) {
              console.warn(
                `[samba-tagger] Warning: Failed to process JSX node in ${id}:`,
                error,
              );
            }
          },
        });

        // If nothing changed bail out.
        if (ms.toString() === code) return null;

        return {
          code: ms.toString(),
          map: ms.generateMap({ hires: true }),
        };
      } catch (error) {
        console.warn(
          `[samba-tagger] Warning: Failed to transform ${id}:`,
          error,
        );
        return null;
      }
    },
  };
}
