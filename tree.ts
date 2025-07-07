import { readdirSync } from "node:fs";
import { join } from "node:path";
const excluded: string[] = [".vscode", "node_modules", ".git"];

const ansi = {
  reset: "",
  dir: "\x1b[36m", // cyan
  file: "\x1b[32m", // green
  branch: "\x1b[90m", // bright black (gray)
};

function tree(path: string[] = [], prefix = "", isRoot = true): string {
  const dirPath = join(...path);
  const files = readdirSync(dirPath, { withFileTypes: true })
    .filter((e) => !excluded.includes(e.name))
    // @ts-expect-error
    .sort((a, b) => b.isDirectory() - a.isDirectory());

  let res = "";
  if (isRoot && path.length > 0) {
    res += ansi.dir + path[path.length - 1] + ansi.reset + "\n";
  }

  // Separate directories and files
  const dirs = files.filter((f) => f.isDirectory());
  const fileEntries = files.filter((f) => !f.isDirectory());

  const lastIdx = dirs.length + (fileEntries.length > 0 ? 1 : 0) - 1;

  dirs.forEach((dir, idx) => {
    const isLast = idx === lastIdx;
    const branch = isLast && fileEntries.length === 0 ? "└── " : "├── ";
    res +=
      prefix +
      ansi.branch +
      branch +
      ansi.reset +
      ansi.dir +
      dir.name +
      ansi.reset +
      "\n";
    res += tree(
      [...path, dir.name],
      prefix + (isLast && fileEntries.length === 0 ? "    " : "│   "),
      false
    );
  });

  if (fileEntries.length > 0) {
    const branch = "└── ";
    const fileNames = fileEntries
      .map((f) => ansi.file + f.name + ansi.reset)
      .join(", ");
    res += prefix + ansi.branch + branch + ansi.reset + fileNames + "\n";
  }

  return res;
}

const tr = tree(["/etc", "nixos"]);
console.log(tr);
Bun.spawnSync(["wl-copy", "```ansi\n" + tr + "```"]);
// ├└
