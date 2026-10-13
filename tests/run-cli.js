// Run the test suite from the terminal:  gjs tests/run-cli.js   (from the repo root)
// gjs is GNOME's JavaScript shell (SpiderMonkey) and ships with most Linux desktops.
const GLib = imports.gi.GLib;
globalThis.window = globalThis;

function load(path) {
  const [ok, bytes] = GLib.file_get_contents(path);
  if (!ok) throw new Error('cannot read ' + path);
  (0, eval)(new TextDecoder().decode(bytes) + '\n//# sourceURL=' + path);
}

load('tests/runner.js');
load('tests/manifest.js');
for (const f of TEST_MANIFEST.sources) load(f);
for (const f of TEST_MANIFEST.tests) load(f);

const results = TestRunner.run();
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  print(`${r.pass ? '  ok  ' : '  FAIL'}  ${r.suite} › ${r.name}${r.pass ? '' : '\n        ' + r.error}`);
}
print(`\n${results.length - failed}/${results.length} passed`);
if (failed) imports.system.exit(1);
