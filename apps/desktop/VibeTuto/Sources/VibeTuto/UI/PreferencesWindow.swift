import SwiftUI

struct PreferencesRootView: View {
    var body: some View {
        TabView {
            GeneralPreferencesView()
                .tabItem { Label("General", systemImage: "gearshape") }

            AudioPreferencesView()
                .tabItem { Label("Audio", systemImage: "mic") }

            ShortcutsPreferencesView()
                .tabItem { Label("Shortcuts", systemImage: "keyboard") }

            AdvancedPreferencesView()
                .tabItem { Label("Advanced", systemImage: "wrench.and.screwdriver") }
        }
        .frame(width: 460, height: 360)
        .padding(20)
    }
}

struct GeneralPreferencesView: View {
    @AppStorage("apiToken") private var apiToken = ""
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("showCountdown") private var showCountdown = true
    @AppStorage("countdownDuration") private var countdownDuration = 3
    @AppStorage("autoOpenEditor") private var autoOpenEditor = false
    @AppStorage("captureQuality") private var captureQuality = "standard"

    var body: some View {
        Form {
            Toggle("Launch at login", isOn: $launchAtLogin)
            Toggle("Show countdown", isOn: $showCountdown)

            if showCountdown {
                Picker("Countdown", selection: $countdownDuration) {
                    Text("3 seconds").tag(3)
                    Text("5 seconds").tag(5)
                }
            }

            Toggle("Open editor after upload", isOn: $autoOpenEditor)

            Picker("Capture quality", selection: $captureQuality) {
                Text("Standard").tag("standard")
                Text("High").tag("high")
            }

            Section("Workspace") {
                if apiToken.isEmpty {
                    DesktopConnectView()
                } else {
                    Label("Connected", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Button("Use another workspace") {
                        apiToken = ""
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}

struct AudioPreferencesView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("noiseReduction") private var noiseReduction = true

    var body: some View {
        Form {
            Toggle("Record microphone", isOn: $session.micEnabled)
            Toggle("Noise reduction", isOn: $noiseReduction)

            LabeledContent("Input") {
                Text("Default")
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}

struct ShortcutsPreferencesView: View {
    @AppStorage("shortcutRecord") private var shortcutRecord = "Cmd+Shift+R"
    @AppStorage("shortcutPause") private var shortcutPause = "Cmd+Shift+P"
    @AppStorage("shortcutMarker") private var shortcutMarker = "Cmd+Shift+M"

    var body: some View {
        Form {
            shortcutRow("Start/Stop Recording", shortcutRecord)
            shortcutRow("Pause/Resume", shortcutPause)
            shortcutRow("Add Marker", shortcutMarker)

            Text("Shortcut editing is not enabled yet.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .formStyle(.grouped)
    }

    private func shortcutRow(_ title: String, _ shortcut: String) -> some View {
        LabeledContent(title) {
            Text(shortcut)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.secondary)
        }
    }
}

struct AdvancedPreferencesView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("detectionSensitivity") private var sensitivity = 1
    @AppStorage("groupingDelay") private var groupingDelay = 500.0
    @AppStorage("apiBaseURL") private var apiBaseURL = "https://captuto.com"

    var body: some View {
        Form {
            Toggle("Detect actions", isOn: $session.actionDetectionEnabled)

            Picker("Sensitivity", selection: $sensitivity) {
                Text("Low").tag(0)
                Text("Medium").tag(1)
                Text("High").tag(2)
            }

            VStack(alignment: .leading) {
                LabeledContent("Grouping delay", value: "\(Int(groupingDelay))ms")
                Slider(value: $groupingDelay, in: 200...2000, step: 100)
            }

            TextField("API URL", text: $apiBaseURL)
                .textFieldStyle(.roundedBorder)

            Button("Clear local cache", action: clearCache)

            Button("Reset preferences", role: .destructive, action: resetPreferences)
        }
        .formStyle(.grouped)
    }

    private func clearCache() {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("VibeTuto", isDirectory: true)
        try? FileManager.default.removeItem(at: tempDir)
    }

    private func resetPreferences() {
        let domain = Bundle.main.bundleIdentifier ?? "com.vibetuto.recorder"
        UserDefaults.standard.removePersistentDomain(forName: domain)
    }
}
