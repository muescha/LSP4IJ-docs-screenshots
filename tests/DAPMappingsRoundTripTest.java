package com.redhat.devtools.lsp4ij.dap.configurations;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.intellij.execution.configurations.ConfigurationTypeUtil;
import com.intellij.openapi.util.JDOMUtil;
import com.intellij.testFramework.fixtures.BasePlatformTestCase;
import com.intellij.util.xmlb.XmlSerializer;
import com.redhat.devtools.lsp4ij.dap.settings.ui.DebugAdapterServerPanel;
import com.redhat.devtools.lsp4ij.templates.ServerMappingSettings;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Not a test of the project: it answers questions for the docs screenshots and writes to tests/results.txt, see
 * run_tests.sh.
 * - testSerializedFormat: how the mappings of a run configuration look in a .run.xml file.
 * - testRoundTrip: how many mappings each template has after the editor saved and reopened a run configuration.
 * - testGeneratedConfigurations: the .run.xml files pass checkConfiguration (no red cross) and show their mappings once.
 */
public class DAPMappingsRoundTripTest extends BasePlatformTestCase {

    private static final Path OUT = Path.of("/Users/muescha/Work/github.com/muescha/LSP4IJ-docs-screenshots/tests/results.txt");
    private static final String[] TEMPLATES = {"codelldb", "go-delve", "julia", "python-debugpy", "ruby-rdbg", "swift-lldb", "vscode-js-debug"};

    public void testSerializedFormat() throws Exception {
        var options = new DAPRunConfigurationOptions();
        options.setServerMappings(List.of(
                ServerMappingSettings.createFileNamePatternsMappingSettings(List.of("*.go"), "go"),
                ServerMappingSettings.createFileTypeMappingSettings("JavaScript", "javascript")));
        append("Serialized format:\n" + JDOMUtil.write(XmlSerializer.serialize(options)) + "\n");
    }

    public void testRoundTrip() throws Exception {
        for (String template : TEMPLATES) {
            List<ServerMappingSettings> mappings = templateMappings(template);
            var editor = new DAPSettingsEditor(getProject());
            editor.getComponent();
            panel(editor).getMappingsPanel().refreshMappings(List.of(), mappings);

            var line = new StringBuilder(template).append(": template=").append(mappings.size());
            DAPRunConfiguration configuration = newConfiguration();
            editor.applyEditorTo(configuration);
            line.append(" saved=").append(configuration.getServerMappings().size());
            for (int i = 1; i <= 3; i++) {
                // What a reopened run configuration goes through: read from its XML, shown in a new editor, saved again.
                var element = new org.jdom.Element("configuration");
                configuration.writeExternal(element);
                DAPRunConfiguration reloaded = newConfiguration();
                reloaded.readExternal(element);
                var nextEditor = new DAPSettingsEditor(getProject());
                nextEditor.getComponent();
                nextEditor.resetEditorFrom(reloaded);
                configuration = newConfiguration();
                nextEditor.applyEditorTo(configuration);
                line.append(" reopen").append(i).append('=').append(configuration.getServerMappings().size());
            }
            append(line + "\n");
        }
    }

    public void testGeneratedConfigurations() throws Exception {
        try (var files = Files.list(OUT.getParent().getParent().resolve(".run"))) {
            for (Path file : files.sorted().toList()) {
                DAPRunConfiguration configuration = newConfiguration();
                configuration.readExternal(JDOMUtil.load(file).getChild("configuration"));
                configuration.checkConfiguration();
                var editor = new DAPSettingsEditor(getProject());
                editor.getComponent();
                editor.resetEditorFrom(configuration);
                DAPRunConfiguration shown = newConfiguration();
                editor.applyEditorTo(shown);
                append(file.getFileName() + ": valid, mappings=" + configuration.getServerMappings().size()
                        + " shown=" + shown.getServerMappings().size() + "\n");
            }
        }
    }

    private DAPRunConfiguration newConfiguration() {
        var type = ConfigurationTypeUtil.findConfigurationType(DAPConfigurationType.class);
        return (DAPRunConfiguration) type.getConfigurationFactories()[0].createTemplateConfiguration(getProject());
    }

    private static DebugAdapterServerPanel panel(DAPSettingsEditor editor) throws Exception {
        var field = DAPSettingsEditor.class.getDeclaredField("dapPanel");
        field.setAccessible(true);
        return (DebugAdapterServerPanel) field.get(editor);
    }

    private static List<ServerMappingSettings> templateMappings(String template) throws Exception {
        try (var in = DAPMappingsRoundTripTest.class.getClassLoader().getResourceAsStream("templates/dap/" + template + "/template.json")) {
            var json = new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), JsonObject.class);
            return new ArrayList<>(new Gson().fromJson(json.get("fileTypeMappings"), new TypeToken<List<ServerMappingSettings>>() {}.getType()));
        }
    }

    private static void append(String text) throws Exception {
        Files.writeString(OUT, text, java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
    }
}
