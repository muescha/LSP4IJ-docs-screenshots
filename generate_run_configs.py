#!/usr/bin/env python3
"""Writes one DAP run configuration per language from LSP4IJ's server templates.

Usage: generate_run_configs.py <LSP4IJ checkout>
"""
import json
import pathlib
import sys
from xml.sax.saxutils import quoteattr

CONFIGS = {
    "Debug Rust": "codelldb",
    "Debug Go": "go-delve",
    "Debug Julia": "julia",
    "Debug Python": "python-debugpy",
    "Debug Ruby": "ruby-rdbg",
    "Debug Swift": "swift-lldb",
    "Debug JS": "vscode-js-debug",
}


def mapping_xml(mapping):
    # Same split as DAPServerMappingsPanel#refreshMappings: patterns win, a mapping with only a name is a file type.
    file_type = mapping.get("fileType", {})
    attr = f" languageId={quoteattr(mapping['languageId'])}" if mapping.get("languageId") else ""
    patterns = file_type.get("patterns")
    if patterns:
        values = "".join(f"<option value={quoteattr(p)} />" for p in patterns)
        inner = f'<FileTypeSettings><option name="patterns">{values}</option></FileTypeSettings>'
    else:
        inner = f"<FileTypeSettings name={quoteattr(file_type['name'])} />"
    return f"<ServerMappingSettings{attr}><fileType>{inner}</fileType></ServerMappingSettings>"


def main():
    root = pathlib.Path(sys.argv[1]) / "src/main/resources/templates/dap"
    out = pathlib.Path(__file__).parent / ".run"
    out.mkdir(exist_ok=True)
    for name, template_dir in CONFIGS.items():
        template = json.loads((root / template_dir / "template.json").read_text(encoding="utf-8"))
        mappings = "".join(mapping_xml(m) for m in template["fileTypeMappings"])
        xml = (
            '<component name="ProjectRunConfigurationManager">\n'
            f'  <configuration default="false" name={quoteattr(name)} type="DAPConfiguration" factoryName="DAPConfiguration">\n'
            # checkConfiguration wants a command or a server id, else the configuration tree shows a red cross
            '    <option name="commandLine" value="screenshot-only" />\n'
            f'    <option name="serverMappings"><list>{mappings}</list></option>\n'
            '    <method v="2" />\n'
            '  </configuration>\n'
            '</component>\n'
        )
        (out / f"{name}.run.xml").write_text(xml, encoding="utf-8")


main()
