#!/bin/sh
# Copies the test into an LSP4IJ checkout, runs it and removes it again. Usage: run_tests.sh <LSP4IJ checkout>
set -u
here=$(cd "$(dirname "$0")" && pwd)
target="$1/src/test/java/com/redhat/devtools/lsp4ij/dap/configurations"
dir_existed=1; [ -d "$target" ] || dir_existed=0
mkdir -p "$target"
cp "$here/DAPMappingsRoundTripTest.java" "$target/"
rm -f "$here/results.txt"
(cd "$1" && ./gradlew test --tests 'com.redhat.devtools.lsp4ij.dap.configurations.DAPMappingsRoundTripTest' --console=plain)
status=$?
rm -f "$target/DAPMappingsRoundTripTest.java"
[ "$dir_existed" = 1 ] || rmdir "$target"
cat "$here/results.txt"
exit $status
